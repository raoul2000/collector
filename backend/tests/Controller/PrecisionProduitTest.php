<?php

declare(strict_types=1);

namespace App\Tests\Controller;

use App\Tests\ApiTestCase;

final class PrecisionProduitTest extends ApiTestCase
{
    private const string APPAREIL = 'a1a1a1a1-0000-4000-8000-000000000001';
    private const string SAISIE = 'c1c1c1c1-0000-4000-8000-000000000001';

    private int $campagne;
    private int $magasin;
    private int $autre;
    private int $riz;

    protected function setUp(): void
    {
        parent::setUp();
        $this->campagne = $this->insert('campagne', ['nom' => 'C', 'date_debut' => '2026-11-27', 'date_fin' => '2026-11-28', 'active' => 1]);
        $this->magasin = $this->insert('magasin', ['nom' => 'Lidl']);
        $this->insert('campagne_magasin', ['campagne_id' => $this->campagne, 'magasin_id' => $this->magasin]);
        $this->autre = $this->insert('categorie', ['nom' => 'Autre', 'unite' => 'unite', 'precision_requise' => 1]);
        $this->riz = $this->insert('categorie', ['nom' => 'Riz', 'unite' => 'kg']);
    }

    /**
     * @param array<string, mixed> $champs
     * @return array<string, mixed> résultat de l'envoi
     */
    private function envoyer(array $champs, string $modifieLe = '2026-11-27T10:00:00.000+01:00'): array
    {
        $response = $this->request('POST', '/api/sync', [
            'prenom' => 'Marie',
            'saisies' => [[
                'id' => self::SAISIE,
                'campagneId' => $this->campagne,
                'magasinId' => $this->magasin,
                'categorieId' => $this->autre,
                'quantite' => 1,
                'contenanceUnitaire' => null,
                'formatId' => null,
                'saisieLe' => '2026-11-27T10:00:00+01:00',
                'modifieLe' => $modifieLe,
                'supprime' => false,
                'baseMajLe' => null,
                ...$champs,
            ]],
        ], headers: ['X-Device-Id' => self::APPAREIL]);
        self::assertSame(200, $response->status);

        return $response->data['resultats'][0];
    }

    public function testCategoryOptionIsSentToPhones(): void
    {
        $categories = $this->request('GET', '/api/referentiel')->data['categories'];
        self::assertSame(
            [true, false],
            array_column(array_map(static fn (array $c): array => ['nom' => $c['nom'], 'p' => $c['precisionRequise']], $categories), 'p'),
        );
    }

    public function testCategoryOptionCanBeChangedAndIsKeptWhenAbsent(): void
    {
        $this->loginAsAdmin();
        $url = '/api/admin/categories/' . $this->riz;
        self::assertTrue($this->request('PUT', $url, ['nom' => 'Riz', 'unite' => 'kg', 'precisionRequise' => true])->data['precisionRequise']);
        self::assertTrue($this->request('PUT', $url, ['nom' => 'Riz', 'unite' => 'kg'])->data['precisionRequise']);
        self::assertFalse($this->request('PUT', $url, ['nom' => 'Riz', 'unite' => 'kg', 'precisionRequise' => false])->data['precisionRequise']);
    }

    public function testTextIsStoredTrimmedAndCut(): void
    {
        $resultat = $this->envoyer(['precisionProduit' => '  couscous en boîte ']);
        self::assertSame('ok', $resultat['statut']);
        self::assertSame('couscous en boîte', $resultat['saisie']['precisionProduit']);

        $long = $this->envoyer(['precisionProduit' => str_repeat('é', 150)], '2026-11-27T10:01:00.000+01:00');
        self::assertSame(str_repeat('é', 100), $long['saisie']['precisionProduit']);
    }

    public function testPhoneNotYetUpdatedIsNotRefusedAndKeepsExistingText(): void
    {
        $sans = $this->envoyer([]);
        self::assertSame('ok', $sans['statut']);
        self::assertNull($sans['saisie']['precisionProduit']);

        $this->envoyer(['precisionProduit' => 'couscous'], '2026-11-27T10:01:00.000+01:00');
        $apres = $this->envoyer(['precisionProduit' => null, 'quantite' => 2], '2026-11-27T10:02:00.000+01:00');
        self::assertSame(2, $apres['saisie']['quantite']);
        self::assertSame('couscous', $apres['saisie']['precisionProduit']);

        // Type inattendu : ignoré, sans refus
        self::assertSame('ok', $this->envoyer(['precisionProduit' => 12], '2026-11-27T10:03:00.000+01:00')['statut']);
    }

    public function testTextSurvivesACorrectionAndIsShownToResponsables(): void
    {
        $this->envoyer(['precisionProduit' => 'couscous']);
        $this->loginAsAdmin();

        $corrigee = $this->request('PUT', '/api/admin/saisies/' . self::SAISIE, [
            'categorieId' => $this->riz,
            'quantite' => 1,
            'contenanceUnitaire' => 500,
        ])->data;
        self::assertSame('Riz', $corrigee['categorieNom']);
        self::assertSame('couscous', $corrigee['precisionProduit']);

        self::assertSame('couscous', $this->request('GET', '/api/admin/saisies')->data['saisies'][0]['precisionProduit']);
        $export = $this->request('GET', '/api/admin/saisies/export', query: ['campagne' => (string) $this->campagne])->data;
        self::assertSame('couscous', $export['saisies'][0]['precisionProduit']);
    }
}
