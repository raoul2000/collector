<?php

declare(strict_types=1);

namespace App\Repository;

use PDO;

/**
 * @phpstan-type Magasin array{id: int, nom: string, ville: string, actif: bool}
 * @phpstan-type MagasinDetail array{id: int, nom: string, ville: string, actif: bool, nbSaisies: int}
 */
final readonly class MagasinRepository
{
    private const string SELECT_DETAIL =
        'SELECT m.id, m.nom, m.ville, m.actif,
                (SELECT COUNT(*) FROM saisie s WHERE s.magasin_id = m.id) AS nb_saisies
         FROM magasin m';

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
     * Tous les magasins, actifs ou non, triés par nom.
     *
     * @return list<MagasinDetail>
     */
    public function findAll(): array
    {
        $rows = $this->db->query(self::SELECT_DETAIL . ' ORDER BY m.nom, m.ville')->fetchAll();

        return array_map(self::mapDetail(...), $rows);
    }

    /**
     * @return MagasinDetail|null
     */
    public function find(int $id): ?array
    {
        $stmt = $this->db->prepare(self::SELECT_DETAIL . ' WHERE m.id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();

        return $row === false ? null : self::mapDetail($row);
    }

    /**
     * @param list<int> $ids
     * @return list<int> identifiants inexistants parmi $ids
     */
    public function missingIds(array $ids): array
    {
        if ($ids === []) {
            return [];
        }
        $stmt = $this->db->prepare(
            'SELECT id FROM magasin WHERE id IN (' . implode(',', array_fill(0, count($ids), '?')) . ')',
        );
        $stmt->execute($ids);
        $found = array_map(intval(...), $stmt->fetchAll(PDO::FETCH_COLUMN));

        return array_values(array_diff($ids, $found));
    }

    public function exists(string $nom, string $ville, ?int $exceptId = null): bool
    {
        $stmt = $this->db->prepare('SELECT 1 FROM magasin WHERE nom = ? AND ville = ? AND id <> ?');
        $stmt->execute([$nom, $ville, $exceptId ?? 0]);

        return $stmt->fetchColumn() !== false;
    }

    public function create(string $nom, string $ville, bool $actif): int
    {
        $this->db->prepare('INSERT INTO magasin (nom, ville, actif) VALUES (?, ?, ?)')
            ->execute([$nom, $ville, (int) $actif]);

        return (int) $this->db->lastInsertId();
    }

    public function update(int $id, string $nom, string $ville, bool $actif): void
    {
        $this->db->prepare('UPDATE magasin SET nom = ?, ville = ?, actif = ? WHERE id = ?')
            ->execute([$nom, $ville, (int) $actif, $id]);
    }

    /**
     * Supprime le magasin et ses rattachements aux campagnes (à n'appeler que s'il n'a aucune saisie).
     */
    public function delete(int $id): void
    {
        $this->db->prepare('DELETE FROM campagne_magasin WHERE magasin_id = ?')->execute([$id]);
        $this->db->prepare('DELETE FROM magasin WHERE id = ?')->execute([$id]);
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

    /**
     * @param array<string, mixed> $row
     * @return MagasinDetail
     */
    private static function mapDetail(array $row): array
    {
        return self::map($row) + ['nbSaisies' => (int) $row['nb_saisies']];
    }
}
