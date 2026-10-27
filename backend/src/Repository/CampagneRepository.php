<?php

declare(strict_types=1);

namespace App\Repository;

use PDO;

/**
 * @phpstan-type Campagne array{id: int, nom: string, dateDebut: string, dateFin: string, active: bool}
 */
final readonly class CampagneRepository
{
    private const string COLUMNS = 'id, nom, date_debut, date_fin, active';

    public function __construct(private PDO $db)
    {
    }

    /**
     * @return Campagne|null
     */
    public function findActive(): ?array
    {
        $row = $this->db->query('SELECT ' . self::COLUMNS . ' FROM campagne WHERE active = 1')->fetch();

        return $row === false ? null : self::map($row);
    }

    /**
     * @param array<string, mixed> $row
     * @return Campagne
     */
    private static function map(array $row): array
    {
        return [
            'id' => (int) $row['id'],
            'nom' => (string) $row['nom'],
            'dateDebut' => (string) $row['date_debut'],
            'dateFin' => (string) $row['date_fin'],
            'active' => (bool) $row['active'],
        ];
    }
}
