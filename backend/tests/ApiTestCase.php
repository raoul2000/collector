<?php

declare(strict_types=1);

namespace App\Tests;

use App\App;
use App\Config;
use App\Http\JsonResponse;
use App\Http\Request;

/**
 * Base des tests d'API : l'application complète (routes réelles) branchée sur la base de test transactionnelle.
 */
abstract class ApiTestCase extends DatabaseTestCase
{
    /** Mot de passe responsable utilisé par les tests */
    protected const string ADMIN_PASSWORD = 'mot-de-passe-test';

    private static ?string $adminPasswordHash = null;

    /** @var array<string, string> cookies conservés entre les requêtes, comme le ferait un navigateur */
    protected array $cookies = [];

    /**
     * @param array<string, mixed> $config surcharges de configuration
     */
    protected function app(array $config = []): App
    {
        // Hash calculé une seule fois (password_hash est volontairement lent)
        self::$adminPasswordHash ??= password_hash(self::ADMIN_PASSWORD, PASSWORD_DEFAULT);

        return new App(
            Config::withDefaults(array_replace_recursive(
                ['admin' => ['password_hash' => self::$adminPasswordHash]],
                $config,
            )),
            pdo: $this->db,
        )->withRoutes();
    }

    /**
     * Envoie une requête à l'API. L'en-tête X-Requested-With est ajouté comme le fait le client ;
     * les cookies reçus (Set-Cookie) sont mémorisés pour les requêtes suivantes.
     *
     * @param array<string, mixed>|null $body
     * @param array<string, string>     $headers
     * @param array<string, string>     $query
     */
    protected function request(
        string $method,
        string $path,
        ?array $body = null,
        array $headers = [],
        array $query = [],
        string $ip = '127.0.0.1',
    ): JsonResponse {
        $raw = $body === null ? '' : json_encode($body, JSON_THROW_ON_ERROR);
        $headers += ['X-Requested-With' => 'Collector'];

        $response = $this->app()->handle(new Request($method, $path, $query, $headers, $raw, $this->cookies, $ip));

        $setCookie = $response->headers['Set-Cookie'] ?? null;
        if ($setCookie !== null && preg_match('/^([^=]+)=([^;]*);.*Max-Age=(\d+)/', $setCookie, $m) === 1) {
            if ($m[3] === '0') {
                unset($this->cookies[$m[1]]);
            } else {
                $this->cookies[$m[1]] = $m[2];
            }
        }

        return $response;
    }

    /**
     * Ouvre une session responsable pour les requêtes suivantes.
     */
    protected function loginAsAdmin(string $prenom = 'Sophie'): void
    {
        $response = $this->request('POST', '/api/admin/login', ['prenom' => $prenom, 'motDePasse' => self::ADMIN_PASSWORD]);
        self::assertSame(200, $response->status, 'Connexion responsable impossible');
    }

    /**
     * Données décodées comme les recevrait le client (vérifie au passage la sérialisation JSON).
     */
    protected static function json(JsonResponse $response): mixed
    {
        return json_decode($response->body(), true, 512, JSON_THROW_ON_ERROR);
    }
}
