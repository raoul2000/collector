<?php

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Database;
use App\Http\HttpException;
use App\Http\JsonResponse;
use App\Http\Request;
use App\Repository\CampagneRepository;
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

    private const string MAGASIN_INDISPONIBLE = 'Ce magasin n\'est pas actif ou ne participe pas à la campagne de la saisie.';

    public function __construct(
        private PDO $db,
        private SaisieRepository $saisies,
        private SaisieRules $rules,
        private JournalRepository $journal,
        private CampagneRepository $campagnes,
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

        $appareil = (string) $request->query('appareil', '');
        if ($appareil !== '' && !Validator::isUuid($appareil)) {
            throw HttpException::badRequest("Paramètre invalide : {$appareil}");
        }

        $page = (int) $entier($request->query('page'), 1, 1_000_000, 1);
        $parPage = (int) $entier($request->query('parPage'), 1, self::PAR_PAGE_MAX, 50);
        $resultat = $this->saisies->search([
            'campagneId' => $entier($request->query('campagne'), 1, PHP_INT_MAX, null),
            'magasinId' => $entier($request->query('magasin'), 1, PHP_INT_MAX, null),
            'categorieId' => $entier($request->query('categorie'), 1, PHP_INT_MAX, null),
            'appareilId' => $appareil === '' ? null : strtolower($appareil),
            'prenom' => mb_substr(trim((string) $request->query('prenom', '')), 0, 50),
            'code' => mb_substr(trim((string) $request->query('code', '')), 0, 50),
            'sansCode' => $request->query('sansCode') === '1',
            'supprimees' => $request->query('supprimees') === '1',
        ], $page, $parPage);

        return new JsonResponse($resultat + ['page' => $page, 'parPage' => $parPage]);
    }

    /**
     * Saisies d'une campagne pour l'export Excel (le fichier est construit dans le navigateur).
     */
    public function export(Request $request, string $prenom): JsonResponse
    {
        $id = (string) $request->query('campagne', '');
        $campagne = preg_match('/^\d{1,9}$/', $id) === 1 ? $this->campagnes->find((int) $id) : null;
        if ($campagne === null) {
            throw HttpException::notFound('Campagne introuvable.');
        }

        return new JsonResponse([
            'campagne' => ['id' => $campagne['id'], 'nom' => $campagne['nom']],
            'saisies' => $this->saisies->forExport($campagne['id']),
        ]);
    }

    public function update(Request $request, string $prenom): JsonResponse
    {
        $avant = $this->findOr404($request->param('id'));

        $v = new Validator($request->json());
        $contenu = $this->rules->contenu($v);
        // Magasin facultatif : inchangé s'il est absent
        $magasinId = $v->int('magasinId', 1, PHP_INT_MAX, optional: true) ?? $avant['magasinId'];
        if ($magasinId !== $avant['magasinId'] && !$this->rules->magasinDisponible($magasinId, $avant['campagneId'])) {
            $v->addError('magasinId', self::MAGASIN_INDISPONIBLE);
        }
        $v->validate();

        Database::transaction($this->db, function () use ($avant, $contenu, $magasinId, $prenom): void {
            $this->saisies->correct(
                $avant['id'],
                $prenom,
                $magasinId,
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

    /**
     * Changement de magasin d'un ensemble de saisies (bénévole qui s'est trompé de magasin).
     * Tout ou rien : la moindre saisie introuvable ou le moindre magasin indisponible annule l'ensemble.
     * Les saisies déjà dans le magasin demandé sont laissées telles quelles.
     */
    public function changeMagasin(Request $request, string $prenom): JsonResponse
    {
        $v = new Validator($request->json());
        $ids = $v->uuidList('ids', self::PAR_PAGE_MAX);
        $magasinId = $v->int('magasinId', 1, PHP_INT_MAX);
        $v->validate();

        $aDeplacer = [];
        foreach ((array) $ids as $id) {
            $saisie = $this->saisies->findDetail($id);
            if ($saisie === null || $saisie['supprime']) {
                throw HttpException::notFound('Saisie introuvable ou supprimée : rechargez la liste.');
            }
            if ($saisie['magasinId'] !== $magasinId) {
                $aDeplacer[] = $saisie;
            }
        }
        foreach (array_unique(array_column($aDeplacer, 'campagneId')) as $campagneId) {
            if (!$this->rules->magasinDisponible((int) $magasinId, $campagneId)) {
                $v->addError('magasinId', self::MAGASIN_INDISPONIBLE);
            }
        }
        $v->validate();

        Database::transaction($this->db, function () use ($aDeplacer, $magasinId, $prenom): void {
            foreach ($aDeplacer as $avant) {
                $this->saisies->changeMagasin($avant['id'], $prenom, (int) $magasinId);
                $this->journal->log($prenom, 'correction', 'saisie', $avant['id'], [
                    'avant' => $avant,
                    'apres' => $this->saisies->findDetail($avant['id']),
                ]);
            }
        });

        return new JsonResponse(['nbModifiees' => count($aDeplacer)]);
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
