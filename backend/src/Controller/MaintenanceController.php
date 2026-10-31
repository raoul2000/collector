<?php

declare(strict_types=1);

namespace App\Controller;

use App\Http\HttpException;
use App\Http\JsonResponse;
use App\Http\Request;
use App\Migration\Migrator;
use RuntimeException;

/**
 * Mise à jour du schéma de la base à distance, pour l'outil de déploiement (l'hébergement n'offre pas d'accès SSH).
 * Réservé au porteur du jeton défini dans config.php (deploiement.jeton) ; désactivé tant qu'il est vide.
 */
final readonly class MaintenanceController
{
    /** Longueur minimale du jeton : en dessous, les routes restent désactivées */
    public const int JETON_MIN = 32;

    /**
     * @param \Closure(): Migrator $migrator
     */
    public function __construct(
        private \Closure $migrator,
        private string $jeton,
    ) {
    }

    /**
     * Migrations appliquées et en attente.
     */
    public function schema(Request $request): JsonResponse
    {
        $this->authorize($request);
        $migrator = ($this->migrator)();
        $enAttente = $migrator->pending();

        return new JsonResponse([
            'appliquees' => array_values(array_diff($migrator->available(), $enAttente)),
            'enAttente' => $enAttente,
        ]);
    }

    /**
     * Applique les migrations en attente (comme bin/migrate.php).
     */
    public function migrate(Request $request): JsonResponse
    {
        $this->authorize($request);
        $migrator = ($this->migrator)();
        try {
            $appliquees = $migrator->migrate();
        } catch (RuntimeException $e) {
            throw new HttpException(500, 'migration_failed', $e->getMessage());
        }

        return new JsonResponse(['appliquees' => $appliquees, 'enAttente' => $migrator->pending()]);
    }

    private function authorize(Request $request): void
    {
        if (strlen($this->jeton) < self::JETON_MIN) {
            throw new HttpException(
                404,
                'maintenance_disabled',
                'Mise à jour à distance désactivée : renseigner deploiement.jeton (' . self::JETON_MIN
                . ' caractères au moins) dans config.php.',
            );
        }
        if (!hash_equals($this->jeton, (string) $request->header('X-Deploy-Token'))) {
            throw HttpException::unauthorized('Jeton de déploiement invalide.');
        }
    }
}
