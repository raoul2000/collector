<?php

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Database;
use App\Http\HttpException;
use App\Http\JsonResponse;
use App\Http\Request;
use App\Repository\JournalRepository;
use App\Repository\SectionRepository;
use App\Validation\Validator;
use PDO;

/**
 * Sections : groupes de catégories affichés comme repères dans la grille de saisie.
 */
final readonly class SectionController
{
    public function __construct(
        private PDO $db,
        private SectionRepository $sections,
        private JournalRepository $journal,
    ) {
    }

    public function list(Request $request, string $prenom): JsonResponse
    {
        return new JsonResponse($this->sections->findAll());
    }

    public function create(Request $request, string $prenom): JsonResponse
    {
        $nom = $this->validate($request, null);

        $id = Database::transaction($this->db, function () use ($nom, $prenom): int {
            $id = $this->sections->create($nom);
            $this->journal->log($prenom, 'creation', 'section', $id, ['apres' => $this->sections->find($id)]);

            return $id;
        });

        return JsonResponse::created($this->sections->find($id));
    }

    public function update(Request $request, string $prenom): JsonResponse
    {
        $avant = $this->findOr404($request->intParam('id'));
        $nom = $this->validate($request, $avant['id']);

        Database::transaction($this->db, function () use ($avant, $nom, $prenom): void {
            $this->sections->update($avant['id'], $nom);
            $this->journal->log($prenom, 'modification', 'section', $avant['id'], [
                'avant' => $avant,
                'apres' => $this->sections->find($avant['id']),
            ]);
        });

        return new JsonResponse($this->sections->find($avant['id']));
    }

    /**
     * Nouvel ordre d'affichage : la liste doit contenir toutes les sections, une seule fois chacune.
     */
    public function reorder(Request $request, string $prenom): JsonResponse
    {
        $v = new Validator($request->json());
        $ids = $v->intList('ids', 1, PHP_INT_MAX, maxItems: 1000);
        if ($ids !== null) {
            $attendus = $this->sections->allIds();
            sort($attendus);
            $recus = $ids;
            sort($recus);
            if ($recus !== $attendus) {
                $v->addError('ids', 'La liste doit contenir toutes les sections, une seule fois chacune.');
            }
        }
        $v->validate();

        Database::transaction($this->db, function () use ($ids, $prenom): void {
            $this->sections->reorder((array) $ids);
            $this->journal->log($prenom, 'reordonnancement', 'section', null, ['ordre' => $ids]);
        });

        return new JsonResponse($this->sections->findAll());
    }

    /**
     * Les catégories de la section restent, sans section.
     */
    public function delete(Request $request, string $prenom): JsonResponse
    {
        $section = $this->findOr404($request->intParam('id'));

        Database::transaction($this->db, function () use ($section, $prenom): void {
            $this->sections->delete($section['id']);
            $this->journal->log($prenom, 'suppression', 'section', $section['id'], ['avant' => $section]);
        });

        return JsonResponse::noContent();
    }

    /**
     * @return array{id: int, nom: string, ordre: int, nbCategories: int}
     */
    private function findOr404(int $id): array
    {
        return $this->sections->find($id) ?? throw HttpException::notFound('Section introuvable.');
    }

    private function validate(Request $request, ?int $exceptId): string
    {
        $v = new Validator($request->json());
        $nom = $v->string('nom', max: 60);
        if ($nom !== null && $this->sections->nomExists($nom, $exceptId)) {
            $v->addError('nom', 'Une section porte déjà ce nom.');
        }
        $v->validate();

        return (string) $nom;
    }
}
