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
use App\Repository\SectionRepository;
use App\Validation\Validator;
use PDO;

final readonly class CategorieController
{
    public const array UNITES = ['kg', 'L', 'unite'];

    /** Contenance maximale d'un format : 25 kg ou 10 L (cf. spécifications 4.2) */
    public const array CONTENANCE_MAX = ['kg' => 25_000, 'L' => 10_000];

    public const int MAX_FORMATS = 8;

    public const int LIBELLE_MAX = 40;

    public const int MOTS_CLES_MAX = 500;

    public const int CODE_AIDA_MAX = 50;

    public function __construct(
        private PDO $db,
        private CategorieRepository $categories,
        private SectionRepository $sections,
        private JournalRepository $journal,
        private CampagneRepository $campagnes,
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
                $data['motsCles'],
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
                $data['motsCles'],
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

    /**
     * Ajoute la catégorie aux produits à privilégier de la campagne active, ou l'en retire.
     */
    public function privilegier(Request $request, string $prenom): JsonResponse
    {
        $categorie = $this->findOr404($request->intParam('id'));
        $v = new Validator($request->json());
        $privilegiee = $v->bool('privilegiee');
        $v->validate();

        $campagne = $this->campagnes->findActive()
            ?? throw HttpException::conflict('Aucune campagne active : activez-en une pour indiquer les produits à privilégier.', 'no_active_campaign');

        Database::transaction($this->db, function () use ($campagne, $categorie, $privilegiee, $prenom): void {
            $this->categories->setPrivilegiee($campagne['id'], $categorie['id'], (bool) $privilegiee);
            $this->journal->log($prenom, 'produit_a_privilegier', 'categorie', $categorie['id'], [
                'campagneId' => $campagne['id'],
                'privilegiee' => $privilegiee,
            ]);
        });

        return new JsonResponse($this->categories->find($categorie['id']));
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
     * Boutons proposés à la saisie : une contenance (catégorie au poids ou au volume), avec un libellé de variante
     * facultatif ; un libellé seul pour une catégorie à l'unité. Un nombre seul est accepté comme contenance
     * (versions de l'espace responsable antérieures aux variantes).
     *
     * Sans code AÏDA transmis (versions antérieures de l'espace responsable), un format existant garde le sien.
     *
     * @param array<int, string|null> $existants code AÏDA des formats actuels de la catégorie, par identifiant
     * @return list<array{id: int|null, contenance: int|null, libelle: string|null, codeAida: string|null}>
     */
    private function formats(Validator $v, mixed $items, string $unite, array $existants): array
    {
        if (!is_array($items) || !array_is_list($items)) {
            $v->addError('formats', 'Ce champ doit être une liste.');

            return [];
        }
        if (count($items) > self::MAX_FORMATS) {
            $v->addError('formats', 'Au plus ' . self::MAX_FORMATS . ' formats.');

            return [];
        }

        $formats = [];
        $vus = [];
        foreach ($items as $item) {
            $item = is_int($item) ? ['contenance' => $item] : $item;
            if (!is_array($item)) {
                $v->addError('formats', 'Format invalide.');

                return [];
            }
            $id = $item['id'] ?? null;
            $contenance = $item['contenance'] ?? null;
            $libelle = is_string($item['libelle'] ?? null) ? trim($item['libelle']) : null;
            $libelle = $libelle === '' ? null : $libelle;
            $codeAida = array_key_exists('codeAida', $item) ? $item['codeAida'] : (is_int($id) ? $existants[$id] ?? null : null);
            $codeAida = is_string($codeAida) ? trim($codeAida) : $codeAida;
            $codeAida = $codeAida === '' ? null : $codeAida;

            $erreur = match (true) {
                $id !== null && !is_int($id) => 'Format invalide.',
                $id !== null && !array_key_exists($id, $existants) => 'Format inconnu pour cette catégorie.',
                $codeAida !== null && (!is_string($codeAida) || mb_strlen($codeAida) > self::CODE_AIDA_MAX) => 'Code AÏDA invalide (' . self::CODE_AIDA_MAX . ' caractères au maximum).',
                $libelle !== null && mb_strlen($libelle) > self::LIBELLE_MAX => 'Un libellé ne doit pas dépasser ' . self::LIBELLE_MAX . ' caractères.',
                $unite === 'unite' && $contenance !== null => 'Une catégorie comptée à l\'unité n\'a pas de contenance : indiquez seulement le libellé de la variante.',
                $unite === 'unite' && $libelle === null => 'Chaque variante doit avoir un libellé.',
                $unite !== 'unite' && (!is_int($contenance) || $contenance < 1 || $contenance > self::CONTENANCE_MAX[$unite]) => 'Contenance invalide (25 kg ou 10 L au maximum).',
                default => null,
            };
            if ($erreur !== null) {
                $v->addError('formats', $erreur);

                return [];
            }

            $cle = $contenance . '|' . mb_strtolower((string) $libelle);
            if (isset($vus[$cle])) {
                $v->addError('formats', 'Ce format existe déjà.');

                return [];
            }
            $vus[$cle] = true;
            $formats[] = ['id' => $id, 'contenance' => $contenance, 'libelle' => $libelle, 'codeAida' => $codeAida];
        }

        return $formats;
    }

    /**
     * @param array<string, mixed>|null $existing catégorie modifiée (null pour une création)
     * @return array{nom: string, sectionId: int|null, unite: string, ordre: int|null, active: bool, codeReference: string|null, motsCles: list<string>, formats: list<array{id: int|null, contenance: int|null, libelle: string|null, codeAida: string|null}>}
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
        // Texte séparé par des virgules ; absent : inchangés
        $motsCles = $v->has('motsCles')
            ? CategorieRepository::motsCles($v->string('motsCles', max: self::MOTS_CLES_MAX, optional: true))
            : $existing['motsCles'] ?? [];
        // Absente : inchangée ; null : sans section
        $sectionId = array_key_exists('sectionId', $request->json())
            ? $v->int('sectionId', 1, PHP_INT_MAX, optional: true)
            : $existing['sectionId'] ?? null;
        if ($sectionId !== null && !$this->sections->exists($sectionId)) {
            $v->addError('sectionId', 'Section introuvable.');
        }

        $formats = [];
        if ($unite !== null) {
            $formats = $this->formats($v, $request->json()['formats'] ?? [], $unite, array_column($existing['formats'] ?? [], 'codeAida', 'id'));

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
            'motsCles' => $motsCles,
            'formats' => $formats,
        ];
    }
}
