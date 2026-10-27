<?php

declare(strict_types=1);

namespace App\Controller;

use App\Http\JsonResponse;
use App\Http\Request;
use PDO;
use PDOException;

/**
 * Vérification de l'état du service (API et base de données).
 */
final readonly class HealthController
{
    /**
     * @param \Closure(): PDO $db
     */
    public function __construct(private \Closure $db)
    {
    }

    public function show(Request $request): JsonResponse
    {
        try {
            ($this->db)()->query('SELECT 1');
            $database = 'ok';
        } catch (PDOException) {
            $database = 'unavailable';
        }

        return new JsonResponse(
            [
                'status' => $database === 'ok' ? 'ok' : 'degraded',
                'database' => $database,
                'time' => date(DATE_ATOM),
            ],
            $database === 'ok' ? 200 : 503,
        );
    }
}
