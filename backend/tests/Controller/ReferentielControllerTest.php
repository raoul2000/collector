<?php

declare(strict_types=1);

namespace App\Tests\Controller;

use App\Tests\ApiTestCase;

final class ReferentielControllerTest extends ApiTestCase
{
    public function testWithoutActiveCampaign(): void
    {
        $this->insert('campagne', ['nom' => 'Ancienne', 'date_debut' => '2025-11-28', 'date_fin' => '2025-11-29']);
        $this->insert('categorie', ['nom' => 'Pâtes', 'unite' => 'kg']);

        $data = self::json($this->request('GET', '/api/referentiel'));

        self::assertNull($data['campagne']);
        self::assertSame([], $data['magasins']);
        self::assertCount(1, $data['categories']);
    }

    public function testReturnsActiveCampaignStoresAndCategories(): void
    {
        $active = $this->insert('campagne', [
            'nom' => 'Collecte 2026', 'date_debut' => '2026-11-27', 'date_fin' => '2026-11-28', 'active' => 1,
        ]);
        $ancienne = $this->insert('campagne', ['nom' => 'Collecte 2025', 'date_debut' => '2025-11-28', 'date_fin' => '2025-11-29']);

        $lidl = $this->insert('magasin', ['nom' => 'Lidl', 'ville' => 'Nord']);
        $auchan = $this->insert('magasin', ['nom' => 'Auchan']);
        $ferme = $this->insert('magasin', ['nom' => 'Casino', 'actif' => 0]);
        $autre = $this->insert('magasin', ['nom' => 'Monoprix']);
        foreach ([$lidl, $auchan, $ferme] as $magasin) {
            $this->insert('campagne_magasin', ['campagne_id' => $active, 'magasin_id' => $magasin]);
        }
        $this->insert('campagne_magasin', ['campagne_id' => $ancienne, 'magasin_id' => $autre]);

        $huile = $this->insert('categorie', ['nom' => 'Huile', 'unite' => 'L', 'ordre' => 20]);
        $pates = $this->insert('categorie', ['nom' => 'Pâtes', 'unite' => 'kg', 'ordre' => 10]);
        $savon = $this->insert('categorie', ['nom' => 'Savon', 'unite' => 'unite', 'ordre' => 30]);
        $this->insert('categorie', ['nom' => 'Ancienne', 'unite' => 'kg', 'ordre' => 5, 'active' => 0]);
        $this->insert('format', ['categorie_id' => $pates, 'contenance' => 1000, 'ordre' => 3]);
        $this->insert('format', ['categorie_id' => $pates, 'contenance' => 250, 'ordre' => 1]);
        $this->insert('format', ['categorie_id' => $pates, 'contenance' => 500, 'ordre' => 2]);
        $this->insert('format', ['categorie_id' => $huile, 'contenance' => 1000, 'ordre' => 1]);

        $response = $this->request('GET', '/api/referentiel');
        $data = self::json($response);

        self::assertSame(200, $response->status);
        self::assertSame(
            ['id' => $active, 'nom' => 'Collecte 2026', 'dateDebut' => '2026-11-27', 'dateFin' => '2026-11-28', 'active' => true],
            $data['campagne'],
        );
        self::assertSame(
            [
                ['id' => $auchan, 'nom' => 'Auchan', 'ville' => ''],
                ['id' => $lidl, 'nom' => 'Lidl', 'ville' => 'Nord'],
            ],
            $data['magasins'],
        );
        self::assertSame(
            [
                ['id' => $pates, 'nom' => 'Pâtes', 'sectionId' => null, 'unite' => 'kg', 'formats' => [250, 500, 1000]],
                ['id' => $huile, 'nom' => 'Huile', 'sectionId' => null, 'unite' => 'L', 'formats' => [1000]],
                ['id' => $savon, 'nom' => 'Savon', 'sectionId' => null, 'unite' => 'unite', 'formats' => []],
            ],
            $data['categories'],
        );
        self::assertSame([], $data['sections']);
        self::assertMatchesRegularExpression('/^[0-9a-f]{16}$/', $data['version']);
    }

    public function testCategoriesAreGroupedBySection(): void
    {
        $hygiene = $this->insert('section', ['nom' => 'Hygiène', 'ordre' => 20]);
        $epicerie = $this->insert('section', ['nom' => 'Épicerie', 'ordre' => 10]);
        $this->insert('section', ['nom' => 'Vide', 'ordre' => 30]);
        $inactive = $this->insert('section', ['nom' => 'Inactive', 'ordre' => 40]);
        $savon = $this->insert('categorie', ['nom' => 'Savon', 'section_id' => $hygiene, 'unite' => 'unite', 'ordre' => 1]);
        $autre = $this->insert('categorie', ['nom' => 'Autre', 'unite' => 'unite', 'ordre' => 0]);
        $riz = $this->insert('categorie', ['nom' => 'Riz', 'section_id' => $epicerie, 'unite' => 'kg', 'ordre' => 50]);
        $this->insert('categorie', ['nom' => 'Ancienne', 'section_id' => $inactive, 'unite' => 'kg', 'active' => 0]);

        $data = self::json($this->request('GET', '/api/referentiel'));

        // Sections sans catégorie active omises ; catégories sans section en dernier
        self::assertSame([['id' => $epicerie, 'nom' => 'Épicerie'], ['id' => $hygiene, 'nom' => 'Hygiène']], $data['sections']);
        self::assertSame([$riz, $savon, $autre], array_column($data['categories'], 'id'));
        self::assertSame([$epicerie, $hygiene, null], array_column($data['categories'], 'sectionId'));
    }

    public function testVersionChangesWhenContentChanges(): void
    {
        $this->insert('categorie', ['nom' => 'Pâtes', 'unite' => 'kg']);
        $before = self::json($this->request('GET', '/api/referentiel'))['version'];

        self::assertSame($before, self::json($this->request('GET', '/api/referentiel'))['version']);

        $this->insert('categorie', ['nom' => 'Riz', 'unite' => 'kg']);
        self::assertNotSame($before, self::json($this->request('GET', '/api/referentiel'))['version']);
    }
}
