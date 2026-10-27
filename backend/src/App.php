<?php

declare(strict_types=1);

namespace App;

use App\Http\HttpException;
use App\Http\JsonResponse;
use App\Http\Request;
use App\Http\Router;
use ErrorException;
use PDO;
use Throwable;

final class App
{
    /**
     * @param array<string, mixed> $config configuration complète (cf. Config)
     * @param PDO|null             $pdo    connexion à utiliser (tests) ; sinon ouverte à la demande
     */
    public function __construct(
        private readonly array $config,
        public readonly Router $router = new Router(),
        private ?PDO $pdo = null,
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

        return new self($config)->withRoutes();
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
        try {
            // Protection CSRF : un en-tête personnalisé ne peut pas être envoyé par un autre site sans
            // autorisation CORS (que l'API n'accorde pas). Exigé sur toutes les requêtes qui modifient des données.
            if (!in_array($request->method, ['GET', 'HEAD'], true) && $request->header('X-Requested-With') === null) {
                throw new HttpException(403, 'csrf', 'En-tête X-Requested-With manquant.');
            }

            return $this->router->dispatch($request);
        } catch (HttpException $e) {
            return $e->toResponse();
        } catch (Throwable $e) {
            error_log((string) $e);

            return self::internalError($this->config['app']['debug'] ? $e : null);
        }
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

    private static function internalError(?Throwable $debug = null): JsonResponse
    {
        $error = ['code' => 'internal_error', 'message' => 'Erreur interne du serveur.'];
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
