<?php

declare(strict_types=1);

namespace App\Controller\Admin;

use App\Database;
use App\Http\HttpException;
use App\Http\JsonResponse;
use App\Http\Request;
use App\Repository\CategorieRepository;
use App\Repository\JournalRepository;
use App\Repository\SectionRepository;
use App\Validation\Validator;
use PDO;

final readonly class CategorieController
{
    public const array UNITES = ['kg', 'L', 'unite'];

    /** Contenance maximale d'un format : 25 kg ou 10 L (cf. spécifications 4.2) */
    public const array CONTENANCE_MAX = ['kg' => 25_000, 'L' => 10_000];

    public const int MAX_FORMATS = 8;

    public function __construct(
        private PDO $db,
        private CategorieRepository $categories,
        private SectionRepository $sections,
        private JournalRepository $journal,
    ) {
    }

    public function list(Request $request, string $prenom): JsonResponse
    {
        return new JsonResponse($this->categories->findAll());
    }

    public function create(Request $request, string $prenom): JsonResponse
    {
        $data = $this->validate($request, null);

        $id = Database::transaction($this->db, function () use ($data, $prenom): int {
            $id = $this->categories->create(
                $data['nom'],
                $data['sectionId'],
                $data['unite'],
                $data['ordre'] ?? $this->categories->nextOrdre(),
                $data['active'],
                $data['codeReference'],
                $data['formats'],
            );
            $this->journal->log($prenom, 'creation', 'categorie', $id, ['apres' => $this->categories->find($id)]);

            return $id;
        });

        return JsonResponse::created($this->categories->find($id));
    }

    public function update(Request $request, string $prenom): JsonResponse
    {
        $avant = $this->findOr404($request->intParam('id'));
        $data = $this->validate($request, $avant);

        Database::transaction($this->db, function () use ($avant, $data, $prenom): void {
            $this->categories->update(
                $avant['id'],
                $data['nom'],
                $data['sectionId'],
                $data['unite'],
                $data['ordre'] ?? $avant['ordre'],
                $data['active'],
                $data['codeReference'],
                $data['formats'],
            );
            $this->journal->log($prenom, 'modification', 'categorie', $avant['id'], [
                'avant' => $avant,
                'apres' => $this->categories->find($avant['id']),
            ]);
        });

        return new JsonResponse($this->categories->find($avant['id']));
    }

    /**
     * Nouvel ordre d'affichage : la liste doit contenir toutes les catégories, une seule fois chacune.
     */
    public function reorder(Request $request, string $prenom): JsonResponse
    {
        $v = new Validator($request->json());
        $ids = $v->intList('ids', 1, PHP_INT_MAX, maxItems: 1000);
        if ($ids !== null) {
            $attendus = $this->categories->allIds();
            sort($attendus);
            $recus = $ids;
            sort($recus);
            if ($recus !== $attendus) {
                $v->addError('ids', 'La liste doit contenir toutes les catégories, une seule fois chacune.');
            }
        }
        $v->validate();

        Database::transaction($this->db, function () use ($ids, $prenom): void {
            $this->categories->reorder((array) $ids);
            $this->journal->log($prenom, 'reordonnancement', 'categorie', null, ['ordre' => $ids]);
        });

        return new JsonResponse($this->categories->findAll());
    }

    public function delete(Request $request, string $prenom): JsonResponse
    {
        $categorie = $this->findOr404($request->intParam('id'));
        if ($categorie['nbSaisies'] > 0) {
            throw HttpException::conflict(
                'Cette catégorie a des saisies : elle ne peut pas être supprimée, mais elle peut être désactivée.',
                'has_saisies',
            );
        }

        Database::transaction($this->db, function () use ($categorie, $prenom): void {
            $this->categories->delete($categorie['id']);
            $this->journal->log($prenom, 'suppression', 'categorie', $categorie['id'], ['avant' => $categorie]);
        });

        return JsonResponse::noContent();
    }

    /**
     * @return array<string, mixed>
     */
    private function findOr404(int $id): array
    {
        return $this->categories->find($id) ?? throw HttpException::notFound('Catégorie introuvable.');
    }

    /**
     * @param array<string, mixed>|null $existing catégorie modifiée (null pour une création)
     * @return array{nom: string, sectionId: int|null, unite: string, ordre: int|null, active: bool, codeReference: string|null, formats: list<int>}
     */
    private function validate(Request $request, ?array $existing): array
    {
        $v = new Validator($request->json());
        $nom = $v->string('nom', max: 100);
        $unite = $v->enum('unite', self::UNITES);
        $ordre = $v->int('ordre', 0, 1_000_000, optional: true);
        $active = $v->bool('active', optional: true) ?? $existing['active'] ?? true;
        $codeReference = $v->string('codeReference', max: 50, optional: true);
        $codeReference = $codeReference === '' ? null : $codeReference;
        // Absente : inchangée ; null : sans section
        $sectionId = array_key_exists('sectionId', $request->json())
            ? $v->int('sectionId', 1, PHP_INT_MAX, optional: true)
            : $existing['sectionId'] ?? null;
        if ($sectionId !== null && !$this->sections->exists($sectionId)) {
            $v->addError('sectionId', 'Section introuvable.');
        }

        $formats = [];
        if ($unite !== null) {
            if ($unite === 'unite') {
                if ($v->has('formats') && $request->json()['formats'] !== []) {
                    $v->addError('formats', 'Une catégorie comptée à l\'unité n\'a pas de formats.');
                }
            } else {
                $formats = $v->intList('formats', 1, self::CONTENANCE_MAX[$unite], self::MAX_FORMATS, optional: true) ?? [];
            }

            if ($existing !== null && $unite !== $existing['unite'] && $existing['nbSaisies'] > 0) {
                $v->addError('unite', 'Impossible de changer l\'unité : des saisies existent pour cette catégorie.');
            }
        }

        if ($nom !== null && $this->categories->nomExists($nom, $existing['id'] ?? null)) {
            $v->addError('nom', 'Une catégorie porte déjà ce nom.');
        }
        if ($codeReference !== null && $this->categories->codeReferenceExists($codeReference, $existing['id'] ?? null)) {
            $v->addError('codeReference', 'Ce code de référence est déjà utilisé.');
        }
        $v->validate();

        return [
            'nom' => (string) $nom,
            'sectionId' => $sectionId,
            'unite' => (string) $unite,
            'ordre' => $ordre,
            'active' => $active,
            'codeReference' => $codeReference,
            'formats' => $formats,
        ];
    }
}
