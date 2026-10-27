<?php

declare(strict_types=1);

namespace App\Tests\Controller;

use App\Controller\SyncController;
use App\Http\JsonResponse;
use App\Tests\ApiTestCase;

final class SyncControllerTest extends ApiTestCase
{
    private const string APPAREIL = 'a1a1a1a1-0000-4000-8000-000000000001';
    private const string AUTRE_APPAREIL = 'b2b2b2b2-0000-4000-8000-000000000002';

    private int $campagne;
    private int $magasin;
    private int $pates;
    private int $savon;

    protected function setUp(): void
    {
        parent::setUp();
        $this->campagne = $this->insert('campagne', ['nom' => 'C', 'date_debut' => '2026-11-27', 'date_fin' => '2026-11-28', 'active' => 1]);
        $this->magasin = $this->insert('magasin', ['nom' => 'Lidl']);
        $this->pates = $this->insert('categorie', ['nom' => 'Pâtes', 'unite' => 'kg']);
        $this->savon = $this->insert('categorie', ['nom' => 'Savon', 'unite' => 'unite']);
    }

    public function testDeviceIdHeaderIsRequired(): void
    {
        $response = $this->request('POST', '/api/sync', ['prenom' => 'Marie', 'saisies' => []]);

        self::assertSame(400, $response->status);
        self::assertSame('invalid_device_id', $response->data['error']['code']);
    }

    public function testNewSaisieIsRecordedWithDeviceAndLocalTime(): void
    {
        $id = self::uuid();

        $response = $this->sync([$this->saisie($id, ['saisieLe' => '2026-11-27T09:15:00Z'])]);

        self::assertSame(200, $response->status);
        $resultat = $response->data['resultats'][0];
        self::assertSame('ok', $resultat['statut']);
        self::assertSame($id, $resultat['saisie']['id']);
        self::assertSame('2026-11-27T10:15:00+01:00', $resultat['saisie']['saisieLe'], 'Heure convertie dans le fuseau Europe/Paris');
        self::assertSame('2026-11-27T10:15:00.000+01:00', $resultat['saisie']['modifieLe']);
        self::assertFalse($resultat['saisie']['supprime']);
        self::assertMatchesRegularExpression('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}$/', $resultat['saisie']['majLe']);
        self::assertMatchesRegularExpression('/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}$/', $response->data['curseur']);

        $row = $this->db->query('SELECT appareil_id, quantite, contenance_unitaire, saisie_le FROM saisie')->fetch();
        self::assertSame(['appareil_id' => self::APPAREIL, 'quantite' => 2, 'contenance_unitaire' => 500, 'saisie_le' => '2026-11-27 10:15:00'], $row);
        self::assertSame('Marie', $this->db->query('SELECT prenom FROM appareil')->fetchColumn());
    }

    public function testResendingIsIdempotent(): void
    {
        $saisie = $this->saisie(self::uuid());

        $this->sync([$saisie]);
        $response = $this->sync([$saisie]);

        self::assertSame('ok', $response->data['resultats'][0]['statut']);
        self::assertSame(1, $this->countSaisies());
    }

    public function testNewerVersionIsAppliedAndStaleVersionIgnored(): void
    {
        $id = self::uuid();
        $this->sync([$this->saisie($id)]);

        $newer = $this->sync([$this->saisie($id, ['quantite' => 5, 'modifieLe' => '2026-11-27T10:20:00.000+01:00'])]);
        self::assertSame(5, $newer->data['resultats'][0]['saisie']['quantite']);

        $stale = $this->sync([$this->saisie($id, ['quantite' => 9, 'modifieLe' => '2026-11-27T10:16:00.000+01:00'])]);
        self::assertSame('ok', $stale->data['resultats'][0]['statut']);
        self::assertSame(5, $stale->data['resultats'][0]['saisie']['quantite'], 'Le renvoi tardif d\'une ancienne version est ignoré');
    }

    public function testDeletionIsLogical(): void
    {
        $id = self::uuid();
        $this->sync([$this->saisie($id)]);

        $response = $this->sync([$this->saisie($id, ['supprime' => true, 'modifieLe' => '2026-11-27T10:30:00.000+01:00'])]);

        self::assertTrue($response->data['resultats'][0]['saisie']['supprime']);
        self::assertSame('2026-11-27 10:30:00.000', $this->db->query('SELECT supprime_le FROM saisie')->fetchColumn());
    }

    public function testResponsableCorrectionWinsOverAnOlderDeviceVersion(): void
    {
        $id = self::uuid();
        $majLe = $this->sync([$this->saisie($id)])->data['resultats'][0]['saisie']['majLe'];
        usleep(5000);
        $this->db->exec("UPDATE saisie SET quantite = 3, corrige_le = NOW(3), modifie_par_responsable = 'Paul'");

        // Modification faite sur le téléphone sans connaître la correction
        $response = $this->sync([$this->saisie($id, ['quantite' => 7, 'modifieLe' => '2026-11-27T11:00:00.000+01:00', 'baseMajLe' => $majLe])]);

        $resultat = $response->data['resultats'][0];
        self::assertSame('conflit', $resultat['statut']);
        self::assertSame(3, $resultat['saisie']['quantite']);
        self::assertSame('Paul', $resultat['saisie']['corrigeParResponsable']);

        // Une fois la correction reçue, le téléphone peut de nouveau modifier la saisie
        $response = $this->sync([$this->saisie($id, ['quantite' => 4, 'modifieLe' => '2026-11-27T11:05:00.000+01:00', 'baseMajLe' => $resultat['saisie']['majLe']])]);
        self::assertSame('ok', $response->data['resultats'][0]['statut']);
        self::assertSame(4, $response->data['resultats'][0]['saisie']['quantite']);
    }

    public function testSaisieOfAnotherDeviceIsRejected(): void
    {
        $id = self::uuid();
        $this->sync([$this->saisie($id)], appareil: self::AUTRE_APPAREIL);

        $response = $this->sync([$this->saisie($id, ['quantite' => 8, 'modifieLe' => '2026-11-27T12:00:00.000+01:00'])]);

        self::assertSame('rejete', $response->data['resultats'][0]['statut']);
        self::assertSame(2, (int) $this->db->query('SELECT quantite FROM saisie')->fetchColumn());
    }

    public function testInvalidSaisiesAreRejectedWithoutBlockingTheOthers(): void
    {
        $response = $this->sync([
            $this->saisie(self::uuid(), ['categorieId' => 9999]),
            $this->saisie(self::uuid(), ['categorieId' => $this->savon, 'contenanceUnitaire' => 100]),
            $this->saisie(self::uuid(), ['contenanceUnitaire' => 25001]),
            $this->saisie(self::uuid(), ['quantite' => 0]),
            $this->saisie(self::uuid(), ['saisieLe' => '2026-02-30T10:00:00+01:00']),
            $this->saisie(self::uuid(), ['magasinId' => 9999]),
            'pas un objet',
            $this->saisie(self::uuid(), ['categorieId' => $this->savon, 'contenanceUnitaire' => null]),
            $this->saisie(self::uuid(), ['contenanceUnitaire' => null]),
        ]);

        self::assertSame(
            ['rejete', 'rejete', 'rejete', 'rejete', 'rejete', 'rejete', 'rejete', 'ok', 'ok'],
            array_column($response->data['resultats'], 'statut'),
        );
        self::assertSame('Catégorie inconnue.', $response->data['resultats'][0]['erreur']);
        self::assertSame(2, $this->countSaisies());
    }

    public function testChangesSinceCursorAreSentBack(): void
    {
        $mine = self::uuid();
        $other = self::uuid();
        $this->sync([$this->saisie($mine)]);
        $this->sync([$this->saisie($other)], appareil: self::AUTRE_APPAREIL);

        // Restauration : sans curseur, toutes les saisies de l'appareil sont renvoyées
        $restore = $this->sync([]);
        self::assertSame([$mine], array_column($restore->data['changements'], 'id'));

        // Correction par un responsable : renvoyée au téléphone concerné uniquement
        $curseur = '2000-01-01 00:00:00.000';
        $this->db->exec("UPDATE saisie SET quantite = 6, corrige_le = NOW(3), modifie_par_responsable = 'Paul'");
        $changes = $this->sync([], curseur: $curseur)->data['changements'];
        self::assertCount(1, $changes);
        self::assertSame(6, $changes[0]['quantite']);

        // Un curseur récent n'inclut pas les modifications antérieures
        self::assertSame([], $this->sync([], curseur: '2999-01-01 00:00:00.000')->data['changements']);
    }

    public function testSentSaisiesAreNotRepeatedInChanges(): void
    {
        $response = $this->sync([$this->saisie(self::uuid())]);

        self::assertSame([], $response->data['changements']);
    }

    public function testPrenomIsUpdated(): void
    {
        $this->sync([]);
        $this->sync([], prenom: 'Marie-Claire');

        self::assertSame('Marie-Claire', $this->db->query('SELECT prenom FROM appareil')->fetchColumn());
    }

    public function testBatchSizeIsLimited(): void
    {
        $saisies = array_map(fn () => $this->saisie(self::uuid()), range(1, SyncController::MAX_SAISIES + 1));

        self::assertSame(422, $this->sync($saisies)->status);
    }

    public function testInvalidCursorIsRejected(): void
    {
        self::assertSame(422, $this->sync([], curseur: "2026-11-27' OR 1=1")->status);
    }

    /**
     * @param list<mixed> $saisies
     */
    private function sync(array $saisies, string $appareil = self::APPAREIL, string $prenom = 'Marie', ?string $curseur = null): JsonResponse
    {
        return $this->request(
            'POST',
            '/api/sync',
            ['prenom' => $prenom, 'curseur' => $curseur, 'saisies' => $saisies],
            ['X-Device-Id' => $appareil],
        );
    }

    /**
     * @param array<string, mixed> $overrides
     * @return array<string, mixed>
     */
    private function saisie(string $id, array $overrides = []): array
    {
        return array_merge([
            'id' => $id,
            'campagneId' => $this->campagne,
            'magasinId' => $this->magasin,
            'categorieId' => $this->pates,
            'quantite' => 2,
            'contenanceUnitaire' => 500,
            'saisieLe' => '2026-11-27T10:15:00+01:00',
            'modifieLe' => '2026-11-27T10:15:00.000+01:00',
            'supprime' => false,
            'baseMajLe' => null,
        ], $overrides);
    }

    private function countSaisies(): int
    {
        return (int) $this->db->query('SELECT COUNT(*) FROM saisie')->fetchColumn();
    }
}
