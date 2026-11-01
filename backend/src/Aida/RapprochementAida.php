<?php

declare(strict_types=1);

namespace App\Aida;

/**
 * Traduit les saisies d'une campagne en nombres d'articles par code AÏDA, à ressaisir dans AÏDA.
 *
 * Rattachement d'une saisie :
 * - bouton choisi : le code de ce bouton ;
 * - catégorie sans bouton : le code de référence de la catégorie ;
 * - contenance libre : le format le plus proche (à égale distance, le plus petit), à vérifier sauf si la contenance
 *   correspond exactement à un seul format ;
 * - contenance inconnue, ou bouton sans code : le code de référence, sinon celui du premier bouton, à vérifier ;
 * - aucun code possible (« Autre ») : non rapprochée.
 *
 * @phpstan-type Groupe array{categorieId: int, formatId: int|null, contenance: int|null, nbArticles: int, nbSaisies: int}
 * @phpstan-type Format array{id: int, contenance: int|null, libelle: string|null, codeAida: string|null}
 * @phpstan-type Categorie array{id: int, nom: string, unite: string, codeReference: string|null, formats: list<Format>}
 */
final class RapprochementAida
{
    /**
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
            $cible = self::cible($categorie, $groupe['formatId'], $groupe['contenance']);

            if ($cible === null) {
                $nonRapprochees[$categorie['id']] ??= ['categorieId' => $categorie['id'], 'nom' => $categorie['nom'], 'nbArticles' => 0, 'nbSaisies' => 0];
                $nonRapprochees[$categorie['id']]['nbArticles'] += $groupe['nbArticles'];
                $nonRapprochees[$categorie['id']]['nbSaisies'] += $groupe['nbSaisies'];
                continue;
            }

            $code = $cible['code'];
            $rang = [$rangs[$categorie['id']], $cible['ordre']];
            $articles[$code] ??= ['code' => $code, 'libelles' => [], 'nbArticles' => 0, 'aVerifier' => 0, 'rang' => $rang];
            $articles[$code]['rang'] = min($articles[$code]['rang'], $rang);
            $articles[$code]['libelles'][$rang[0] . '-' . $rang[1]] = $cible['libelle'];
            $articles[$code]['nbArticles'] += $groupe['nbArticles'];
            $articles[$code]['aVerifier'] += $cible['aVerifier'] ? $groupe['nbArticles'] : 0;
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
     * @param Categorie $categorie
     * @return array{code: string, libelle: string, ordre: int, aVerifier: bool}|null
     */
    private static function cible(array $categorie, ?int $formatId, ?int $contenance): ?array
    {
        $formats = $categorie['formats'];
        $codes = array_filter($formats, static fn (array $f): bool => $f['codeAida'] !== null);

        foreach ($codes as $ordre => $format) {
            if ($format['id'] === $formatId) {
                return self::versFormat($categorie, $format, $ordre, false);
            }
        }

        if ($formats === [] && $categorie['codeReference'] !== null) {
            return ['code' => $categorie['codeReference'], 'libelle' => $categorie['nom'], 'ordre' => 0, 'aVerifier' => false];
        }

        $avecContenance = array_filter($codes, static fn (array $f): bool => $f['contenance'] !== null);
        if ($contenance !== null && $avecContenance !== []) {
            uasort($avecContenance, static fn (array $a, array $b): int =>
                [abs($a['contenance'] - $contenance), $a['contenance']] <=> [abs($b['contenance'] - $contenance), $b['contenance']]);
            $ordre = (int) array_key_first($avecContenance);
            $format = $avecContenance[$ordre];
            $memeContenance = array_filter($avecContenance, static fn (array $f): bool => $f['contenance'] === $format['contenance']);
            $exact = $format['contenance'] === $contenance && count($memeContenance) === 1 && $formatId === null;

            return self::versFormat($categorie, $format, $ordre, !$exact);
        }

        if ($categorie['codeReference'] !== null) {
            return ['code' => $categorie['codeReference'], 'libelle' => $categorie['nom'], 'ordre' => 0, 'aVerifier' => true];
        }
        if ($codes !== []) {
            $ordre = (int) array_key_first($codes);

            return self::versFormat($categorie, $codes[$ordre], $ordre, true);
        }

        return null;
    }

    /**
     * @param Categorie $categorie
     * @param Format $format
     * @return array{code: string, libelle: string, ordre: int, aVerifier: bool}
     */
    private static function versFormat(array $categorie, array $format, int $ordre, bool $aVerifier): array
    {
        return [
            'code' => (string) $format['codeAida'],
            'libelle' => self::libelle($categorie, $format),
            'ordre' => $ordre + 1,
            'aVerifier' => $aVerifier,
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
