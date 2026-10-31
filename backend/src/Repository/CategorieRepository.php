<?php

declare(strict_types=1);

namespace App\Repository;

use PDO;

/**
 * Les formats d'une catégorie sont les boutons proposés à la saisie, dans l'ordre d'affichage : une contenance (g ou ml)
 * et/ou un libellé de variante (« Olive / colza » 1 L, « T4 » pour une catégorie à l'unité).
 * Ordre d'affichage : celui des sections, puis celui des catégories ; les catégories sans section viennent à la fin.
 *
 * @phpstan-type Categorie array{
 *     id: int, nom: string, sectionId: int|null, unite: 'kg'|'L'|'unite', ordre: int, active: bool,
 *     codeReference: string|null, motsCles: list<string>, formats: list<Format>, nbSaisies: int
 * }
 * @phpstan-type Format array{id: int, contenance: int|null, libelle: string|null}
 * @phpstan-type FormatInput array{id: int|null, contenance: int|null, libelle: string|null}
 */
final readonly class CategorieRepository
{
    private const string SELECT =
        'SELECT c.id, c.nom, c.section_id, c.unite, c.ordre, c.active, c.code_reference, c.mots_cles,
                (SELECT COUNT(*) FROM saisie s WHERE s.categorie_id = c.id) AS nb_saisies
         FROM categorie c
         LEFT JOIN section sec ON sec.id = c.section_id';

    private const string ORDER = ' ORDER BY sec.id IS NULL, sec.ordre, sec.nom, c.ordre, c.nom';

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
        return $this->withFormats($this->db->query(self::SELECT . ' WHERE c.active = 1' . self::ORDER)->fetchAll());
    }

    /**
     * Toutes les catégories, actives ou non, dans l'ordre d'affichage.
     *
     * @return list<Categorie>
     */
    public function findAll(): array
    {
        return $this->withFormats($this->db->query(self::SELECT . self::ORDER)->fetchAll());
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
     * @param list<FormatInput> $formats
     */
    public function create(
        string $nom,
        ?int $sectionId,
        string $unite,
        int $ordre,
        bool $active,
        ?string $codeReference,
        array $motsCles,
        array $formats,
    ): int {
        $this->db->prepare(
            'INSERT INTO categorie (nom, section_id, unite, ordre, active, code_reference, mots_cles) VALUES (?, ?, ?, ?, ?, ?, ?)',
        )->execute([$nom, $sectionId, $unite, $ordre, (int) $active, $codeReference, self::motsClesSql($motsCles)]);
        $id = (int) $this->db->lastInsertId();
        $this->setFormats($id, $formats);

        return $id;
    }

    /**
     * @param list<FormatInput> $formats
     */
    public function update(
        int $id,
        string $nom,
        ?int $sectionId,
        string $unite,
        int $ordre,
        bool $active,
        ?string $codeReference,
        array $motsCles,
        array $formats,
    ): void {
        $this->db->prepare(
            'UPDATE categorie SET nom = ?, section_id = ?, unite = ?, ordre = ?, active = ?, code_reference = ?, mots_cles = ? WHERE id = ?',
        )->execute([$nom, $sectionId, $unite, $ordre, (int) $active, $codeReference, self::motsClesSql($motsCles), $id]);
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
     * Identifiants des formats d'une catégorie.
     *
     * @return list<int>
     */
    public function formatIds(int $categorieId): array
    {
        $stmt = $this->db->prepare('SELECT id FROM format WHERE categorie_id = ?');
        $stmt->execute([$categorieId]);

        return array_map(intval(...), $stmt->fetchAll(PDO::FETCH_COLUMN));
    }

    /**
     * Remplace les formats d'une catégorie. Un format existant (id) est modifié sur place : les saisies faites
     * avec ce bouton y restent rattachées. Les formats absents de la liste sont supprimés (leurs saisies gardent
     * leur contenance, sans variante).
     *
     * @param list<FormatInput> $formats dans l'ordre d'affichage
     */
    private function setFormats(int $id, array $formats): void
    {
        $gardes = array_values(array_filter(array_column($formats, 'id')));
        $this->db->prepare(
            'DELETE FROM format WHERE categorie_id = ?'
            . ($gardes === [] ? '' : ' AND id NOT IN (' . implode(',', array_fill(0, count($gardes), '?')) . ')'),
        )->execute([$id, ...$gardes]);

        $insert = $this->db->prepare('INSERT INTO format (categorie_id, contenance, libelle, ordre) VALUES (?, ?, ?, ?)');
        $update = $this->db->prepare('UPDATE format SET contenance = ?, libelle = ?, ordre = ? WHERE id = ? AND categorie_id = ?');
        foreach ($formats as $index => $format) {
            if ($format['id'] === null) {
                $insert->execute([$id, $format['contenance'], $format['libelle'], $index + 1]);
            } else {
                $update->execute([$format['contenance'], $format['libelle'], $index + 1, $format['id'], $id]);
            }
        }
    }

    /**
     * Liste de mots-clés : séparés par des virgules (ou des retours à la ligne), sans doublon ni vide.
     *
     * @return list<string>
     */
    public static function motsCles(?string $texte): array
    {
        $mots = [];
        foreach (preg_split('/[,\n]/', (string) $texte) ?: [] as $mot) {
            $mot = trim((string) preg_replace('/\s+/', ' ', $mot));
            if ($mot !== '' && !in_array(mb_strtolower($mot), array_map(mb_strtolower(...), $mots), true)) {
                $mots[] = $mot;
            }
        }

        return $mots;
    }

    /**
     * @param list<string> $motsCles
     */
    private static function motsClesSql(array $motsCles): ?string
    {
        return $motsCles === [] ? null : implode(', ', $motsCles);
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
            'SELECT id, categorie_id, contenance, libelle FROM format
             WHERE categorie_id IN (' . implode(',', array_fill(0, count($ids), '?')) . ')
             ORDER BY ordre, id',
        );
        $stmt->execute($ids);

        $formats = [];
        foreach ($stmt->fetchAll() as $format) {
            $formats[(int) $format['categorie_id']][] = [
                'id' => (int) $format['id'],
                'contenance' => $format['contenance'] === null ? null : (int) $format['contenance'],
                'libelle' => $format['libelle'],
            ];
        }

        return array_map(
            static fn (array $row): array => [
                'id' => (int) $row['id'],
                'nom' => (string) $row['nom'],
                'sectionId' => $row['section_id'] === null ? null : (int) $row['section_id'],
                'unite' => $row['unite'],
                'ordre' => (int) $row['ordre'],
                'active' => (bool) $row['active'],
                'codeReference' => $row['code_reference'],
                'motsCles' => self::motsCles($row['mots_cles']),
                'formats' => $formats[(int) $row['id']] ?? [],
                'nbSaisies' => (int) $row['nb_saisies'],
            ],
            $rows,
        );
    }
}
