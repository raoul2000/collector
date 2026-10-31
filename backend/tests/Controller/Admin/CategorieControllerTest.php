<?php

declare(strict_types=1);

namespace App\Tests\Controller\Admin;

use App\Tests\ApiTestCase;

final class CategorieControllerTest extends ApiTestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->loginAsAdmin();
    }

    public function testCreateWithFormatsAndAutomaticOrder(): void
    {
        $this->insert('categorie', ['nom' => 'Riz', 'unite' => 'kg', 'ordre' => 40]);

        $response = $this->request('POST', '/api/admin/categories', [
            'nom' => 'Pâtes',
            'unite' => 'kg',
            'formats' => [500, 250, 1000],
            'codeReference' => '',
        ]);

        self::assertSame(201, $response->status);
        $formats = $response->data['formats'];
        self::assertSame(
            ['id' => $response->data['id'], 'nom' => 'Pâtes', 'sectionId' => null, 'unite' => 'kg', 'ordre' => 50, 'active' => true,
                'codeReference' => null, 'formats' => $formats, 'nbSaisies' => 0],
            $response->data,
        );
        // Contenances seules (forme antérieure aux variantes) : acceptées, sans libellé
        self::assertSame([500, 250, 1000], array_column($formats, 'contenance'));
        self::assertSame([null, null, null], array_column($formats, 'libelle'));
    }

    public function testUnitCategoryHasNoFormats(): void
    {
        $refused = $this->request('POST', '/api/admin/categories', ['nom' => 'Savon', 'unite' => 'unite', 'formats' => [100]]);
        self::assertSame(422, $refused->status);
        self::assertArrayHasKey('formats', $refused->data['error']['details']['fields']);

        $accepted = $this->request('POST', '/api/admin/categories', ['nom' => 'Savon', 'unite' => 'unite', 'formats' => []]);
        self::assertSame(201, $accepted->status);
    }

    public function testFormatBoundsDependOnUnit(): void
    {
        self::assertSame(201, $this->request('POST', '/api/admin/categories', ['nom' => 'Sucre', 'unite' => 'kg', 'formats' => [25000]])->status);
        self::assertSame(422, $this->request('POST', '/api/admin/categories', ['nom' => 'Farine', 'unite' => 'kg', 'formats' => [25001]])->status);
        self::assertSame(422, $this->request('POST', '/api/admin/categories', ['nom' => 'Huile', 'unite' => 'L', 'formats' => [10001]])->status);
        self::assertSame(422, $this->request('POST', '/api/admin/categories', ['nom' => 'Lait', 'unite' => 'L', 'formats' => range(100, 900, 100)])->status);
    }

    public function testDuplicatesAreRejected(): void
    {
        $this->insert('categorie', ['nom' => 'Pâtes', 'unite' => 'kg', 'code_reference' => 'CR-01']);

        $response = $this->request('POST', '/api/admin/categories', ['nom' => 'Pâtes', 'unite' => 'kg', 'codeReference' => 'CR-01']);

        self::assertSame(422, $response->status);
        self::assertSame(['nom', 'codeReference'], array_keys($response->data['error']['details']['fields']));
    }

    public function testUpdateReplacesFormatsAndKeepsOrder(): void
    {
        $id = $this->insert('categorie', ['nom' => 'Pâtes', 'unite' => 'kg', 'ordre' => 30]);
        $this->insert('format', ['categorie_id' => $id, 'contenance' => 250]);

        $response = $this->request('PUT', "/api/admin/categories/{$id}", [
            'nom' => 'Pâtes',
            'unite' => 'kg',
            'formats' => [1000, 500],
            'active' => false,
        ]);

        self::assertSame(200, $response->status);
        self::assertSame([1000, 500], array_column($response->data['formats'], 'contenance'));
        self::assertSame(30, $response->data['ordre']);
        self::assertFalse($response->data['active']);
    }

    public function testUnitCannotChangeOnceSaisiesExist(): void
    {
        $id = $this->insert('categorie', ['nom' => 'Huile', 'unite' => 'kg']);
        $campagne = $this->insert('campagne', ['nom' => 'C', 'date_debut' => '2026-11-27', 'date_fin' => '2026-11-28']);
        $this->insertSaisie($campagne, $this->insert('magasin', ['nom' => 'Lidl']), $id);

        $response = $this->request('PUT', "/api/admin/categories/{$id}", ['nom' => 'Huile', 'unite' => 'L']);

        self::assertSame(422, $response->status);
        self::assertArrayHasKey('unite', $response->data['error']['details']['fields']);
        self::assertSame(409, $this->request('DELETE', "/api/admin/categories/{$id}")->status);
    }

    public function testReorder(): void
    {
        $a = $this->insert('categorie', ['nom' => 'A', 'unite' => 'kg', 'ordre' => 10]);
        $b = $this->insert('categorie', ['nom' => 'B', 'unite' => 'kg', 'ordre' => 20]);
        $c = $this->insert('categorie', ['nom' => 'C', 'unite' => 'kg', 'ordre' => 30]);

        $response = $this->request('PUT', '/api/admin/categories/ordre', ['ids' => [$c, $a, $b]]);

        self::assertSame(200, $response->status);
        self::assertSame(['C', 'A', 'B'], array_column($response->data, 'nom'));
        self::assertSame([10, 20, 30], array_column($response->data, 'ordre'));
    }

    public function testReorderRequiresEveryCategory(): void
    {
        $a = $this->insert('categorie', ['nom' => 'A', 'unite' => 'kg']);
        $this->insert('categorie', ['nom' => 'B', 'unite' => 'kg']);

        self::assertSame(422, $this->request('PUT', '/api/admin/categories/ordre', ['ids' => [$a]])->status);
        self::assertSame(422, $this->request('PUT', '/api/admin/categories/ordre', ['ids' => [$a, $a]])->status);
    }

    public function testVariantsWithLabels(): void
    {
        $huile = $this->request('POST', '/api/admin/categories', ['nom' => 'Huile', 'unite' => 'L', 'formats' => [
            ['contenance' => 1000, 'libelle' => ' Olive / colza '],
            ['contenance' => 1000, 'libelle' => 'Tournesol, autres'],
            ['contenance' => 500, 'libelle' => ''],
        ]]);
        self::assertSame(201, $huile->status);
        self::assertSame(
            [[1000, 'Olive / colza'], [1000, 'Tournesol, autres'], [500, null]],
            array_map(static fn (array $f): array => [$f['contenance'], $f['libelle']], $huile->data['formats']),
        );

        $couches = $this->request('POST', '/api/admin/categories', ['nom' => 'Couches', 'unite' => 'unite', 'formats' => [
            ['libelle' => 'T3'], ['libelle' => 'T4'],
        ]]);
        self::assertSame(201, $couches->status);
        self::assertSame([null, null], array_column($couches->data['formats'], 'contenance'));

        $refus = [
            ['unite' => 'unite', 'formats' => [['libelle' => 'T3', 'contenance' => 100]]],
            ['unite' => 'unite', 'formats' => [['libelle' => '']]],
            ['unite' => 'kg', 'formats' => [['libelle' => 'Sachet']]],
            ['unite' => 'kg', 'formats' => [['contenance' => 500, 'libelle' => str_repeat('x', 41)]]],
            ['unite' => 'L', 'formats' => [['contenance' => 1000, 'libelle' => 'Olive'], ['contenance' => 1000, 'libelle' => 'olive']]],
            ['unite' => 'kg', 'formats' => ['500 g']],
            ['unite' => 'kg', 'formats' => [['id' => 999, 'contenance' => 500]]],
        ];
        foreach ($refus as $index => $donnees) {
            $response = $this->request('POST', '/api/admin/categories', ['nom' => "Refus {$index}"] + $donnees);
            self::assertSame(422, $response->status, "Cas {$index}");
            self::assertArrayHasKey('formats', $response->data['error']['details']['fields']);
        }
    }

    public function testFormatsKeepTheirIdWhenUpdated(): void
    {
        $huile = $this->request('POST', '/api/admin/categories', ['nom' => 'Huile', 'unite' => 'L', 'formats' => [
            ['contenance' => 1000, 'libelle' => 'Olive'],
            ['contenance' => 500],
        ]])->data;
        [$olive, $petit] = array_column($huile['formats'], 'id');
        $autre = $this->insert('categorie', ['nom' => 'Riz', 'unite' => 'kg']);
        $formatAutre = $this->insert('format', ['categorie_id' => $autre, 'contenance' => 500]);

        // Format d'une autre catégorie : refusé
        $refus = $this->request('PUT', "/api/admin/categories/{$huile['id']}", ['nom' => 'Huile', 'unite' => 'L', 'formats' => [['id' => $formatAutre, 'contenance' => 500]]]);
        self::assertSame(422, $refus->status);

        $response = $this->request('PUT', "/api/admin/categories/{$huile['id']}", ['nom' => 'Huile', 'unite' => 'L', 'formats' => [
            ['contenance' => 750],
            ['id' => $olive, 'contenance' => 1000, 'libelle' => 'Olive / colza'],
        ]]);

        self::assertSame(200, $response->status);
        $formats = $response->data['formats'];
        self::assertSame([null, 'Olive / colza'], array_column($formats, 'libelle'));
        self::assertSame($olive, $formats[1]['id'], 'Format modifié sur place');
        self::assertNotContains($petit, array_column($formats, 'id'), 'Format retiré supprimé');
    }

    public function testSectionIsCheckedKeptWhenAbsentAndOrdersTheList(): void
    {
        $conserves = $this->insert('section', ['nom' => 'Conserves', 'ordre' => 20]);
        $epicerie = $this->insert('section', ['nom' => 'Épicerie', 'ordre' => 10]);
        $this->insert('categorie', ['nom' => 'Autre', 'unite' => 'unite', 'ordre' => 1]);
        $this->insert('categorie', ['nom' => 'Poisson', 'section_id' => $conserves, 'unite' => 'kg', 'ordre' => 5]);
        $this->insert('categorie', ['nom' => 'Riz', 'section_id' => $epicerie, 'unite' => 'kg', 'ordre' => 30]);

        $refused = $this->request('POST', '/api/admin/categories', ['nom' => 'Pâtes', 'unite' => 'kg', 'sectionId' => 999]);
        self::assertSame(422, $refused->status);
        self::assertArrayHasKey('sectionId', $refused->data['error']['details']['fields']);

        $created = $this->request('POST', '/api/admin/categories', ['nom' => 'Pâtes', 'unite' => 'kg', 'sectionId' => $epicerie]);
        self::assertSame(201, $created->status);
        self::assertSame($epicerie, $created->data['sectionId']);

        // Ordre : sections (Épicerie, Conserves), puis catégories ; sans section à la fin
        self::assertSame(['Riz', 'Pâtes', 'Poisson', 'Autre'], array_column(self::json($this->request('GET', '/api/admin/categories')), 'nom'));

        $id = $created->data['id'];
        $kept = $this->request('PUT', "/api/admin/categories/{$id}", ['nom' => 'Pâtes', 'unite' => 'kg']);
        self::assertSame($epicerie, $kept->data['sectionId']);
        $removed = $this->request('PUT', "/api/admin/categories/{$id}", ['nom' => 'Pâtes', 'unite' => 'kg', 'sectionId' => null]);
        self::assertNull($removed->data['sectionId']);
    }

    public function testDeleteRemovesFormats(): void
    {
        $id = $this->insert('categorie', ['nom' => 'Pâtes', 'unite' => 'kg']);
        $this->insert('format', ['categorie_id' => $id, 'contenance' => 500]);

        self::assertSame(204, $this->request('DELETE', "/api/admin/categories/{$id}")->status);
        self::assertSame(0, (int) $this->db->query('SELECT COUNT(*) FROM format')->fetchColumn());
    }
}
