<?php

declare(strict_types=1);

namespace App\Repository;

use PDO;

/**
 * @phpstan-type Campagne array{id: int, nom: string, dateDebut: string, dateFin: string, active: bool}
 * @phpstan-type CampagneDetail array{
 *     id: int, nom: string, dateDebut: string, dateFin: string, active: bool,
 *     magasinIds: list<int>, nbSaisies: int
 * }
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
     * Toutes les campagnes, la plus récente en premier.
     *
     * @return list<CampagneDetail>
     */
    public function findAll(): array
    {
        $rows = $this->db->query('SELECT ' . self::COLUMNS . ' FROM campagne ORDER BY date_debut DESC, id DESC')->fetchAll();

        return array_map($this->detail(...), $rows);
    }

    /**
     * @return CampagneDetail|null
     */
    public function find(int $id): ?array
    {
        $stmt = $this->db->prepare('SELECT ' . self::COLUMNS . ' FROM campagne WHERE id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();

        return $row === false ? null : $this->detail($row);
    }

    public function nomExists(string $nom, ?int $exceptId = null): bool
    {
        $stmt = $this->db->prepare('SELECT 1 FROM campagne WHERE nom = ? AND id <> ?');
        $stmt->execute([$nom, $exceptId ?? 0]);

        return $stmt->fetchColumn() !== false;
    }

    public function create(string $nom, string $dateDebut, string $dateFin): int
    {
        $this->db->prepare('INSERT INTO campagne (nom, date_debut, date_fin) VALUES (?, ?, ?)')
            ->execute([$nom, $dateDebut, $dateFin]);

        return (int) $this->db->lastInsertId();
    }

    public function update(int $id, string $nom, string $dateDebut, string $dateFin): void
    {
        $this->db->prepare('UPDATE campagne SET nom = ?, date_debut = ?, date_fin = ? WHERE id = ?')
            ->execute([$nom, $dateDebut, $dateFin, $id]);
    }

    /**
     * Remplace la liste des magasins rattachés à la campagne.
     *
     * @param list<int> $magasinIds
     */
    public function setMagasins(int $id, array $magasinIds): void
    {
        $this->db->prepare('DELETE FROM campagne_magasin WHERE campagne_id = ?')->execute([$id]);
        $insert = $this->db->prepare('INSERT INTO campagne_magasin (campagne_id, magasin_id) VALUES (?, ?)');
        foreach ($magasinIds as $magasinId) {
            $insert->execute([$id, $magasinId]);
        }
    }

    /**
     * Magasins ayant des saisies dans la campagne (ils ne peuvent pas en être détachés).
     *
     * @return list<int>
     */
    public function magasinIdsAvecSaisies(int $id): array
    {
        $stmt = $this->db->prepare('SELECT DISTINCT magasin_id FROM saisie WHERE campagne_id = ? ORDER BY magasin_id');
        $stmt->execute([$id]);

        return array_map(intval(...), $stmt->fetchAll(PDO::FETCH_COLUMN));
    }

    /**
     * Rend la campagne active ; toute autre campagne active est désactivée.
     */
    public function activate(int $id): void
    {
        // Deux requêtes : l'index unique sur la campagne active est vérifié ligne par ligne
        $this->db->exec('UPDATE campagne SET active = 0 WHERE active = 1');
        $this->db->prepare('UPDATE campagne SET active = 1 WHERE id = ?')->execute([$id]);
    }

    public function deactivate(int $id): void
    {
        $this->db->prepare('UPDATE campagne SET active = 0 WHERE id = ?')->execute([$id]);
    }

    public function countSaisies(int $id): int
    {
        $stmt = $this->db->prepare('SELECT COUNT(*) FROM saisie WHERE campagne_id = ?');
        $stmt->execute([$id]);

        return (int) $stmt->fetchColumn();
    }

    public function delete(int $id): void
    {
        $this->db->prepare('DELETE FROM campagne WHERE id = ?')->execute([$id]);
    }

    /**
     * @param array<string, mixed> $row
     * @return CampagneDetail
     */
    private function detail(array $row): array
    {
        $campagne = self::map($row);

        $stmt = $this->db->prepare('SELECT magasin_id FROM campagne_magasin WHERE campagne_id = ? ORDER BY magasin_id');
        $stmt->execute([$campagne['id']]);
        $campagne['magasinIds'] = array_map(intval(...), $stmt->fetchAll(PDO::FETCH_COLUMN));
        $campagne['nbSaisies'] = $this->countSaisies($campagne['id']);

        return $campagne;
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
