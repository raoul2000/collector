<?php

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Database;
use App\Http\HttpException;
use App\Http\JsonResponse;
use App\Http\Request;
use App\Repository\JournalRepository;
use App\Repository\MagasinRepository;
use App\Validation\Validator;
use PDO;

final readonly class MagasinController
{
    public function __construct(
        private PDO $db,
        private MagasinRepository $magasins,
        private JournalRepository $journal,
    ) {
    }

    public function list(Request $request, string $prenom): JsonResponse
    {
        return new JsonResponse($this->magasins->findAll());
    }

    public function create(Request $request, string $prenom): JsonResponse
    {
        $data = $this->validate($request, null);

        $id = Database::transaction($this->db, function () use ($data, $prenom): int {
            $id = $this->magasins->create($data['nom'], $data['ville'], $data['actif']);
            $this->journal->log($prenom, 'creation', 'magasin', $id, ['apres' => $this->magasins->find($id)]);

            return $id;
        });

        return JsonResponse::created($this->magasins->find($id));
    }

    public function update(Request $request, string $prenom): JsonResponse
    {
        $avant = $this->findOr404($request->intParam('id'));
        $data = $this->validate($request, $avant);

        Database::transaction($this->db, function () use ($avant, $data, $prenom): void {
            $this->magasins->update($avant['id'], $data['nom'], $data['ville'], $data['actif']);
            $this->journal->log($prenom, 'modification', 'magasin', $avant['id'], [
                'avant' => $avant,
                'apres' => $this->magasins->find($avant['id']),
            ]);
        });

        return new JsonResponse($this->magasins->find($avant['id']));
    }

    public function delete(Request $request, string $prenom): JsonResponse
    {
        $magasin = $this->findOr404($request->intParam('id'));
        if ($magasin['nbSaisies'] > 0) {
            throw HttpException::conflict(
                'Ce magasin a des saisies : il ne peut pas être supprimé, mais il peut être désactivé.',
                'has_saisies',
            );
        }

        Database::transaction($this->db, function () use ($magasin, $prenom): void {
            $this->magasins->delete($magasin['id']);
            $this->journal->log($prenom, 'suppression', 'magasin', $magasin['id'], ['avant' => $magasin]);
        });

        return JsonResponse::noContent();
    }

    /**
     * @return array<string, mixed>
     */
    private function findOr404(int $id): array
    {
        return $this->magasins->find($id) ?? throw HttpException::notFound('Magasin introuvable.');
    }

    /**
     * @param array<string, mixed>|null $existing magasin modifié (null pour une création)
     * @return array{nom: string, ville: string, actif: bool}
     */
    private function validate(Request $request, ?array $existing): array
    {
        $v = new Validator($request->json());
        $nom = $v->string('nom', max: 100);
        $ville = $v->string('ville', max: 100, optional: true) ?? '';
        $actif = $v->bool('actif', optional: true) ?? $existing['actif'] ?? true;

        if ($nom !== null && $this->magasins->exists($nom, $ville, $existing['id'] ?? null)) {
            $v->addError('nom', 'Ce magasin existe déjà.');
        }
        $v->validate();

        return ['nom' => (string) $nom, 'ville' => $ville, 'actif' => $actif];
    }
}
