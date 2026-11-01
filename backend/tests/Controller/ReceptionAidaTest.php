<?php

declare(strict_types=1);

namespace App\Tests\Controller;

use App\Tests\ApiTestCase;

final class ReceptionAidaTest extends ApiTestCase
{
    private int $campagne;
    private int $lidl;
    private int $auchan;
    private int $pates;
    private int $format500;
    private int $format1000;

    protected function setUp(): void
    {
        parent::setUp();
        $this->campagne = $this->insert('campagne', ['nom' => 'C', 'date_debut' => '2026-11-27', 'date_fin' => '2026-11-28', 'active' => 1]);
        $this->lidl = $this->insert('magasin', ['nom' => 'Lidl']);
        $this->auchan = $this->insert('magasin', ['nom' => 'Auchan']);
        $this->pates = $this->insert('categorie', ['nom' => 'Pâtes', 'unite' => 'kg', 'ordre' => 10]);
        $this->format500 = $this->insert('format', ['categorie_id' => $this->pates, 'contenance' => 500, 'code_aida' => 'P500', 'ordre' => 1]);
        $this->format1000 = $this->insert('format', ['categorie_id' => $this->pates, 'contenance' => 1000, 'code_aida' => 'P1000', 'ordre' => 2]);
    }

    public function testRequiresAnAdminSession(): void
    {
        self::assertSame(401, $this->request('GET', '/api/admin/bilans/aida')->status);
    }

    public function testButtonFreeAndUnknownContents(): void
    {
        $this->loginAsAdmin();
        $saisie = fn (int $quantite, ?int $contenance, ?int $format = null, array $extra = []) => $this->insertSaisie(
            $this->campagne,
            $this->lidl,
            $this->pates,
            ['quantite' => $quantite, 'contenance_unitaire' => $contenance, 'format_id' => $format, ...$extra],
        );
        $saisie(2, 500, $this->format500);
        $saisie(3, 500); // contenance libre, exactement celle d'un format : fiable
        $saisie(5, 900); // format le plus proche : 1 kg, à vérifier
        $saisie(7, 750); // à égale distance : le plus petit, à vérifier
        $saisie(11, null); // contenance inconnue : premier bouton, à vérifier
        $saisie(100, 500, $this->format500, ['supprime_le' => '2026-11-27 13:00:00.000']);

        $data = $this->request('GET', '/api/admin/bilans/aida')->data;

        self::assertSame([
            ['code' => 'P500', 'libelles' => ['Pâtes 500 g'], 'nbArticles' => 23, 'aVerifier' => 18],
            ['code' => 'P1000', 'libelles' => ['Pâtes 1 kg'], 'nbArticles' => 5, 'aVerifier' => 5],
        ], $data['articles']);
        self::assertSame(['nbArticles' => 28, 'aVerifier' => 23, 'nonRapproches' => 0], $data['totaux']);
    }

    public function testCategoryCodeAndUnmatchedEntries(): void
    {
        $this->loginAsAdmin();
        $savon = $this->insert('categorie', ['nom' => 'Hygiène', 'unite' => 'unite', 'ordre' => 20, 'code_reference' => 'HYG']);
        $autre = $this->insert('categorie', ['nom' => 'Autre', 'unite' => 'unite', 'ordre' => 30]);
        $this->insertSaisie($this->campagne, $this->lidl, $savon, ['quantite' => 4, 'contenance_unitaire' => null]);
        $this->insertSaisie($this->campagne, $this->lidl, $autre, ['quantite' => 6, 'contenance_unitaire' => null]);

        $data = $this->request('GET', '/api/admin/bilans/aida')->data;

        self::assertSame([['code' => 'HYG', 'libelles' => ['Hygiène'], 'nbArticles' => 4, 'aVerifier' => 0]], $data['articles']);
        self::assertSame([['categorieId' => $autre, 'nom' => 'Autre', 'nbArticles' => 6, 'nbSaisies' => 1]], $data['nonRapprochees']);
        self::assertSame(['nbArticles' => 10, 'aVerifier' => 0, 'nonRapproches' => 6], $data['totaux']);
    }

    public function testButtonsSharingACodeAreMergedInOneLine(): void
    {
        $this->loginAsAdmin();
        $eau = $this->insert('categorie', ['nom' => 'Eau', 'unite' => 'L', 'ordre' => 5]);
        $petite = $this->insert('format', ['categorie_id' => $eau, 'contenance' => 500, 'code_aida' => 'EAU', 'ordre' => 1]);
        $grande = $this->insert('format', ['categorie_id' => $eau, 'contenance' => 1500, 'code_aida' => 'EAU', 'ordre' => 2]);
        $this->insertSaisie($this->campagne, $this->lidl, $eau, ['quantite' => 1, 'contenance_unitaire' => 1500, 'format_id' => $grande]);
        $this->insertSaisie($this->campagne, $this->lidl, $eau, ['quantite' => 2, 'contenance_unitaire' => 500, 'format_id' => $petite]);

        $data = $this->request('GET', '/api/admin/bilans/aida')->data;

        self::assertSame([['code' => 'EAU', 'libelles' => ['Eau 50 cl', 'Eau 1,5 L'], 'nbArticles' => 3, 'aVerifier' => 0]], $data['articles']);
    }

    public function testFiltersByCampaignAndStore(): void
    {
        $this->loginAsAdmin();
        $ancienne = $this->insert('campagne', ['nom' => 'Ancienne', 'date_debut' => '2025-11-28', 'date_fin' => '2025-11-29']);
        $this->insertSaisie($this->campagne, $this->lidl, $this->pates, ['quantite' => 2, 'format_id' => $this->format500]);
        $this->insertSaisie($this->campagne, $this->auchan, $this->pates, ['quantite' => 3, 'format_id' => $this->format500]);
        $this->insertSaisie($ancienne, $this->lidl, $this->pates, ['quantite' => 9, 'format_id' => $this->format500]);

        $auchan = $this->request('GET', '/api/admin/bilans/aida', query: ['magasin' => (string) $this->auchan])->data;
        self::assertSame(3, $auchan['totaux']['nbArticles']);
        self::assertSame($this->auchan, $auchan['magasinId']);

        $passee = $this->request('GET', '/api/admin/bilans/aida', query: ['campagne' => (string) $ancienne])->data;
        self::assertSame(9, $passee['totaux']['nbArticles']);
    }

    public function testCodesAreManagedByCategoryButNotSentToPhones(): void
    {
        $this->loginAsAdmin();
        $url = '/api/admin/categories/' . $this->pates;
        $base = ['nom' => 'Pâtes', 'unite' => 'kg'];

        $modifiee = $this->request('PUT', $url, [...$base, 'formats' => [
            ['id' => $this->format500, 'contenance' => 500, 'codeAida' => ' NOUVEAU '],
            ['id' => $this->format1000, 'contenance' => 1000, 'codeAida' => ''],
        ]])->data;
        self::assertSame(['NOUVEAU', null], array_column($modifiee['formats'], 'codeAida'));

        // Version antérieure de l'espace responsable, sans le champ : code conservé
        $conservee = $this->request('PUT', $url, [...$base, 'formats' => [['id' => $this->format500, 'contenance' => 500]]])->data;
        self::assertSame(['NOUVEAU'], array_column($conservee['formats'], 'codeAida'));

        self::assertSame(422, $this->request('PUT', $url, [...$base, 'formats' => [
            ['id' => $this->format500, 'contenance' => 500, 'codeAida' => str_repeat('x', 51)],
        ]])->status);

        $bouton = $this->request('GET', '/api/referentiel')->data['categories'][0]['boutons'][0];
        self::assertSame(['id', 'contenance', 'libelle'], array_keys($bouton));
    }
}
