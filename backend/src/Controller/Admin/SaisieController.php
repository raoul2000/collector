<?php

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Database;
use App\Http\HttpException;
use App\Http\JsonResponse;
use App\Http\Request;
use App\Repository\JournalRepository;
use App\Repository\SaisieRepository;
use App\Saisie\SaisieRules;
use App\Validation\Validator;
use PDO;

/**
 * Consultation et correction des saisies par les responsables.
 */
final readonly class SaisieController
{
    public const int PAR_PAGE_MAX = 200;

    public function __construct(
        private PDO $db,
        private SaisieRepository $saisies,
        private SaisieRules $rules,
        private JournalRepository $journal,
    ) {
    }

    public function list(Request $request, string $prenom): JsonResponse
    {
        $entier = static function (?string $value, int $min, int $max, ?int $default): ?int {
            if ($value === null || $value === '') {
                return $default;
            }
            if (preg_match('/^\d{1,9}$/', $value) !== 1 || (int) $value < $min || (int) $value > $max) {
                throw HttpException::badRequest("Paramètre invalide : {$value}");
            }

            return (int) $value;
        };

        $page = (int) $entier($request->query('page'), 1, 1_000_000, 1);
        $parPage = (int) $entier($request->query('parPage'), 1, self::PAR_PAGE_MAX, 50);
        $resultat = $this->saisies->search([
            'campagneId' => $entier($request->query('campagne'), 1, PHP_INT_MAX, null),
            'magasinId' => $entier($request->query('magasin'), 1, PHP_INT_MAX, null),
            'categorieId' => $entier($request->query('categorie'), 1, PHP_INT_MAX, null),
            'prenom' => mb_substr(trim((string) $request->query('prenom', '')), 0, 50),
            'code' => mb_substr(trim((string) $request->query('code', '')), 0, 50),
            'sansCode' => $request->query('sansCode') === '1',
            'supprimees' => $request->query('supprimees') === '1',
        ], $page, $parPage);

        return new JsonResponse($resultat + ['page' => $page, 'parPage' => $parPage]);
    }

    public function update(Request $request, string $prenom): JsonResponse
    {
        $avant = $this->findOr404($request->param('id'));

        $v = new Validator($request->json());
        $contenu = $this->rules->contenu($v);
        $v->validate();

        Database::transaction($this->db, function () use ($avant, $contenu, $prenom): void {
            $this->saisies->correct(
                $avant['id'],
                $prenom,
                (int) $contenu['categorieId'],
                (int) $contenu['quantite'],
                $contenu['contenanceUnitaire'],
            );
            $this->journal->log($prenom, 'correction', 'saisie', $avant['id'], [
                'avant' => $avant,
                'apres' => $this->saisies->findDetail($avant['id']),
            ]);
        });

        return new JsonResponse($this->saisies->findDetail($avant['id']));
    }

    public function delete(Request $request, string $prenom): JsonResponse
    {
        $saisie = $this->findOr404($request->param('id'));

        Database::transaction($this->db, function () use ($saisie, $prenom): void {
            $this->saisies->deleteByResponsable($saisie['id'], $prenom);
            $this->journal->log($prenom, 'suppression', 'saisie', $saisie['id'], ['avant' => $saisie]);
        });

        return JsonResponse::noContent();
    }

    /**
     * Saisie non supprimée, ou erreur 404.
     *
     * @return array<string, mixed>
     */
    private function findOr404(string $id): array
    {
        $saisie = Validator::isUuid($id) ? $this->saisies->findDetail(strtolower($id)) : null;
        if ($saisie === null || $saisie['supprime']) {
            throw HttpException::notFound('Saisie introuvable.');
        }

        return $saisie;
    }
}
