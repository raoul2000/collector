<?php

declare(strict_types=1);

namespace App\Controller;

use App\Http\JsonResponse;
use App\Http\Request;
use App\Repository\CampagneRepository;
use App\Repository\CategorieRepository;
use App\Repository\MagasinRepository;

/**
 * Données de référence nécessaires à la saisie, mises en cache sur le téléphone pour le fonctionnement hors ligne.
 */
final readonly class ReferentielController
{
    public function __construct(
        private CampagneRepository $campagnes,
        private MagasinRepository $magasins,
        private CategorieRepository $categories,
    ) {
    }

    public function show(Request $request): JsonResponse
    {
        $campagne = $this->campagnes->findActive();

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
                    'unite' => $c['unite'],
                    'formats' => $c['formats'],
                ],
                $this->categories->findActiveWithFormats(),
            ),
        ];

        // Empreinte du contenu : permet au téléphone de savoir si sa copie locale est à jour
        $referentiel['version'] = substr(sha1(json_encode($referentiel, JSON_THROW_ON_ERROR)), 0, 16);

        return new JsonResponse($referentiel);
    }
}
