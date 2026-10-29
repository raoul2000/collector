<?php

declare(strict_types=1);

namespace App\Tests\Controller\Admin;

use App\Tests\ApiTestCase;

final class SaisieControllerTest extends ApiTestCase
{
    private const string APPAREIL = 'a1a1a1a1-0000-4000-8000-000000000001';

    private int $campagne;
    private int $lidl;
    private int $auchan;
    private int $pates;
    private int $savon;

    protected function setUp(): void
    {
        parent::setUp();
        $this->campagne = $this->insert('campagne', ['nom' => 'C', 'date_debut' => '2026-11-27', 'date_fin' => '2026-11-28', 'active' => 1]);
        $this->lidl = $this->insert('magasin', ['nom' => 'Lidl']);
        $this->auchan = $this->insert('magasin', ['nom' => 'Auchan']);
        $this->pates = $this->insert('categorie', ['nom' => 'Pâtes', 'unite' => 'kg']);
        $this->savon = $this->insert('categorie', ['nom' => 'Savon', 'unite' => 'unite']);
    }

    public function testRoutesRequireAnAdminSession(): void
    {
        self::assertSame(401, $this->request('GET', '/api/admin/saisies')->status);
    }

    public function testListWithFiltersAndPagination(): void
    {
        $this->loginAsAdmin();
        $this->insert('appareil', ['id' => self::APPAREIL, 'prenom' => 'Marie-Claire']);
        $this->insert('appareil', ['id' => 'b2b2b2b2-0000-4000-8000-000000000002', 'prenom' => 'Paul']);
        $a = $this->saisieDe(self::APPAREIL, $this->lidl, '2026-11-27 10:00:00');
        $b = $this->saisieDe(self::APPAREIL, $this->auchan, '2026-11-27 11:00:00');
        $c = $this->saisieDe('b2b2b2b2-0000-4000-8000-000000000002', $this->lidl, '2026-11-27 12:00:00');
        $this->saisieDe(self::APPAREIL, $this->lidl, '2026-11-27 13:00:00', ['supprime_le' => '2026-11-27 13:05:00.000']);

        $tout = $this->request('GET', '/api/admin/saisies')->data;
        self::assertSame(3, $tout['total']);
        self::assertSame([$c, $b, $a], array_column($tout['saisies'], 'id'));
        self::assertSame(
            ['prenom' => 'Paul', 'magasinNom' => 'Lidl', 'categorieNom' => 'Pâtes', 'unite' => 'kg'],
            array_intersect_key($tout['saisies'][0], array_flip(['prenom', 'magasinNom', 'categorieNom', 'unite'])),
        );

        $lidl = $this->request('GET', '/api/admin/saisies', query: ['magasin' => (string) $this->lidl])->data;
        self::assertSame([$c, $a], array_column($lidl['saisies'], 'id'));

        $marie = $this->request('GET', '/api/admin/saisies', query: ['prenom' => 'claire'])->data;
        self::assertSame([$b, $a], array_column($marie['saisies'], 'id'));

        $page2 = $this->request('GET', '/api/admin/saisies', query: ['parPage' => '2', 'page' => '2'])->data;
        self::assertSame(['total' => 3, 'page' => 2, 'parPage' => 2], array_intersect_key($page2, array_flip(['total', 'page', 'parPage'])));
        self::assertSame([$a], array_column($page2['saisies'], 'id'));

        $avecSupprimees = $this->request('GET', '/api/admin/saisies', query: ['supprimees' => '1'])->data;
        self::assertSame(4, $avecSupprimees['total']);

        self::assertSame(400, $this->request('GET', '/api/admin/saisies', query: ['parPage' => '1000'])->status);
    }

    public function testCodeReferenceColumnAndFilters(): void
    {
        $this->loginAsAdmin();
        $this->insert('appareil', ['id' => self::APPAREIL, 'prenom' => 'Marie']);
        $riz = $this->insert('categorie', ['nom' => 'Riz', 'unite' => 'kg', 'code_reference' => 'EPI-02']);
        $this->db->prepare('UPDATE categorie SET code_reference = ? WHERE id = ?')->execute(['EPI-01', $this->pates]);
        $a = $this->saisieDe(self::APPAREIL, $this->lidl, '2026-11-27 10:00:00');
        $b = $this->saisieDe(self::APPAREIL, $this->lidl, '2026-11-27 11:00:00', ['categorie_id' => $riz]);
        $c = $this->saisieDe(self::APPAREIL, $this->lidl, '2026-11-27 12:00:00', ['categorie_id' => $this->savon]);

        $tout = $this->request('GET', '/api/admin/saisies')->data;
        self::assertSame([null, 'EPI-02', 'EPI-01'], array_column($tout['saisies'], 'codeReference'));

        $epi = $this->request('GET', '/api/admin/saisies', query: ['code' => 'epi'])->data;
        self::assertSame([$b, $a], array_column($epi['saisies'], 'id'));
        self::assertSame(2, $epi['total']);

        $epi02 = $this->request('GET', '/api/admin/saisies', query: ['code' => '-02'])->data;
        self::assertSame([$b], array_column($epi02['saisies'], 'id'));

        $sansCode = $this->request('GET', '/api/admin/saisies', query: ['sansCode' => '1'])->data;
        self::assertSame([$c], array_column($sansCode['saisies'], 'id'));
        self::assertSame(1, $sansCode['total']);

        self::assertSame(0, $this->request('GET', '/api/admin/saisies', query: ['code' => '%'])->data['total']);
    }

    public function testPrenomFilterEscapesWildcards(): void
    {
        $this->loginAsAdmin();
        $this->insert('appareil', ['id' => self::APPAREIL, 'prenom' => 'Marie']);
        $this->saisieDe(self::APPAREIL, $this->lidl, '2026-11-27 10:00:00');

        self::assertSame(0, $this->request('GET', '/api/admin/saisies', query: ['prenom' => '%'])->data['total']);
    }

    public function testCorrectionIsRecordedAndJournaled(): void
    {
        $this->loginAsAdmin('Paul');
        $this->insert('appareil', ['id' => self::APPAREIL, 'prenom' => 'Marie']);
        $id = $this->saisieDe(self::APPAREIL, $this->lidl, '2026-11-27 10:00:00');

        $response = $this->request('PUT', "/api/admin/saisies/{$id}", ['categorieId' => $this->savon, 'quantite' => 5, 'contenanceUnitaire' => null]);

        self::assertSame(200, $response->status);
        self::assertSame(
            ['categorieId' => $this->savon, 'quantite' => 5, 'contenanceUnitaire' => null, 'corrigeParResponsable' => 'Paul', 'categorieNom' => 'Savon'],
            array_intersect_key($response->data, array_flip(['categorieId', 'quantite', 'contenanceUnitaire', 'corrigeParResponsable', 'categorieNom'])),
        );
        self::assertNotNull($this->db->query('SELECT corrige_le FROM saisie')->fetchColumn());

        $details = json_decode((string) $this->db->query("SELECT details FROM journal_admin WHERE action = 'correction'")->fetchColumn(), true);
        self::assertSame(1, $details['avant']['quantite']);
        self::assertSame(5, $details['apres']['quantite']);
    }

    public function testCorrectionIsValidated(): void
    {
        $this->loginAsAdmin();
        $this->insert('appareil', ['id' => self::APPAREIL, 'prenom' => 'Marie']);
        $id = $this->saisieDe(self::APPAREIL, $this->lidl, '2026-11-27 10:00:00');

        $response = $this->request('PUT', "/api/admin/saisies/{$id}", ['categorieId' => $this->savon, 'quantite' => 1000, 'contenanceUnitaire' => 500]);

        self::assertSame(422, $response->status);
        self::assertSame(['quantite', 'contenanceUnitaire'], array_keys($response->data['error']['details']['fields']));
    }

    public function testCorrectionCanChangeTheMagasin(): void
    {
        $this->loginAsAdmin('Paul');
        $this->participent($this->lidl, $this->auchan);
        $this->insert('appareil', ['id' => self::APPAREIL, 'prenom' => 'Marie']);
        $id = $this->saisieDe(self::APPAREIL, $this->lidl, '2026-11-27 10:00:00');
        $contenu = ['categorieId' => $this->pates, 'quantite' => 1, 'contenanceUnitaire' => 500];

        $response = $this->request('PUT', "/api/admin/saisies/{$id}", $contenu + ['magasinId' => $this->auchan]);

        self::assertSame(200, $response->status);
        self::assertSame(['magasinId' => $this->auchan, 'corrigeParResponsable' => 'Paul', 'magasinNom' => 'Auchan'], array_intersect_key(
            $response->data,
            array_flip(['magasinId', 'magasinNom', 'corrigeParResponsable']),
        ));
        $details = json_decode((string) $this->db->query("SELECT details FROM journal_admin WHERE action = 'correction'")->fetchColumn(), true);
        self::assertSame([$this->lidl, $this->auchan], [$details['avant']['magasinId'], $details['apres']['magasinId']]);

        // Sans magasinId, le magasin est conservé
        self::assertSame($this->auchan, $this->request('PUT', "/api/admin/saisies/{$id}", $contenu)->data['magasinId']);
    }

    public function testCorrectionRejectsAnUnavailableMagasin(): void
    {
        $this->loginAsAdmin();
        $inactif = $this->insert('magasin', ['nom' => 'Casino', 'actif' => 0]);
        $this->participent($this->lidl, $inactif);
        $this->insert('appareil', ['id' => self::APPAREIL, 'prenom' => 'Marie']);
        $id = $this->saisieDe(self::APPAREIL, $this->lidl, '2026-11-27 10:00:00');
        $contenu = ['categorieId' => $this->pates, 'quantite' => 1, 'contenanceUnitaire' => 500];

        // Auchan ne participe pas à la campagne ; Casino y participe mais est désactivé
        foreach ([$this->auchan, $inactif] as $magasin) {
            $response = $this->request('PUT', "/api/admin/saisies/{$id}", $contenu + ['magasinId' => $magasin]);
            self::assertSame(422, $response->status);
            self::assertSame(['magasinId'], array_keys($response->data['error']['details']['fields']));
        }
        self::assertSame($this->lidl, (int) $this->db->query('SELECT magasin_id FROM saisie')->fetchColumn());
    }

    public function testMagasinOfSeveralSaisiesIsChangedAtOnce(): void
    {
        $this->loginAsAdmin('Paul');
        $this->participent($this->lidl, $this->auchan);
        $this->insert('appareil', ['id' => self::APPAREIL, 'prenom' => 'Marie']);
        $a = $this->saisieDe(self::APPAREIL, $this->lidl, '2026-11-27 10:00:00');
        $b = $this->saisieDe(self::APPAREIL, $this->lidl, '2026-11-27 11:00:00');
        $dejaBon = $this->saisieDe(self::APPAREIL, $this->auchan, '2026-11-27 12:00:00');
        $autre = $this->saisieDe(self::APPAREIL, $this->lidl, '2026-11-27 13:00:00');

        $response = $this->request('POST', '/api/admin/saisies/magasin', [
            'ids' => [$a, strtoupper($b), $dejaBon],
            'magasinId' => $this->auchan,
        ]);

        self::assertSame(200, $response->status);
        self::assertSame(['nbModifiees' => 2], $response->data);
        $magasins = $this->db->query('SELECT id, magasin_id FROM saisie')->fetchAll(\PDO::FETCH_KEY_PAIR);
        $magasins = array_map(intval(...), $magasins);
        ksort($magasins);
        $attendus = [$a => $this->auchan, $b => $this->auchan, $dejaBon => $this->auchan, $autre => $this->lidl];
        ksort($attendus);
        self::assertSame($attendus, $magasins);
        $corrigees = $this->db->query('SELECT id FROM saisie WHERE modifie_par_responsable = \'Paul\' AND corrige_le IS NOT NULL ORDER BY saisie_le')->fetchAll(\PDO::FETCH_COLUMN);
        self::assertSame([$a, $b], $corrigees);
        $journal = $this->db->query("SELECT entite_id FROM journal_admin WHERE action = 'correction' ORDER BY id")->fetchAll(\PDO::FETCH_COLUMN);
        self::assertSame([$a, $b], $journal);
    }

    public function testMagasinChangeIsAllOrNothing(): void
    {
        $this->loginAsAdmin();
        $this->participent($this->lidl);
        $this->insert('appareil', ['id' => self::APPAREIL, 'prenom' => 'Marie']);
        $a = $this->saisieDe(self::APPAREIL, $this->lidl, '2026-11-27 10:00:00');
        $supprimee = $this->saisieDe(self::APPAREIL, $this->lidl, '2026-11-27 11:00:00', ['supprime_le' => '2026-11-27 11:05:00.000']);
        $changer = fn (array $body) => $this->request('POST', '/api/admin/saisies/magasin', $body);

        // Auchan ne participe pas à la campagne
        $refus = $changer(['ids' => [$a], 'magasinId' => $this->auchan]);
        self::assertSame(422, $refus->status);
        self::assertSame(['magasinId'], array_keys($refus->data['error']['details']['fields']));

        $this->participent($this->auchan);
        self::assertSame(404, $changer(['ids' => [$a, $supprimee], 'magasinId' => $this->auchan])->status);
        self::assertSame(404, $changer(['ids' => [self::uuid()], 'magasinId' => $this->auchan])->status);

        foreach ([[], ['pas-un-uuid'], [$a, $a], array_fill(0, 201, $a)] as $ids) {
            $response = $changer(['ids' => $ids, 'magasinId' => $this->auchan]);
            self::assertSame(422, $response->status);
            self::assertSame(['ids'], array_keys($response->data['error']['details']['fields']));
        }

        self::assertSame(0, (int) $this->db->query("SELECT COUNT(*) FROM saisie WHERE magasin_id = {$this->auchan}")->fetchColumn());
        self::assertSame(0, (int) $this->db->query('SELECT COUNT(*) FROM journal_admin WHERE action = \'correction\'')->fetchColumn());
    }

    public function testMagasinChangeReachesThePhone(): void
    {
        $this->loginAsAdmin('Paul');
        $this->participent($this->lidl, $this->auchan);
        $id = self::uuid();
        $sync = fn (array $saisies, ?string $curseur = null) => $this->request(
            'POST',
            '/api/sync',
            ['prenom' => 'Marie', 'curseur' => $curseur, 'saisies' => $saisies],
            ['X-Device-Id' => self::APPAREIL],
        )->data;
        $saisie = [
            'id' => $id, 'campagneId' => $this->campagne, 'magasinId' => $this->lidl, 'categorieId' => $this->pates,
            'quantite' => 2, 'contenanceUnitaire' => 500, 'saisieLe' => '2026-11-27T10:00:00+01:00',
            'modifieLe' => '2026-11-27T10:00:00.000+01:00', 'supprime' => false, 'baseMajLe' => null,
        ];
        $envoi = $sync([$saisie]);

        $this->request('POST', '/api/admin/saisies/magasin', ['ids' => [$id], 'magasinId' => $this->auchan]);

        // Le téléphone renvoie ensuite une modification fondée sur sa version antérieure : la correction l'emporte
        $baseMajLe = $envoi['resultats'][0]['saisie']['majLe'];
        $retour = $sync([['quantite' => 4, 'modifieLe' => '2026-11-27T10:30:00.000+01:00', 'baseMajLe' => $baseMajLe] + $saisie]);
        self::assertSame('conflit', $retour['resultats'][0]['statut']);
        self::assertSame($this->auchan, $retour['resultats'][0]['saisie']['magasinId']);
        self::assertSame('Paul', $retour['resultats'][0]['saisie']['corrigeParResponsable']);
    }

    public function testExportListsTheCampagneSaisiesInChronologicalOrder(): void
    {
        $this->loginAsAdmin('Paul');
        $autreCampagne = $this->insert('campagne', ['nom' => 'Ancienne', 'date_debut' => '2025-11-28', 'date_fin' => '2025-11-29']);
        $this->db->prepare('UPDATE magasin SET ville = ? WHERE id = ?')->execute(['Centre', $this->lidl]);
        $this->db->prepare('UPDATE categorie SET code_reference = ? WHERE id = ?')->execute(['EPI-01', $this->pates]);
        $this->insert('appareil', ['id' => self::APPAREIL, 'prenom' => 'Marie']);
        $this->saisieDe(self::APPAREIL, $this->auchan, '2026-11-27 11:00:00', [
            'categorie_id' => $this->savon, 'quantite' => 3, 'contenance_unitaire' => null, 'modifie_par_responsable' => 'Paul',
        ]);
        $this->saisieDe(self::APPAREIL, $this->lidl, '2026-11-27 10:00:00');
        $this->saisieDe(self::APPAREIL, $this->lidl, '2026-11-27 12:00:00', ['supprime_le' => '2026-11-27 12:05:00.000']);
        $this->saisieDe(self::APPAREIL, $this->lidl, '2025-11-28 10:00:00', ['campagne_id' => $autreCampagne]);

        $response = $this->request('GET', '/api/admin/saisies/export', query: ['campagne' => (string) $this->campagne]);

        self::assertSame(200, $response->status);
        self::assertSame(['id' => $this->campagne, 'nom' => 'C'], $response->data['campagne']);
        self::assertSame([
            [
                'saisieLe' => '2026-11-27 10:00:00', 'magasin' => 'Lidl', 'ville' => 'Centre', 'prenom' => 'Marie',
                'categorie' => 'Pâtes', 'codeReference' => 'EPI-01', 'unite' => 'kg', 'quantite' => 1,
                'contenanceUnitaire' => 500, 'corrigeParResponsable' => null,
            ],
            [
                'saisieLe' => '2026-11-27 11:00:00', 'magasin' => 'Auchan', 'ville' => '', 'prenom' => 'Marie',
                'categorie' => 'Savon', 'codeReference' => null, 'unite' => 'unite', 'quantite' => 3,
                'contenanceUnitaire' => null, 'corrigeParResponsable' => 'Paul',
            ],
        ], $response->data['saisies']);

        self::assertSame(404, $this->request('GET', '/api/admin/saisies/export', query: ['campagne' => '999999'])->status);
        self::assertSame(404, $this->request('GET', '/api/admin/saisies/export')->status);
    }

    public function testDeletionIsLogicalAndJournaled(): void
    {
        $this->loginAsAdmin('Paul');
        $this->insert('appareil', ['id' => self::APPAREIL, 'prenom' => 'Marie']);
        $id = $this->saisieDe(self::APPAREIL, $this->lidl, '2026-11-27 10:00:00');

        self::assertSame(204, $this->request('DELETE', "/api/admin/saisies/{$id}")->status);

        $row = $this->db->query('SELECT supprime_le, modifie_par_responsable FROM saisie')->fetch();
        self::assertNotNull($row['supprime_le']);
        self::assertSame('Paul', $row['modifie_par_responsable']);
        self::assertSame(404, $this->request('DELETE', "/api/admin/saisies/{$id}")->status);
        self::assertSame(404, $this->request('PUT', '/api/admin/saisies/pas-un-uuid', ['quantite' => 1])->status);
    }

    public function testCorrectionReachesThePhone(): void
    {
        $this->loginAsAdmin('Paul');
        $id = self::uuid();
        $sync = fn (array $saisies, ?string $curseur = null) => $this->request(
            'POST',
            '/api/sync',
            ['prenom' => 'Marie', 'curseur' => $curseur, 'saisies' => $saisies],
            ['X-Device-Id' => self::APPAREIL],
        )->data;
        $envoi = $sync([[
            'id' => $id, 'campagneId' => $this->campagne, 'magasinId' => $this->lidl, 'categorieId' => $this->pates,
            'quantite' => 2, 'contenanceUnitaire' => 500, 'saisieLe' => '2026-11-27T10:00:00+01:00',
            'modifieLe' => '2026-11-27T10:00:00.000+01:00', 'supprime' => false, 'baseMajLe' => null,
        ]]);

        $this->request('PUT', "/api/admin/saisies/{$id}", ['categorieId' => $this->pates, 'quantite' => 3, 'contenanceUnitaire' => 500]);

        $changements = $sync([], '2000-01-01 00:00:00.000')['changements'];
        self::assertSame(3, $changements[0]['quantite']);
        self::assertSame('Paul', $changements[0]['corrigeParResponsable']);
        self::assertNotSame($envoi['resultats'][0]['saisie']['majLe'], $changements[0]['majLe']);
    }

    private function participent(int ...$magasins): void
    {
        foreach ($magasins as $magasin) {
            $this->insert('campagne_magasin', ['campagne_id' => $this->campagne, 'magasin_id' => $magasin]);
        }
    }

    /**
     * @param array<string, mixed> $overrides
     */
    private function saisieDe(string $appareil, int $magasin, string $saisieLe, array $overrides = []): string
    {
        $id = self::uuid();
        $this->insert('saisie', array_merge([
            'id' => $id,
            'campagne_id' => $this->campagne,
            'magasin_id' => $magasin,
            'appareil_id' => $appareil,
            'categorie_id' => $this->pates,
            'quantite' => 1,
            'contenance_unitaire' => 500,
            'saisie_le' => $saisieLe,
            'modifie_le' => $saisieLe . '.000',
        ], $overrides));

        return $id;
    }
}
