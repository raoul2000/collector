<?php

declare(strict_types=1);

namespace App\Repository;

use PDO;

/**
 * @phpstan-type Magasin array{id: int, nom: string, ville: string, actif: bool}
 */
final readonly class MagasinRepository
{
    public function __construct(private PDO $db)
    {
    }

    /**
     * Magasins actifs rattachés à une campagne, triés par nom.
     *
     * @return list<Magasin>
     */
    public function findActiveByCampagne(int $campagneId): array
    {
        $stmt = $this->db->prepare(
            'SELECT m.id, m.nom, m.ville, m.actif
             FROM magasin m
             JOIN campagne_magasin cm ON cm.magasin_id = m.id
             WHERE cm.campagne_id = ? AND m.actif = 1
             ORDER BY m.nom, m.ville',
        );
        $stmt->execute([$campagneId]);

        return array_map(self::map(...), $stmt->fetchAll());
    }

    /**
     * @param array<string, mixed> $row
     * @return Magasin
     */
    private static function map(array $row): array
    {
        return [
            'id' => (int) $row['id'],
            'nom' => (string) $row['nom'],
            'ville' => (string) $row['ville'],
            'actif' => (bool) $row['actif'],
        ];
    }
}
