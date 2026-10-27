<?php

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Database;
use App\Http\HttpException;
use App\Http\JsonResponse;
use App\Http\Request;
use App\Repository\CampagneRepository;
use App\Repository\JournalRepository;
use App\Repository\MagasinRepository;
use App\Validation\Validator;
use PDO;

final readonly class CampagneController
{
    public function __construct(
        private PDO $db,
        private CampagneRepository $campagnes,
        private MagasinRepository $magasins,
        private JournalRepository $journal,
    ) {
    }

    public function list(Request $request, string $prenom): JsonResponse
    {
        return new JsonResponse($this->campagnes->findAll());
    }

    public function create(Request $request, string $prenom): JsonResponse
    {
        $data = $this->validate($request, null);

        $id = Database::transaction($this->db, function () use ($data, $prenom): int {
            $id = $this->campagnes->create($data['nom'], $data['dateDebut'], $data['dateFin']);
            $this->campagnes->setMagasins($id, $data['magasinIds'] ?? []);
            $this->journal->log($prenom, 'creation', 'campagne', $id, ['apres' => $this->campagnes->find($id)]);

            return $id;
        });

        return JsonResponse::created($this->campagnes->find($id));
    }

    public function update(Request $request, string $prenom): JsonResponse
    {
        $avant = $this->findOr404($request->intParam('id'));
        $data = $this->validate($request, $avant);

        Database::transaction($this->db, function () use ($avant, $data, $prenom): void {
            $id = $avant['id'];
            $this->campagnes->update($id, $data['nom'], $data['dateDebut'], $data['dateFin']);
            if ($data['magasinIds'] !== null) {
                $this->campagnes->setMagasins($id, $data['magasinIds']);
            }
            $this->journal->log($prenom, 'modification', 'campagne', $id, [
                'avant' => $avant,
                'apres' => $this->campagnes->find($id),
            ]);
        });

        return new JsonResponse($this->campagnes->find($avant['id']));
    }

    public function activate(Request $request, string $prenom): JsonResponse
    {
        $campagne = $this->findOr404($request->intParam('id'));

        Database::transaction($this->db, function () use ($campagne, $prenom): void {
            $this->campagnes->activate($campagne['id']);
            $this->journal->log($prenom, 'activation', 'campagne', $campagne['id']);
        });

        return new JsonResponse($this->campagnes->find($campagne['id']));
    }

    public function deactivate(Request $request, string $prenom): JsonResponse
    {
        $campagne = $this->findOr404($request->intParam('id'));

        $this->campagnes->deactivate($campagne['id']);
        $this->journal->log($prenom, 'desactivation', 'campagne', $campagne['id']);

        return new JsonResponse($this->campagnes->find($campagne['id']));
    }

    public function delete(Request $request, string $prenom): JsonResponse
    {
        $campagne = $this->findOr404($request->intParam('id'));
        if ($campagne['nbSaisies'] > 0) {
            throw HttpException::conflict('Cette campagne contient des saisies : elle ne peut pas être supprimée.', 'has_saisies');
        }

        Database::transaction($this->db, function () use ($campagne, $prenom): void {
            $this->campagnes->delete($campagne['id']);
            $this->journal->log($prenom, 'suppression', 'campagne', $campagne['id'], ['avant' => $campagne]);
        });

        return JsonResponse::noContent();
    }

    /**
     * @return array<string, mixed>
     */
    private function findOr404(int $id): array
    {
        return $this->campagnes->find($id) ?? throw HttpException::notFound('Campagne introuvable.');
    }

    /**
     * @param array<string, mixed>|null $existing campagne modifiée (null pour une création)
     * @return array{nom: string, dateDebut: string, dateFin: string, magasinIds: list<int>|null}
     */
    private function validate(Request $request, ?array $existing): array
    {
        $v = new Validator($request->json());
        $nom = $v->string('nom', max: 100);
        $dateDebut = $v->date('dateDebut');
        $dateFin = $v->date('dateFin');
        $magasinIds = $v->intList('magasinIds', 1, PHP_INT_MAX, maxItems: 500, optional: true);

        if ($dateDebut !== null && $dateFin !== null && $dateFin < $dateDebut) {
            $v->addError('dateFin', 'La date de fin doit être postérieure ou égale à la date de début.');
        }
        if ($nom !== null && $this->campagnes->nomExists($nom, $existing['id'] ?? null)) {
            $v->addError('nom', 'Une campagne porte déjà ce nom.');
        }
        if ($magasinIds !== null) {
            if ($this->magasins->missingIds($magasinIds) !== []) {
                $v->addError('magasinIds', 'Magasin inconnu.');
            }
            if ($existing !== null) {
                $retires = array_diff($this->campagnes->magasinIdsAvecSaisies($existing['id']), $magasinIds);
                if ($retires !== []) {
                    $v->addError('magasinIds', 'Impossible de retirer un magasin qui a déjà des saisies dans cette campagne.');
                }
            }
        }
        $v->validate();

        return [
            'nom' => (string) $nom,
            'dateDebut' => (string) $dateDebut,
            'dateFin' => (string) $dateFin,
            'magasinIds' => $magasinIds,
        ];
    }
}
