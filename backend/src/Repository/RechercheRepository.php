<?php

declare(strict_types=1);

namespace App\Repository;

use DateTimeImmutable;
use PDO;

/**
 * Recherches sans résultat des bénévoles, regroupées par mot (sans tenir compte des accents ni des majuscules)
 * pour que les responsables complètent les mots-clés des catégories.
 *
 * @phpstan-type RechercheGroupee array{
 *     terme: string, nombre: int, derniere: string, categorie: array{id: int, nom: string}|null
 * }
 */
final readonly class RechercheRepository
{
    public function __construct(private PDO $db)
    {
    }

    /**
     * Enregistre une recherche envoyée par un téléphone ; un renvoi (même identifiant) est sans effet.
     */
    public function insert(
        string $id,
        int $campagneId,
        string $appareilId,
        string $terme,
        ?int $categorieId,
        DateTimeImmutable $chercheLe,
    ): void {
        $this->db->prepare(
            'INSERT IGNORE INTO recherche (id, campagne_id, appareil_id, terme, categorie_id, cherche_le) VALUES (?, ?, ?, ?, ?, ?)',
        )->execute([$id, $campagneId, $appareilId, $terme, $categorieId, $chercheLe->format('Y-m-d H:i:s')]);
    }

    /**
     * Mots cherchés sans résultat pendant une campagne, du plus fréquent au moins fréquent, avec la catégorie
     * le plus souvent choisie ensuite. Les mots ignorés et ceux devenus des mots-clés (ou noms) de catégorie
     * sont écartés.
     *
     * @return list<RechercheGroupee>
     */
    public function groupees(int $campagneId): array
    {
        $stmt = $this->db->prepare(
            // Forme exacte (utf8mb4_bin) : le regroupement sans accents ni majuscules est fait ci-dessous
            'SELECT r.terme COLLATE utf8mb4_bin AS terme, r.categorie_id, c.nom AS categorie_nom, COUNT(*) AS nombre,
                    MAX(r.cherche_le) AS derniere
             FROM recherche r
             LEFT JOIN categorie c ON c.id = r.categorie_id
             WHERE r.campagne_id = ?
             GROUP BY r.terme COLLATE utf8mb4_bin, r.categorie_id, c.nom',
        );
        $stmt->execute([$campagneId]);

        $connus = $this->motsConnus();
        $groupes = [];
        foreach ($stmt->fetchAll() as $row) {
            $cle = self::normaliser((string) $row['terme']);
            if ($cle === '' || isset($connus[$cle])) {
                continue;
            }
            $groupe = $groupes[$cle] ?? ['termes' => [], 'categories' => [], 'nombre' => 0, 'derniere' => ''];
            $nombre = (int) $row['nombre'];
            $groupe['nombre'] += $nombre;
            $groupe['termes'][(string) $row['terme']] = ($groupe['termes'][(string) $row['terme']] ?? 0) + $nombre;
            $groupe['derniere'] = max($groupe['derniere'], (string) $row['derniere']);
            if ($row['categorie_id'] !== null) {
                $id = (int) $row['categorie_id'];
                $groupe['categories'][$id] = [
                    'nombre' => ($groupe['categories'][$id]['nombre'] ?? 0) + $nombre,
                    'nom' => (string) $row['categorie_nom'],
                ];
            }
            $groupes[$cle] = $groupe;
        }

        $tz = new \DateTimeZone(date_default_timezone_get());
        $resultat = array_map(static function (array $g) use ($tz): array {
            arsort($g['termes']);
            uasort($g['categories'], static fn (array $a, array $b): int => $b['nombre'] <=> $a['nombre']);
            $categorieId = array_key_first($g['categories']);

            return [
                // Forme la plus tapée
                'terme' => (string) array_key_first($g['termes']),
                'nombre' => $g['nombre'],
                'derniere' => new DateTimeImmutable($g['derniere'], $tz)->format(DATE_ATOM),
                'categorie' => $categorieId === null ? null : ['id' => $categorieId, 'nom' => $g['categories'][$categorieId]['nom']],
            ];
        }, array_values($groupes));
        usort($resultat, static fn (array $a, array $b): int => [$b['nombre'], $b['derniere']] <=> [$a['nombre'], $a['derniere']]);

        return $resultat;
    }

    public function ignorer(string $terme, string $prenom): void
    {
        $this->db->prepare('INSERT IGNORE INTO recherche_ignoree (terme, ignore_par) VALUES (?, ?)')
            ->execute([self::normaliser($terme), $prenom]);
    }

    /**
     * « Pâtes, Semoule » → « pates semoule » (comme la recherche sur le téléphone).
     */
    public static function normaliser(string $texte): string
    {
        $texte = strtr(mb_strtolower($texte), [
            'à' => 'a', 'â' => 'a', 'ä' => 'a', 'á' => 'a', 'ç' => 'c', 'é' => 'e', 'è' => 'e', 'ê' => 'e', 'ë' => 'e',
            'î' => 'i', 'ï' => 'i', 'í' => 'i', 'ô' => 'o', 'ö' => 'o', 'ó' => 'o', 'ù' => 'u', 'û' => 'u', 'ü' => 'u',
            'ú' => 'u', 'ÿ' => 'y', 'ñ' => 'n', 'œ' => 'oe', 'æ' => 'ae',
        ]);

        return trim((string) preg_replace('/[^a-z0-9]+/', ' ', $texte));
    }

    /**
     * Formes normalisées des mots ignorés, des mots-clés et des noms de catégorie.
     *
     * @return array<string, true>
     */
    private function motsConnus(): array
    {
        $connus = [];
        foreach ($this->db->query('SELECT terme FROM recherche_ignoree')->fetchAll(PDO::FETCH_COLUMN) as $terme) {
            $connus[(string) $terme] = true;
        }
        foreach ($this->db->query('SELECT nom, mots_cles FROM categorie')->fetchAll() as $row) {
            foreach ([(string) $row['nom'], ...CategorieRepository::motsCles($row['mots_cles'])] as $mot) {
                $connus[self::normaliser($mot)] = true;
            }
        }

        return $connus;
    }
}
