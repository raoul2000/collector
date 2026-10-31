<?php

declare(strict_types=1);

namespace App\Saisie;

use App\Validation\Validator;
use PDO;

/**
 * Règles de validité d'une saisie, communes à la synchronisation (téléphone) et aux corrections (responsable).
 *
 * Les tables de référence (catégories, magasins, campagnes) sont lues une seule fois par requête.
 */
final class SaisieRules
{
    public const int QUANTITE_MAX = 999;

    /** Contenance maximale : 25 kg ou 10 L (cf. spécifications 4.2) */
    public const array CONTENANCE_MAX = ['kg' => 25_000, 'L' => 10_000];

    /** @var array<int, string>|null unité par identifiant de catégorie */
    private ?array $unites = null;

    /** @var array<int, array{categorie: int, contenance: int|null}>|null formats (boutons) par identifiant */
    private ?array $formats = null;

    /** @var array<int, true>|null */
    private ?array $magasins = null;

    /** @var array<int, true>|null */
    private ?array $campagnes = null;

    public function __construct(private readonly PDO $db)
    {
    }

    /**
     * Contrôle la catégorie, la quantité, la contenance et le bouton choisi (formatId), et leur cohérence :
     * contenance selon l'unité, bouton de la catégorie et de même contenance.
     *
     * Un bouton incohérent est une erreur pour un responsable ($strict) ; venant d'un téléphone, il est ignoré
     * (bouton supprimé ou modifié depuis la dernière mise à jour du référentiel) : la saisie reste valable.
     *
     * @return array{categorieId: int|null, quantite: int|null, contenanceUnitaire: int|null, formatId: int|null}
     */
    public function contenu(Validator $v, bool $strict = true): array
    {
        $categorieId = $v->int('categorieId', 1, PHP_INT_MAX);
        $quantite = $v->int('quantite', 1, self::QUANTITE_MAX);
        $contenance = $v->int('contenanceUnitaire', 1, PHP_INT_MAX, optional: true);
        $formatId = $v->int('formatId', 1, PHP_INT_MAX, optional: true);

        if ($formatId !== null && $categorieId !== null) {
            $format = $this->formats()[$formatId] ?? null;
            if ($format === null || $format['categorie'] !== $categorieId || $format['contenance'] !== $contenance) {
                if ($strict) {
                    $v->addError('formatId', 'Ce format ne correspond pas à la catégorie ou à la contenance.');
                }
                $formatId = null;
            }
        }

        if ($categorieId !== null) {
            $unite = $this->unites()[$categorieId] ?? null;
            if ($unite === null) {
                $v->addError('categorieId', 'Catégorie inconnue.');
            } elseif ($unite === 'unite' && $contenance !== null) {
                $v->addError('contenanceUnitaire', 'Une catégorie comptée à l\'unité n\'a pas de contenance.');
            } elseif ($contenance !== null && $contenance > self::CONTENANCE_MAX[$unite]) {
                $v->addError('contenanceUnitaire', 'Contenance trop élevée (25 kg ou 10 L au maximum).');
            }
        }

        return ['categorieId' => $categorieId, 'quantite' => $quantite, 'contenanceUnitaire' => $contenance, 'formatId' => $formatId];
    }

    public function magasinExiste(int $id): bool
    {
        $this->magasins ??= array_fill_keys($this->ids('magasin'), true);

        return isset($this->magasins[$id]);
    }

    public function campagneExiste(int $id): bool
    {
        $this->campagnes ??= array_fill_keys($this->ids('campagne'), true);

        return isset($this->campagnes[$id]);
    }

    /**
     * Magasin actif et participant à la campagne : seule destination possible d'un changement de magasin
     * par un responsable.
     */
    public function magasinDisponible(int $magasinId, int $campagneId): bool
    {
        $stmt = $this->db->prepare(
            'SELECT 1 FROM magasin m
             JOIN campagne_magasin cm ON cm.magasin_id = m.id
             WHERE m.id = ? AND cm.campagne_id = ? AND m.actif = 1',
        );
        $stmt->execute([$magasinId, $campagneId]);

        return $stmt->fetchColumn() !== false;
    }

    /**
     * @return array<int, array{categorie: int, contenance: int|null}>
     */
    private function formats(): array
    {
        if ($this->formats === null) {
            $this->formats = [];
            foreach ($this->db->query('SELECT id, categorie_id, contenance FROM format')->fetchAll() as $row) {
                $this->formats[(int) $row['id']] = [
                    'categorie' => (int) $row['categorie_id'],
                    'contenance' => $row['contenance'] === null ? null : (int) $row['contenance'],
                ];
            }
        }

        return $this->formats;
    }

    /**
     * @return array<int, string>
     */
    private function unites(): array
    {
        return $this->unites ??= array_map(
            strval(...),
            $this->db->query('SELECT id, unite FROM categorie')->fetchAll(PDO::FETCH_KEY_PAIR),
        );
    }

    /**
     * @return list<int>
     */
    private function ids(string $table): array
    {
        return array_map(intval(...), $this->db->query("SELECT id FROM {$table}")->fetchAll(PDO::FETCH_COLUMN));
    }
}
