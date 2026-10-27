<?php

declare(strict_types=1);

namespace App\Repository;

use PDO;

/**
 * Les formats d'une catégorie sont exposés sous forme de liste de contenances (g ou ml), dans l'ordre d'affichage.
 *
 * @phpstan-type Categorie array{
 *     id: int, nom: string, unite: 'kg'|'L'|'unite', ordre: int, active: bool,
 *     codeReference: string|null, formats: list<int>, nbSaisies: int
 * }
 */
final readonly class CategorieRepository
{
    private const string SELECT =
        'SELECT c.id, c.nom, c.unite, c.ordre, c.active, c.code_reference,
                (SELECT COUNT(*) FROM saisie s WHERE s.categorie_id = c.id) AS nb_saisies
         FROM categorie c';

    public function __construct(private PDO $db)
    {
    }

    /**
     * Catégories actives avec leurs formats, dans l'ordre d'affichage.
     *
     * @return list<Categorie>
     */
    public function findActiveWithFormats(): array
    {
        return $this->withFormats($this->db->query(self::SELECT . ' WHERE c.active = 1 ORDER BY c.ordre, c.nom')->fetchAll());
    }

    /**
     * Toutes les catégories, actives ou non, dans l'ordre d'affichage.
     *
     * @return list<Categorie>
     */
    public function findAll(): array
    {
        return $this->withFormats($this->db->query(self::SELECT . ' ORDER BY c.ordre, c.nom')->fetchAll());
    }

    /**
     * @return Categorie|null
     */
    public function find(int $id): ?array
    {
        $stmt = $this->db->prepare(self::SELECT . ' WHERE c.id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();

        return $row === false ? null : $this->withFormats([$row])[0];
    }

    /**
     * @return list<int>
     */
    public function allIds(): array
    {
        return array_map(intval(...), $this->db->query('SELECT id FROM categorie')->fetchAll(PDO::FETCH_COLUMN));
    }

    public function nomExists(string $nom, ?int $exceptId = null): bool
    {
        $stmt = $this->db->prepare('SELECT 1 FROM categorie WHERE nom = ? AND id <> ?');
        $stmt->execute([$nom, $exceptId ?? 0]);

        return $stmt->fetchColumn() !== false;
    }

    public function codeReferenceExists(string $code, ?int $exceptId = null): bool
    {
        $stmt = $this->db->prepare('SELECT 1 FROM categorie WHERE code_reference = ? AND id <> ?');
        $stmt->execute([$code, $exceptId ?? 0]);

        return $stmt->fetchColumn() !== false;
    }

    public function nextOrdre(): int
    {
        return (int) $this->db->query('SELECT COALESCE(MAX(ordre), 0) + 10 FROM categorie')->fetchColumn();
    }

    /**
     * @param list<int> $formats
     */
    public function create(string $nom, string $unite, int $ordre, bool $active, ?string $codeReference, array $formats): int
    {
        $this->db->prepare(
            'INSERT INTO categorie (nom, unite, ordre, active, code_reference) VALUES (?, ?, ?, ?, ?)',
        )->execute([$nom, $unite, $ordre, (int) $active, $codeReference]);
        $id = (int) $this->db->lastInsertId();
        $this->setFormats($id, $formats);

        return $id;
    }

    /**
     * @param list<int> $formats
     */
    public function update(int $id, string $nom, string $unite, int $ordre, bool $active, ?string $codeReference, array $formats): void
    {
        $this->db->prepare(
            'UPDATE categorie SET nom = ?, unite = ?, ordre = ?, active = ?, code_reference = ? WHERE id = ?',
        )->execute([$nom, $unite, $ordre, (int) $active, $codeReference, $id]);
        $this->setFormats($id, $formats);
    }

    /**
     * Réordonne les catégories selon la liste d'identifiants (ordre = 10, 20, 30…).
     *
     * @param list<int> $ids
     */
    public function reorder(array $ids): void
    {
        $stmt = $this->db->prepare('UPDATE categorie SET ordre = ? WHERE id = ?');
        foreach ($ids as $index => $id) {
            $stmt->execute([($index + 1) * 10, $id]);
        }
    }

    public function delete(int $id): void
    {
        $this->db->prepare('DELETE FROM categorie WHERE id = ?')->execute([$id]);
    }

    /**
     * @param list<int> $formats contenances, dans l'ordre d'affichage
     */
    private function setFormats(int $id, array $formats): void
    {
        $this->db->prepare('DELETE FROM format WHERE categorie_id = ?')->execute([$id]);
        $insert = $this->db->prepare('INSERT INTO format (categorie_id, contenance, ordre) VALUES (?, ?, ?)');
        foreach ($formats as $index => $contenance) {
            $insert->execute([$id, $contenance, $index + 1]);
        }
    }

    /**
     * @param list<array<string, mixed>> $rows
     * @return list<Categorie>
     */
    private function withFormats(array $rows): array
    {
        if ($rows === []) {
            return [];
        }

        $ids = array_column($rows, 'id');
        $stmt = $this->db->prepare(
            'SELECT categorie_id, contenance FROM format
             WHERE categorie_id IN (' . implode(',', array_fill(0, count($ids), '?')) . ')
             ORDER BY ordre, contenance',
        );
        $stmt->execute($ids);

        $formats = [];
        foreach ($stmt->fetchAll() as $format) {
            $formats[(int) $format['categorie_id']][] = (int) $format['contenance'];
        }

        return array_map(
            static fn (array $row): array => [
                'id' => (int) $row['id'],
                'nom' => (string) $row['nom'],
                'unite' => $row['unite'],
                'ordre' => (int) $row['ordre'],
                'active' => (bool) $row['active'],
                'codeReference' => $row['code_reference'],
                'formats' => $formats[(int) $row['id']] ?? [],
                'nbSaisies' => (int) $row['nb_saisies'],
            ],
            $rows,
        );
    }
}
