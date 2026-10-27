<?php

declare(strict_types=1);

namespace App\Tests\Controller;

use App\Tests\ApiTestCase;

final class BilanControllerTest extends ApiTestCase
{
    private int $campagne;
    private int $lidl;
    private int $auchan;
    private int $casino;
    private int $pates;
    private int $huile;
    private int $savon;

    protected function setUp(): void
    {
        parent::setUp();
        $this->campagne = $this->insert('campagne', ['nom' => 'C', 'date_debut' => '2026-11-27', 'date_fin' => '2026-11-28', 'active' => 1]);
        $autre = $this->insert('campagne', ['nom' => 'Ancienne', 'date_debut' => '2025-11-28', 'date_fin' => '2025-11-29']);
        $this->lidl = $this->insert('magasin', ['nom' => 'Lidl']);
        $this->auchan = $this->insert('magasin', ['nom' => 'Auchan']);
        $this->casino = $this->insert('magasin', ['nom' => 'Casino']);
        foreach ([$this->lidl, $this->auchan, $this->casino] as $magasin) {
            $this->insert('campagne_magasin', ['campagne_id' => $this->campagne, 'magasin_id' => $magasin]);
        }
        $this->pates = $this->insert('categorie', ['nom' => 'Pâtes', 'unite' => 'kg', 'ordre' => 10]);
        $this->huile = $this->insert('categorie', ['nom' => 'Huile', 'unite' => 'L', 'ordre' => 20]);
        $this->savon = $this->insert('categorie', ['nom' => 'Savon', 'unite' => 'unite', 'ordre' => 30]);

        $saisie = fn (int $magasin, int $categorie, int $quantite, ?int $contenance, string $le, array $extra = [], ?int $campagne = null) =>
            $this->insertSaisie($campagne ?? $this->campagne, $magasin, $categorie, array_merge(
                ['quantite' => $quantite, 'contenance_unitaire' => $contenance, 'saisie_le' => $le],
                $extra,
            ));

        $saisie($this->lidl, $this->pates, 2, 500, '2026-11-27 10:15:00');
        $saisie($this->lidl, $this->pates, 3, 1000, '2026-11-27 10:45:00');
        $saisie($this->lidl, $this->pates, 1, null, '2026-11-27 11:10:00');
        $saisie($this->lidl, $this->huile, 2, 1000, '2026-11-27 11:20:00');
        $saisie($this->lidl, $this->savon, 4, null, '2026-11-28 09:05:00');
        $saisie($this->auchan, $this->huile, 1, 500, '2026-11-27 10:30:00');
        // Exclues : saisie supprimée, autre campagne
        $saisie($this->lidl, $this->pates, 5, 500, '2026-11-27 10:20:00', ['supprime_le' => '2026-11-27 10:21:00.000']);
        $saisie($this->lidl, $this->pates, 9, 500, '2025-11-28 10:00:00', [], $autre);
    }

    public function testAdminRequiresSession(): void
    {
        self::assertSame(401, $this->request('GET', '/api/admin/bilans')->status);
    }

    public function testAdminBilanForOneStore(): void
    {
        $this->loginAsAdmin();

        $data = $this->request('GET', '/api/admin/bilans', query: ['magasin' => (string) $this->lidl])->data;

        self::assertSame(['id' => $this->campagne, 'nom' => 'C', 'dateDebut' => '2026-11-27', 'dateFin' => '2026-11-28'], $data['campagne']);
        self::assertSame($this->lidl, $data['magasinId']);
        self::assertSame(
            ['nbSaisies' => 5, 'nbArticles' => 12, 'grammes' => 4000, 'millilitres' => 2000, 'sansContenance' => 1],
            $data['totaux'],
        );
        self::assertSame(
            [
                ['categorieId' => $this->pates, 'nom' => 'Pâtes', 'unite' => 'kg', 'nbSaisies' => 3, 'nbArticles' => 6, 'contenance' => 4000, 'sansContenance' => 1],
                ['categorieId' => $this->huile, 'nom' => 'Huile', 'unite' => 'L', 'nbSaisies' => 1, 'nbArticles' => 2, 'contenance' => 2000, 'sansContenance' => 0],
                ['categorieId' => $this->savon, 'nom' => 'Savon', 'unite' => 'unite', 'nbSaisies' => 1, 'nbArticles' => 4, 'contenance' => null, 'sansContenance' => 0],
            ],
            $data['categories'],
        );
    }

    public function testAdminBilanForAllStores(): void
    {
        $this->loginAsAdmin();

        $data = $this->request('GET', '/api/admin/bilans')->data;

        self::assertNull($data['magasinId']);
        self::assertSame(
            ['nbSaisies' => 6, 'nbArticles' => 13, 'grammes' => 4000, 'millilitres' => 2500, 'sansContenance' => 1],
            $data['totaux'],
        );
        self::assertSame(
            [
                ['jour' => '2026-11-27', 'heure' => 10, 'nbSaisies' => 3, 'nbArticles' => 6, 'grammes' => 4000, 'millilitres' => 500],
                ['jour' => '2026-11-27', 'heure' => 11, 'nbSaisies' => 2, 'nbArticles' => 3, 'grammes' => 0, 'millilitres' => 2000],
                ['jour' => '2026-11-28', 'heure' => 9, 'nbSaisies' => 1, 'nbArticles' => 4, 'grammes' => 0, 'millilitres' => 0],
            ],
            $data['heures'],
        );
        self::assertSame(
            [[$this->lidl, 12, 4000, 2000], [$this->auchan, 1, 0, 500], [$this->casino, 0, 0, 0]],
            array_map(static fn (array $m): array => [$m['magasinId'], $m['nbArticles'], $m['grammes'], $m['millilitres']], $data['magasins']),
        );
    }

    public function testAdminBilanOfAnotherCampaign(): void
    {
        $this->loginAsAdmin();
        $id = (int) $this->db->query("SELECT id FROM campagne WHERE nom = 'Ancienne'")->fetchColumn();

        $data = $this->request('GET', '/api/admin/bilans', query: ['campagne' => (string) $id])->data;

        self::assertSame(9, $data['totaux']['nbArticles']);
        self::assertSame([], $data['magasins'], 'Aucun magasin rattaché à cette campagne');
    }

    public function testAdminErrors(): void
    {
        $this->loginAsAdmin();

        self::assertSame(404, $this->request('GET', '/api/admin/bilans', query: ['campagne' => '99999'])->status);
        self::assertSame(400, $this->request('GET', '/api/admin/bilans', query: ['magasin' => 'abc'])->status);

        $this->db->exec('UPDATE campagne SET active = 0');
        self::assertSame(404, $this->request('GET', '/api/admin/bilans')->status);
    }

    public function testPublicBilanForVolunteers(): void
    {
        $data = $this->request('GET', '/api/bilans', query: ['magasin' => (string) $this->auchan])->data;

        self::assertSame('C', $data['campagne']['nom']);
        self::assertSame(
            ['nbSaisies' => 1, 'nbArticles' => 1, 'grammes' => 0, 'millilitres' => 500, 'sansContenance' => 0],
            $data['magasin']['totaux'],
        );
        self::assertSame(['Huile'], array_column($data['magasin']['categories'], 'nom'));
        self::assertSame(13, $data['general']['nbArticles']);
        self::assertSame(['Lidl', 'Auchan', 'Casino'], array_column($data['classement'], 'nom'));
        self::assertStringNotContainsString('Marie', $this->request('GET', '/api/bilans')->body(), 'Aucun prénom dans le bilan public');
    }

    public function testPublicBilanIgnoresStoresOutsideTheCampaign(): void
    {
        $horsCampagne = $this->insert('magasin', ['nom' => 'Monoprix']);

        self::assertNull($this->request('GET', '/api/bilans', query: ['magasin' => (string) $horsCampagne])->data['magasin']);
    }

    public function testPublicBilanWithoutActiveCampaign(): void
    {
        $this->db->exec('UPDATE campagne SET active = 0');

        self::assertSame(['campagne' => null], $this->request('GET', '/api/bilans')->data);
    }
}
