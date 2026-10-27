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
    /**
     * @param array<string, mixed> $config surcharges de configuration
     */
    protected function app(array $config = []): App
    {
        return new App(Config::withDefaults($config), pdo: $this->db)->withRoutes();
    }

    /**
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
    ): JsonResponse {
        $raw = $body === null ? '' : json_encode($body, JSON_THROW_ON_ERROR);

        return $this->app()->handle(new Request($method, $path, $query, $headers, $raw));
    }

    /**
     * Données décodées comme les recevrait le client (vérifie au passage la sérialisation JSON).
     */
    protected static function json(JsonResponse $response): mixed
    {
        return json_decode($response->body(), true, 512, JSON_THROW_ON_ERROR);
    }
}
