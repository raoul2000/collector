<?php

declare(strict_types=1);

namespace App\Controller;

use App\Http\HttpException;
use App\Http\JsonResponse;
use App\Http\Request;
use App\Repository\BilanRepository;
use App\Repository\CampagneRepository;

/**
 * Bilans de la collecte : complets pour les responsables, réduits pour motiver les bénévoles.
 */
final readonly class BilanController
{
    public function __construct(
        private CampagneRepository $campagnes,
        private BilanRepository $bilans,
    ) {
    }

    /**
     * Bilan complet (espace responsable) : totaux, par catégorie, par heure et par magasin,
     * pour une campagne (la campagne active par défaut) et éventuellement un seul magasin.
     */
    public function admin(Request $request, string $prenom): JsonResponse
    {
        $campagneId = self::id($request->query('campagne'));
        $campagne = $campagneId === null ? $this->campagnes->findActive() : $this->campagnes->find($campagneId);
        if ($campagne === null) {
            throw HttpException::notFound($campagneId === null ? 'Aucune campagne active.' : 'Campagne introuvable.');
        }
        $magasinId = self::id($request->query('magasin'));

        $categories = $this->bilans->parCategorie($campagne['id'], $magasinId);

        return new JsonResponse([
            'campagne' => self::campagne($campagne),
            'magasinId' => $magasinId,
            'totaux' => BilanRepository::totaux($categories),
            'categories' => $categories,
            'heures' => $this->bilans->parHeure($campagne['id'], $magasinId),
            'magasins' => $this->bilans->parMagasin($campagne['id']),
        ]);
    }

    /**
     * Bilan « motivation » (bénévoles, sans authentification) sur la campagne active : totaux et catégories
     * du magasin, total général, classement des magasins. Uniquement des agrégats, sans prénom.
     */
    public function public(Request $request): JsonResponse
    {
        $campagne = $this->campagnes->findActive();
        if ($campagne === null) {
            return new JsonResponse(['campagne' => null]);
        }

        $classement = $this->bilans->parMagasin($campagne['id']);
        $magasinId = self::id($request->query('magasin'));
        $magasin = null;
        if ($magasinId !== null && in_array($magasinId, array_column($classement, 'magasinId'), true)) {
            $categories = $this->bilans->parCategorie($campagne['id'], $magasinId);
            $magasin = ['magasinId' => $magasinId, 'totaux' => BilanRepository::totaux($categories), 'categories' => $categories];
        }

        return new JsonResponse([
            'campagne' => self::campagne($campagne),
            'magasin' => $magasin,
            'general' => BilanRepository::totaux($this->bilans->parCategorie($campagne['id'], null)),
            'classement' => $classement,
        ]);
    }

    private static function id(?string $value): ?int
    {
        if ($value === null || $value === '') {
            return null;
        }
        if (preg_match('/^[1-9]\d{0,9}$/', $value) !== 1) {
            throw HttpException::badRequest("Identifiant invalide : {$value}");
        }

        return (int) $value;
    }

    /**
     * @param array<string, mixed> $campagne
     * @return array{id: int, nom: string, dateDebut: string, dateFin: string}
     */
    private static function campagne(array $campagne): array
    {
        return [
            'id' => $campagne['id'],
            'nom' => $campagne['nom'],
            'dateDebut' => $campagne['dateDebut'],
            'dateFin' => $campagne['dateFin'],
        ];
    }
}
