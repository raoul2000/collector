<?php

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Http\HttpException;
use App\Http\JsonResponse;
use App\Http\Request;
use App\Repository\AppareilRepository;
use App\Repository\CampagneRepository;

/**
 * Téléphones des bénévoles : prénom, activité dans une campagne, dernière synchronisation.
 */
final readonly class AppareilController
{
    /**
     * @param int $connecteMinutes délai depuis la dernière synchronisation en deçà duquel un appareil est « connecté »
     */
    public function __construct(
        private CampagneRepository $campagnes,
        private AppareilRepository $appareils,
        private int $connecteMinutes,
    ) {
    }

    /**
     * Appareils d'une campagne (la campagne active par défaut).
     */
    public function list(Request $request, string $prenom): JsonResponse
    {
        $id = (string) $request->query('campagne', '');
        if ($id !== '' && preg_match('/^\d{1,9}$/', $id) !== 1) {
            throw HttpException::badRequest("Paramètre invalide : {$id}");
        }
        $campagne = $id === '' ? $this->campagnes->findActive() : $this->campagnes->find((int) $id);
        if ($campagne === null) {
            throw HttpException::notFound($id === '' ? 'Aucune campagne active.' : 'Campagne introuvable.');
        }

        return new JsonResponse([
            'campagne' => ['id' => $campagne['id'], 'nom' => $campagne['nom']],
            'connecteMinutes' => $this->connecteMinutes,
            'appareils' => $this->appareils->findByCampagne($campagne, $this->connecteMinutes),
        ]);
    }
}
