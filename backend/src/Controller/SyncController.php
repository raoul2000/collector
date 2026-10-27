<?php

declare(strict_types=1);

namespace App\Controller;

use App\Database;
use App\Http\HttpException;
use App\Http\JsonResponse;
use App\Http\Request;
use App\Repository\AppareilRepository;
use App\Repository\SaisieRepository;
use App\Saisie\SaisieRules;
use App\Validation\Validator;
use PDO;

/**
 * Synchronisation des saisies d'un téléphone (cf. docs/specifications.md, 5.4).
 *
 * Le téléphone envoie l'état courant des saisies modifiées localement ; le serveur renvoie, pour chacune,
 * l'état qu'il retient, puis les saisies de l'appareil modifiées côté serveur depuis le curseur
 * (corrections des responsables, restauration).
 *
 * Résolution des conflits, pour une saisie existante :
 * - corrigée par un responsable après la version connue du téléphone (baseMajLe) → la correction l'emporte ;
 * - plus ancienne que la version enregistrée (renvoi tardif) → ignorée ;
 * - sinon → la version du téléphone est enregistrée.
 */
final readonly class SyncController
{
    public const int MAX_SAISIES = 200;

    private const string CURSOR_PATTERN = '/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}$/';

    public function __construct(
        private PDO $db,
        private AppareilRepository $appareils,
        private SaisieRepository $saisies,
        private SaisieRules $rules,
    ) {
    }

    public function sync(Request $request): JsonResponse
    {
        $appareilId = $request->header('X-Device-Id');
        if ($appareilId === null || !Validator::isUuid($appareilId)) {
            throw HttpException::badRequest('En-tête X-Device-Id absent ou invalide.', 'invalid_device_id');
        }
        $appareilId = strtolower($appareilId);

        $body = $request->json();
        $v = new Validator($body);
        $prenom = $v->string('prenom', max: 50);
        $curseur = $v->string('curseur', max: 30, optional: true);
        if ($curseur !== null && preg_match(self::CURSOR_PATTERN, $curseur) !== 1) {
            $v->addError('curseur', 'Curseur invalide.');
        }
        $items = $body['saisies'] ?? [];
        if (!is_array($items) || !array_is_list($items)) {
            $v->addError('saisies', 'Ce champ doit être une liste.');
        } elseif (count($items) > self::MAX_SAISIES) {
            $v->addError('saisies', 'Au plus ' . self::MAX_SAISIES . ' saisies par envoi.');
        }
        $v->validate();

        $resultats = Database::transaction($this->db, function () use ($appareilId, $prenom, $items): array {
            $this->appareils->touch($appareilId, (string) $prenom);

            return array_map(fn (mixed $item): array => $this->apply($appareilId, $item), $items);
        });

        $envoyees = array_flip(array_filter(array_column($resultats, 'id')));

        return new JsonResponse([
            'resultats' => $resultats,
            'changements' => array_values(array_filter(
                $this->saisies->changesForAppareil($appareilId, $curseur),
                static fn (array $s): bool => !isset($envoyees[$s['id']]),
            )),
            'curseur' => $this->saisies->cursor(),
        ]);
    }

    /**
     * @return array{id: string|null, statut: 'ok'|'conflit'|'rejete', erreur?: string, saisie?: array<string, mixed>}
     */
    private function apply(string $appareilId, mixed $item): array
    {
        if (!is_array($item) || array_is_list($item)) {
            return ['id' => null, 'statut' => 'rejete', 'erreur' => 'Saisie invalide.'];
        }

        $v = new Validator($item);
        $id = $v->uuid('id');
        $campagneId = $v->int('campagneId', 1, PHP_INT_MAX);
        $magasinId = $v->int('magasinId', 1, PHP_INT_MAX);
        $contenu = $this->rules->contenu($v);
        $saisieLe = $v->datetime('saisieLe');
        $modifieLe = $v->datetime('modifieLe');
        $supprime = $v->bool('supprime');
        $base = $v->string('baseMajLe', max: 30, optional: true);

        if ($campagneId !== null && !$this->rules->campagneExiste($campagneId)) {
            $v->addError('campagneId', 'Campagne inconnue.');
        }
        if ($magasinId !== null && !$this->rules->magasinExiste($magasinId)) {
            $v->addError('magasinId', 'Magasin inconnu.');
        }
        if ($id === null || $v->errors() !== []) {
            return ['id' => $id, 'statut' => 'rejete', 'erreur' => implode(' ', array_unique($v->errors()))];
        }

        $saisie = [
            'id' => $id,
            'campagneId' => (int) $campagneId,
            'magasinId' => (int) $magasinId,
            'categorieId' => (int) $contenu['categorieId'],
            'quantite' => (int) $contenu['quantite'],
            'contenanceUnitaire' => $contenu['contenanceUnitaire'],
            'saisieLe' => $saisieLe,
            'modifieLe' => $modifieLe,
            'supprime' => (bool) $supprime,
        ];

        $existing = $this->saisies->findRow($id, forUpdate: true);
        if ($existing === null) {
            $this->saisies->insert($appareilId, $saisie);
            $statut = 'ok';
        } elseif ($existing['appareil_id'] !== $appareilId) {
            return ['id' => $id, 'statut' => 'rejete', 'erreur' => 'Cette saisie appartient à un autre appareil.'];
        } elseif ($existing['corrige_le'] !== null && ($base === null || $existing['corrige_le'] > $base)) {
            $statut = 'conflit';
        } else {
            if ($modifieLe->format('Y-m-d H:i:s.v') >= $existing['modifie_le']) {
                $this->saisies->updateFromDevice($id, $saisie);
            }
            $statut = 'ok';
        }

        return ['id' => $id, 'statut' => $statut, 'saisie' => $this->saisies->find($id)];
    }
}
