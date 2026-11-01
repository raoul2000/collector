<?php

declare(strict_types=1);

namespace App\Aida;

/**
 * Rattachement des saisies aux codes AÏDA : mêmes règles pour la Réception AÏDA, la liste et l'export des saisies.
 *
 * - bouton choisi : le code de ce bouton ;
 * - catégorie sans bouton : le code de référence de la catégorie ;
 * - contenance libre : le format le plus proche (à égale distance, le plus petit), à vérifier sauf si la contenance
 *   correspond exactement à un seul format ;
 * - contenance inconnue, ou bouton sans code : le code de référence, sinon celui du premier bouton, à vérifier ;
 * - aucun code possible (« Autre ») : non rapprochée.
 *
 * @phpstan-type Groupe array{categorieId: int, formatId: int|null, code: string|null, aVerifier: bool, nbArticles: int, nbSaisies: int}
 * @phpstan-type Format array{id: int, contenance: int|null, libelle: string|null}
 * @phpstan-type Categorie array{id: int, nom: string, unite: string, formats: list<Format>}
 */
final class RapprochementAida
{
    /** Bouton visé par la saisie (alias cible), à joindre après la saisie (s) et sa catégorie (c) */
    public const string JOIN_CIBLE =
        ' LEFT JOIN format cible ON cible.id = COALESCE(
            (SELECT b.id FROM format b
             WHERE b.id = s.format_id AND b.categorie_id = s.categorie_id AND b.code_aida IS NOT NULL),
            (SELECT p.id FROM format p
             WHERE p.categorie_id = s.categorie_id AND p.code_aida IS NOT NULL
               AND p.contenance IS NOT NULL AND s.contenance_unitaire IS NOT NULL
             ORDER BY ABS(CAST(p.contenance AS SIGNED) - CAST(s.contenance_unitaire AS SIGNED)), p.contenance, p.ordre, p.id
             LIMIT 1),
            (SELECT d.id FROM format d
             WHERE c.code_reference IS NULL AND d.categorie_id = s.categorie_id AND d.code_aida IS NOT NULL
             ORDER BY d.ordre, d.id
             LIMIT 1)
        )';

    /** Code retenu pour la saisie (NULL : non rapprochée) */
    public const string CODE = 'COALESCE(cible.code_aida, c.code_reference)';

    /** 1 si le code retenu a été déduit et mérite d'être vérifié */
    public const string A_VERIFIER =
        'CASE
            WHEN COALESCE(cible.code_aida, c.code_reference) IS NULL THEN 0
            WHEN s.format_id = cible.id THEN 0
            WHEN NOT EXISTS (SELECT 1 FROM format e WHERE e.categorie_id = s.categorie_id) THEN 0
            WHEN s.format_id IS NULL AND cible.contenance = s.contenance_unitaire
                AND (SELECT COUNT(*) FROM format n
                     WHERE n.categorie_id = s.categorie_id AND n.code_aida IS NOT NULL AND n.contenance = s.contenance_unitaire) = 1 THEN 0
            ELSE 1
        END';

    /**
     * Regroupe les saisies en nombres d'articles par code, à ressaisir dans AÏDA.
     *
     * @param list<Categorie> $categories dans l'ordre d'affichage, qui donne celui des articles
     * @param list<Groupe> $groupes
     * @return array{
     *     articles: list<array{code: string, libelles: list<string>, nbArticles: int, aVerifier: int}>,
     *     nonRapprochees: list<array{categorieId: int, nom: string, nbArticles: int, nbSaisies: int}>,
     *     totaux: array{nbArticles: int, aVerifier: int, nonRapproches: int}
     * }
     */
    public static function calculer(array $categories, array $groupes): array
    {
        $parId = array_column($categories, null, 'id');
        $rangs = array_flip(array_column($categories, 'id'));

        $articles = [];
        $nonRapprochees = [];
        foreach ($groupes as $groupe) {
            $categorie = $parId[$groupe['categorieId']];
            $code = $groupe['code'];

            if ($code === null) {
                $nonRapprochees[$categorie['id']] ??= ['categorieId' => $categorie['id'], 'nom' => $categorie['nom'], 'nbArticles' => 0, 'nbSaisies' => 0];
                $nonRapprochees[$categorie['id']]['nbArticles'] += $groupe['nbArticles'];
                $nonRapprochees[$categorie['id']]['nbSaisies'] += $groupe['nbSaisies'];
                continue;
            }

            $ordre = 0;
            $libelle = $categorie['nom'];
            foreach ($categorie['formats'] as $index => $format) {
                if ($format['id'] === $groupe['formatId']) {
                    $ordre = $index + 1;
                    $libelle = self::libelle($categorie, $format);
                }
            }

            $rang = [$rangs[$categorie['id']], $ordre];
            $articles[$code] ??= ['code' => $code, 'libelles' => [], 'nbArticles' => 0, 'aVerifier' => 0, 'rang' => $rang];
            $articles[$code]['rang'] = min($articles[$code]['rang'], $rang);
            $articles[$code]['libelles'][$rang[0] . '-' . $rang[1]] = $libelle;
            $articles[$code]['nbArticles'] += $groupe['nbArticles'];
            $articles[$code]['aVerifier'] += $groupe['aVerifier'] ? $groupe['nbArticles'] : 0;
        }

        uasort($articles, static fn (array $a, array $b): int => $a['rang'] <=> $b['rang']);
        uasort($nonRapprochees, static fn (array $a, array $b): int => $rangs[$a['categorieId']] <=> $rangs[$b['categorieId']]);

        $liste = [];
        foreach ($articles as $article) {
            ksort($article['libelles'], SORT_NATURAL);
            $article['libelles'] = array_values($article['libelles']);
            unset($article['rang']);
            $liste[] = $article;
        }

        return [
            'articles' => $liste,
            'nonRapprochees' => array_values($nonRapprochees),
            'totaux' => [
                'nbArticles' => array_sum(array_column($groupes, 'nbArticles')),
                'aVerifier' => array_sum(array_column($liste, 'aVerifier')),
                'nonRapproches' => array_sum(array_column($nonRapprochees, 'nbArticles')),
            ],
        ];
    }

    /**
     * « Pâtes, semoule 500 g », « Huile Olive / colza 1 L », « Couches T4 ».
     *
     * @param Categorie $categorie
     * @param Format $format
     */
    private static function libelle(array $categorie, array $format): string
    {
        return implode(' ', array_filter([
            $categorie['nom'],
            $format['libelle'],
            $format['contenance'] === null ? null : self::contenance($format['contenance'], $categorie['unite']),
        ], static fn (?string $partie): bool => $partie !== null));
    }

    private static function contenance(int $valeur, string $unite): string
    {
        $nombre = static fn (float $n): string => str_replace('.', ',', (string) $n);

        if ($unite === 'L') {
            return $valeur >= 1000 ? $nombre($valeur / 1000) . ' L' : $nombre($valeur / 10) . ' cl';
        }

        return $valeur >= 1000 ? $nombre($valeur / 1000) . ' kg' : $valeur . ' g';
    }
}
