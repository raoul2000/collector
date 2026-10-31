<?php

declare(strict_types=1);

namespace App\Repository;

use PDO;

/**
 * @phpstan-type Section array{id: int, nom: string, ordre: int, nbCategories: int}
 */
final readonly class SectionRepository
{
    private const string SELECT =
        'SELECT s.id, s.nom, s.ordre,
                (SELECT COUNT(*) FROM categorie c WHERE c.section_id = s.id) AS nb_categories
         FROM section s';

    public function __construct(private PDO $db)
    {
    }

    /**
     * @return list<Section>
     */
    public function findAll(): array
    {
        return array_map(self::map(...), $this->db->query(self::SELECT . ' ORDER BY s.ordre, s.nom')->fetchAll());
    }

    /**
     * @return Section|null
     */
    public function find(int $id): ?array
    {
        $stmt = $this->db->prepare(self::SELECT . ' WHERE s.id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();

        return $row === false ? null : self::map($row);
    }

    /**
     * @return list<int>
     */
    public function allIds(): array
    {
        return array_map(intval(...), $this->db->query('SELECT id FROM section')->fetchAll(PDO::FETCH_COLUMN));
    }

    public function exists(int $id): bool
    {
        $stmt = $this->db->prepare('SELECT 1 FROM section WHERE id = ?');
        $stmt->execute([$id]);

        return $stmt->fetchColumn() !== false;
    }

    public function nomExists(string $nom, ?int $exceptId = null): bool
    {
        $stmt = $this->db->prepare('SELECT 1 FROM section WHERE nom = ? AND id <> ?');
        $stmt->execute([$nom, $exceptId ?? 0]);

        return $stmt->fetchColumn() !== false;
    }

    public function create(string $nom): int
    {
        $ordre = (int) $this->db->query('SELECT COALESCE(MAX(ordre), 0) + 10 FROM section')->fetchColumn();
        $this->db->prepare('INSERT INTO section (nom, ordre) VALUES (?, ?)')->execute([$nom, $ordre]);

        return (int) $this->db->lastInsertId();
    }

    public function update(int $id, string $nom): void
    {
        $this->db->prepare('UPDATE section SET nom = ? WHERE id = ?')->execute([$nom, $id]);
    }

    /**
     * Réordonne les sections selon la liste d'identifiants (ordre = 10, 20, 30…).
     *
     * @param list<int> $ids
     */
    public function reorder(array $ids): void
    {
        $stmt = $this->db->prepare('UPDATE section SET ordre = ? WHERE id = ?');
        foreach ($ids as $index => $id) {
            $stmt->execute([($index + 1) * 10, $id]);
        }
    }

    /**
     * Supprime la section ; ses catégories restent, sans section.
     */
    public function delete(int $id): void
    {
        $this->db->prepare('DELETE FROM section WHERE id = ?')->execute([$id]);
    }

    /**
     * @param array<string, mixed> $row
     * @return Section
     */
    private static function map(array $row): array
    {
        return [
            'id' => (int) $row['id'],
            'nom' => (string) $row['nom'],
            'ordre' => (int) $row['ordre'],
            'nbCategories' => (int) $row['nb_categories'],
        ];
    }
}
