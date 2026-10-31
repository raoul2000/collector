<?php

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Database;
use App\Http\HttpException;
use App\Http\JsonResponse;
use App\Http\Request;
use App\Repository\CampagneRepository;
use App\Repository\CategorieRepository;
use App\Repository\JournalRepository;
use App\Repository\RechercheRepository;
use App\Validation\Validator;
use PDO;

/**
 * Recherches sans résultat des bénévoles : à ajouter aux mots-clés d'une catégorie, ou à ignorer.
 */
final readonly class RechercheController
{
    public function __construct(
        private PDO $db,
        private CampagneRepository $campagnes,
        private RechercheRepository $recherches,
        private CategorieRepository $categories,
        private JournalRepository $journal,
    ) {
    }

    /**
     * Recherches d'une campagne (?campagne=), de la campagne active par défaut.
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
            'recherches' => $this->recherches->groupees($campagne['id']),
        ]);
    }

    /**
     * Ajoute le mot cherché aux mots-clés d'une catégorie : il ne sera plus présenté.
     */
    public function ajouterMotCle(Request $request, string $prenom): JsonResponse
    {
        $v = new Validator($request->json());
        $terme = $v->string('terme', max: 100);
        $categorieId = $v->int('categorieId', 1, PHP_INT_MAX);
        $avant = $categorieId === null ? null : $this->categories->find($categorieId);
        if ($categorieId !== null && $avant === null) {
            $v->addError('categorieId', 'Catégorie introuvable.');
        }
        $motsCles = $avant === null ? [] : CategorieRepository::motsCles(implode(',', [...$avant['motsCles'], (string) $terme]));
        if (mb_strlen(implode(', ', $motsCles)) > CategorieController::MOTS_CLES_MAX) {
            $v->addError('terme', 'Les mots-clés de cette catégorie sont trop longs : retirez-en depuis l\'onglet Catégories.');
        }
        $v->validate();
        /** @var array<string, mixed> $avant */

        Database::transaction($this->db, function () use ($avant, $motsCles, $prenom): void {
            $this->categories->setMotsCles($avant['id'], $motsCles);
            $this->journal->log($prenom, 'modification', 'categorie', $avant['id'], [
                'avant' => ['motsCles' => $avant['motsCles']],
                'apres' => ['motsCles' => $motsCles],
            ]);
        });

        return new JsonResponse($this->categories->find($avant['id']));
    }

    public function ignorer(Request $request, string $prenom): JsonResponse
    {
        $v = new Validator($request->json());
        $terme = $v->string('terme', max: 100);
        $v->validate();

        Database::transaction($this->db, function () use ($terme, $prenom): void {
            $this->recherches->ignorer((string) $terme, $prenom);
            $this->journal->log($prenom, 'ignorer', 'recherche', null, ['terme' => $terme]);
        });

        return JsonResponse::noContent();
    }
}
