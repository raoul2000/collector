<?php

declare(strict_types=1);

namespace App\Repository;

use PDO;

/**
 * Les formats d'une catégorie sont exposés sous forme de liste de contenances (g ou ml), dans l'ordre d'affichage.
 *
 * @phpstan-type Categorie array{
 *     id: int, nom: string, unite: 'kg'|'L'|'unite', ordre: int, active: bool,
 *     codeReference: string|null, formats: list<int>
 * }
 */
final readonly class CategorieRepository
{
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
        $rows = $this->db->query(
            'SELECT id, nom, unite, ordre, active, code_reference
             FROM categorie
             WHERE active = 1
             ORDER BY ordre, nom',
        )->fetchAll();

        return $this->withFormats($rows);
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
            ],
            $rows,
        );
    }
}
