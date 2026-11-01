<?php

declare(strict_types=1);

namespace App\Controller;

use App\Http\JsonResponse;
use App\Http\Request;
use App\Repository\CampagneRepository;
use App\Repository\CategorieRepository;
use App\Repository\MagasinRepository;
use App\Repository\SectionRepository;

/**
 * Données de référence nécessaires à la saisie, mises en cache sur le téléphone pour le fonctionnement hors ligne.
 */
final readonly class ReferentielController
{
    public function __construct(
        private CampagneRepository $campagnes,
        private MagasinRepository $magasins,
        private CategorieRepository $categories,
        private SectionRepository $sections,
    ) {
    }

    public function show(Request $request): JsonResponse
    {
        $campagne = $this->campagnes->findActive();
        $categories = $this->categories->findActiveWithFormats();

        $referentiel = [
            'campagne' => $campagne,
            'magasins' => $campagne === null ? [] : array_map(
                static fn (array $m): array => ['id' => $m['id'], 'nom' => $m['nom'], 'ville' => $m['ville']],
                $this->magasins->findActiveByCampagne($campagne['id']),
            ),
            'categories' => array_map(
                static fn (array $c): array => [
                    'id' => $c['id'],
                    'nom' => $c['nom'],
                    'sectionId' => $c['sectionId'],
                    'unite' => $c['unite'],
                    'motsCles' => $c['motsCles'],
                    'precisionRequise' => $c['precisionRequise'],
                    // Contenances seules, pour les versions de l'application antérieures aux variantes
                    'formats' => array_values(array_unique(array_filter(array_column($c['formats'], 'contenance')))),
                    // Sans le code AÏDA, inutile aux téléphones
                    'boutons' => array_map(
                        static fn (array $f): array => ['id' => $f['id'], 'contenance' => $f['contenance'], 'libelle' => $f['libelle']],
                        $c['formats'],
                    ),
                ],
                $categories,
            ),
            // Produits à privilégier, dans l'ordre d'affichage
            'privilegiees' => array_column(array_filter($categories, static fn (array $c): bool => $c['privilegiee']), 'id'),
        ];
        // Sections ayant au moins une catégorie active, dans l'ordre d'affichage
        $utilisees = array_flip(array_filter(array_column($referentiel['categories'], 'sectionId')));
        $referentiel['sections'] = array_values(array_map(
            static fn (array $s): array => ['id' => $s['id'], 'nom' => $s['nom']],
            array_filter($this->sections->findAll(), static fn (array $s): bool => isset($utilisees[$s['id']])),
        ));

        // Empreinte du contenu : permet au téléphone de savoir si sa copie locale est à jour
        $referentiel['version'] = substr(sha1(json_encode($referentiel, JSON_THROW_ON_ERROR)), 0, 16);

        return new JsonResponse($referentiel);
    }
}
