<?php

declare(strict_types=1);

namespace App;

use App\Http\HttpException;
use App\Http\JsonResponse;
use App\Http\Request;
use App\Http\Router;
use App\Log\Logger;
use ErrorException;
use PDO;
use Throwable;

final class App
{
    /** Au-delà, une requête est signalée comme lente dans le journal */
    public const int SLOW_MS = 1000;

    /** Identifiant de la requête en cours : renvoyé dans l'en-tête X-Request-Id et cité dans le journal */
    private string $requestId = '';

    /** @var array<string, string|int> informations ajoutées à la ligne de journal de la requête en cours */
    private array $logContext = [];

    /**
     * @param array<string, mixed> $config configuration complète (cf. Config)
     * @param PDO|null             $pdo    connexion à utiliser (tests) ; sinon ouverte à la demande
     */
    public function __construct(
        private readonly array $config,
        public readonly Router $router = new Router(),
        private ?PDO $pdo = null,
        private readonly Logger $logger = new Logger(null),
    ) {
    }

    /**
     * Point d'entrée HTTP : traite la requête courante et envoie la réponse.
     */
    public static function run(string $appDir): void
    {
        ini_set('display_errors', '0');
        set_error_handler(static function (int $severity, string $message, string $file, int $line): bool {
            if ((error_reporting() & $severity) === 0) {
                return false;
            }
            throw new ErrorException($message, 0, $severity, $file, $line);
        });

        try {
            $app = self::fromAppDir($appDir);
            $response = $app->handle(Request::fromGlobals());
        } catch (Throwable $e) {
            // Erreur pendant l'initialisation (configuration absente…)
            error_log((string) $e);
            $response = self::internalError();
        }

        $response->send();
    }

    public static function fromAppDir(string $appDir): self
    {
        $config = Config::load($appDir);
        date_default_timezone_set($config['app']['timezone']);

        return new self($config, logger: self::logger($config['log'], $appDir))->withRoutes();
    }

    /**
     * @param array<string, mixed> $log section « log » de la configuration
     */
    public static function logger(array $log, string $appDir): Logger
    {
        if (!$log['enabled']) {
            return Logger::disabled();
        }
        $level = array_key_exists($log['level'], Logger::LEVELS) ? $log['level'] : 'info';

        return new Logger((string) ($log['dir'] ?? $appDir . '/var/log'), $level, max(1, (int) $log['retention_days']));
    }

    /**
     * Enregistre les routes de l'API (src/routes.php).
     */
    public function withRoutes(): self
    {
        (require __DIR__ . '/routes.php')($this);

        return $this;
    }

    public function handle(Request $request): JsonResponse
    {
        $debut = hrtime(true);
        $this->requestId = bin2hex(random_bytes(4));
        $this->logContext = [];
        $exception = null;

        try {
            // Protection CSRF : un en-tête personnalisé ne peut pas être envoyé par un autre site sans
            // autorisation CORS (que l'API n'accorde pas). Exigé sur toutes les requêtes qui modifient des données.
            if (!in_array($request->method, ['GET', 'HEAD'], true) && $request->header('X-Requested-With') === null) {
                throw new HttpException(403, 'csrf', 'En-tête X-Requested-With manquant.');
            }

            $response = $this->router->dispatch($request);
        } catch (HttpException $e) {
            $response = $e->toResponse();
        } catch (Throwable $e) {
            $exception = $e;
            $response = self::internalError($this->requestId, $this->config['app']['debug'] ? $e : null);
        }

        $this->logRequest($request, $response, $exception, intdiv(hrtime(true) - $debut, 1_000_000));

        return $response->withHeader('X-Request-Id', $this->requestId);
    }

    /**
     * Ajoute une information à la ligne de journal de la requête en cours (ex. prénom du responsable).
     */
    public function logContext(string $key, string|int $value): void
    {
        $this->logContext[$key] = $value;
    }

    /**
     * Connexion à la base, ouverte à la première utilisation.
     */
    public function db(): PDO
    {
        return $this->pdo ??= Database::connect($this->config['db'], $this->config['app']['timezone']);
    }

    /**
     * @return array<string, mixed>
     */
    public function config(): array
    {
        return $this->config;
    }

    /**
     * Une ligne par requête : INFO, WARN pour un refus (4xx) ou une requête lente, ERROR (avec la trace) pour
     * une erreur interne. Si le journal est inutilisable, l'erreur interne part au moins dans le journal de PHP.
     */
    private function logRequest(Request $request, JsonResponse $response, ?Throwable $exception, int $ms): void
    {
        $query = $request->queryString();
        $champs = [
            $this->requestId,
            $request->method,
            $request->path . ($query === '' ? '' : '?' . $query),
            (string) $response->status,
            $ms . 'ms',
        ];
        $contexte = $this->logContext;
        if ($response->status >= 400 && is_array($response->data) && isset($response->data['error']['code'])) {
            $contexte['erreur'] = (string) $response->data['error']['code'];
        }
        if ($request->path === '/api/admin/login') {
            $contexte['ip'] = self::anonymizeIp($request->ip);
        }
        if ($ms >= self::SLOW_MS) {
            $contexte['lent'] = 'oui';
        }
        foreach ($contexte as $cle => $valeur) {
            $valeur = (string) $valeur;
            $champs[] = $cle . '=' . (preg_match('/[\s"]/', $valeur) === 1 ? json_encode($valeur, JSON_UNESCAPED_UNICODE) : $valeur);
        }

        // Session absente : réponse normale (l'espace responsable vérifie la session à l'ouverture)
        $refus = $response->status >= 400 && !($request->path === '/api/admin/session' && $response->status === 401);
        $niveau = match (true) {
            $response->status >= 500 => 'error',
            $refus || $ms >= self::SLOW_MS => 'warning',
            default => 'info',
        };

        $ecrit = $this->logger->write($niveau, implode(' ', $champs), $exception);
        if (!$ecrit && $exception !== null) {
            error_log("[{$this->requestId}] " . $exception);
        }
    }

    /**
     * Adresse IP tronquée (donnée personnelle) : dernier octet IPv4 masqué, IPv6 réduite à son préfixe /48.
     */
    public static function anonymizeIp(string $ip): string
    {
        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4) !== false) {
            return (string) preg_replace('/\.\d+$/', '.x', $ip);
        }
        if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6) !== false) {
            $groupes = str_split(bin2hex(substr((string) inet_pton($ip), 0, 6)), 4);

            return implode(':', array_map(static fn (string $g): string => ltrim($g, '0') ?: '0', $groupes)) . '::/48';
        }

        return '?';
    }

    private static function internalError(?string $requestId = null, ?Throwable $debug = null): JsonResponse
    {
        $error = [
            'code' => 'internal_error',
            'message' => 'Erreur interne du serveur' . ($requestId === null ? '.' : " (réf. {$requestId})."),
        ];
        if ($requestId !== null) {
            $error['ref'] = $requestId;
        }
        if ($debug !== null) {
            $error['debug'] = [
                'exception' => $debug::class,
                'message' => $debug->getMessage(),
                'location' => $debug->getFile() . ':' . $debug->getLine(),
            ];
        }

        return new JsonResponse(['error' => $error], 500);
    }
}
