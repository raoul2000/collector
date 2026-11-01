<?php

declare(strict_types=1);

namespace App\Repository;

use PDO;

/**
 * Agrégats des saisies d'une campagne (saisies supprimées exclues).
 *
 * Les poids et volumes sont des totaux en grammes (catégories en kg) et en millilitres (catégories en L) ;
 * les articles saisis sans contenance sont comptés dans le nombre d'articles mais pas dans ces totaux
 * (cf. spécifications 4.5).
 *
 * @phpstan-type Totaux array{nbSaisies: int, nbArticles: int, grammes: int, millilitres: int, sansContenance: int}
 */
final readonly class BilanRepository
{
    public function __construct(private PDO $db)
    {
    }

    /**
     * Totaux par catégorie, dans l'ordre d'affichage des catégories.
     *
     * @return list<array{
     *     categorieId: int, nom: string, unite: string, nbSaisies: int, nbArticles: int,
     *     contenance: int|null, sansContenance: int
     * }>
     */
    public function parCategorie(int $campagneId, ?int $magasinId): array
    {
        [$where, $params] = self::filtre($campagneId, $magasinId);
        $stmt = $this->db->prepare(
            "SELECT c.id, c.nom, c.unite,
                    COUNT(*) AS nb_saisies,
                    SUM(s.quantite) AS nb_articles,
                    SUM(s.quantite * s.contenance_unitaire) AS contenance,
                    SUM(CASE WHEN s.contenance_unitaire IS NULL AND c.unite <> 'unite' THEN s.quantite ELSE 0 END) AS sans_contenance
             FROM saisie s
             JOIN categorie c ON c.id = s.categorie_id
             WHERE {$where}
             GROUP BY c.id, c.nom, c.unite, c.ordre
             ORDER BY c.ordre, c.nom",
        );
        $stmt->execute($params);

        return array_map(
            static fn (array $row): array => [
                'categorieId' => (int) $row['id'],
                'nom' => (string) $row['nom'],
                'unite' => (string) $row['unite'],
                'nbSaisies' => (int) $row['nb_saisies'],
                'nbArticles' => (int) $row['nb_articles'],
                'contenance' => $row['unite'] === 'unite' ? null : (int) $row['contenance'],
                'sansContenance' => (int) $row['sans_contenance'],
            ],
            $stmt->fetchAll(),
        );
    }

    /**
     * Totaux par jour et par heure (heure du don).
     *
     * @return list<array{jour: string, heure: int, nbSaisies: int, nbArticles: int, grammes: int, millilitres: int}>
     */
    public function parHeure(int $campagneId, ?int $magasinId): array
    {
        [$where, $params] = self::filtre($campagneId, $magasinId);
        $stmt = $this->db->prepare(
            "SELECT DATE(s.saisie_le) AS jour, HOUR(s.saisie_le) AS heure,
                    COUNT(*) AS nb_saisies,
                    SUM(s.quantite) AS nb_articles,
                    SUM(CASE WHEN c.unite = 'kg' THEN s.quantite * s.contenance_unitaire ELSE 0 END) AS grammes,
                    SUM(CASE WHEN c.unite = 'L' THEN s.quantite * s.contenance_unitaire ELSE 0 END) AS millilitres
             FROM saisie s
             JOIN categorie c ON c.id = s.categorie_id
             WHERE {$where}
             GROUP BY jour, heure
             ORDER BY jour, heure",
        );
        $stmt->execute($params);

        return array_map(
            static fn (array $row): array => [
                'jour' => (string) $row['jour'],
                'heure' => (int) $row['heure'],
                'nbSaisies' => (int) $row['nb_saisies'],
                'nbArticles' => (int) $row['nb_articles'],
                'grammes' => (int) $row['grammes'],
                'millilitres' => (int) $row['millilitres'],
            ],
            $stmt->fetchAll(),
        );
    }

    /**
     * Totaux de chaque magasin rattaché à la campagne (y compris sans saisie), du plus grand nombre d'articles
     * au plus petit.
     *
     * @return list<array{magasinId: int, nom: string, ville: string, nbSaisies: int, nbArticles: int, grammes: int, millilitres: int, sansContenance: int}>
     */
    public function parMagasin(int $campagneId): array
    {
        $stmt = $this->db->prepare(
            "SELECT m.id, m.nom, m.ville,
                    COUNT(s.id) AS nb_saisies,
                    COALESCE(SUM(s.quantite), 0) AS nb_articles,
                    COALESCE(SUM(CASE WHEN c.unite = 'kg' THEN s.quantite * s.contenance_unitaire END), 0) AS grammes,
                    COALESCE(SUM(CASE WHEN c.unite = 'L' THEN s.quantite * s.contenance_unitaire END), 0) AS millilitres,
                    COALESCE(SUM(CASE WHEN s.contenance_unitaire IS NULL AND c.unite <> 'unite' THEN s.quantite END), 0) AS sans_contenance
             FROM campagne_magasin cm
             JOIN magasin m ON m.id = cm.magasin_id
             LEFT JOIN saisie s ON s.magasin_id = m.id AND s.campagne_id = cm.campagne_id AND s.supprime_le IS NULL
             LEFT JOIN categorie c ON c.id = s.categorie_id
             WHERE cm.campagne_id = ?
             GROUP BY m.id, m.nom, m.ville
             ORDER BY nb_articles DESC, m.nom, m.ville",
        );
        $stmt->execute([$campagneId]);

        return array_map(
            static fn (array $row): array => [
                'magasinId' => (int) $row['id'],
                'nom' => (string) $row['nom'],
                'ville' => (string) $row['ville'],
                'nbSaisies' => (int) $row['nb_saisies'],
                'nbArticles' => (int) $row['nb_articles'],
                'grammes' => (int) $row['grammes'],
                'millilitres' => (int) $row['millilitres'],
                'sansContenance' => (int) $row['sans_contenance'],
            ],
            $stmt->fetchAll(),
        );
    }

    /**
     * Nombre d'articles par catégorie, bouton choisi et contenance, pour le rapprochement avec AÏDA.
     *
     * @return list<array{categorieId: int, formatId: int|null, contenance: int|null, nbArticles: int, nbSaisies: int}>
     */
    public function parBouton(int $campagneId, ?int $magasinId): array
    {
        [$where, $params] = self::filtre($campagneId, $magasinId);
        $stmt = $this->db->prepare(
            "SELECT s.categorie_id, s.format_id, s.contenance_unitaire, SUM(s.quantite) AS nb_articles, COUNT(*) AS nb_saisies
             FROM saisie s
             WHERE {$where}
             GROUP BY s.categorie_id, s.format_id, s.contenance_unitaire",
        );
        $stmt->execute($params);

        return array_map(
            static fn (array $row): array => [
                'categorieId' => (int) $row['categorie_id'],
                'formatId' => $row['format_id'] === null ? null : (int) $row['format_id'],
                'contenance' => $row['contenance_unitaire'] === null ? null : (int) $row['contenance_unitaire'],
                'nbArticles' => (int) $row['nb_articles'],
                'nbSaisies' => (int) $row['nb_saisies'],
            ],
            $stmt->fetchAll(),
        );
    }

    /**
     * Totaux généraux, déduits des totaux par catégorie.
     *
     * @param list<array{unite: string, nbSaisies: int, nbArticles: int, contenance: int|null, sansContenance: int}> $categories
     * @return Totaux
     */
    public static function totaux(array $categories): array
    {
        $totaux = ['nbSaisies' => 0, 'nbArticles' => 0, 'grammes' => 0, 'millilitres' => 0, 'sansContenance' => 0];
        foreach ($categories as $categorie) {
            $totaux['nbSaisies'] += $categorie['nbSaisies'];
            $totaux['nbArticles'] += $categorie['nbArticles'];
            $totaux['sansContenance'] += $categorie['sansContenance'];
            if ($categorie['unite'] === 'kg') {
                $totaux['grammes'] += (int) $categorie['contenance'];
            } elseif ($categorie['unite'] === 'L') {
                $totaux['millilitres'] += (int) $categorie['contenance'];
            }
        }

        return $totaux;
    }

    /**
     * @return array{string, list<int>}
     */
    private static function filtre(int $campagneId, ?int $magasinId): array
    {
        $where = 's.campagne_id = ? AND s.supprime_le IS NULL';
        $params = [$campagneId];
        if ($magasinId !== null) {
            $where .= ' AND s.magasin_id = ?';
            $params[] = $magasinId;
        }

        return [$where, $params];
    }
}
