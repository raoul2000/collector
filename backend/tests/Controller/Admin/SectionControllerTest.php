<?php

declare(strict_types=1);

namespace App\Tests\Controller\Admin;

use App\Tests\ApiTestCase;

final class SectionControllerTest extends ApiTestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->loginAsAdmin();
    }

    public function testRoutesRequireAnAdminSession(): void
    {
        $this->cookies = [];

        self::assertSame(401, $this->request('GET', '/api/admin/sections')->status);
    }

    public function testCreateListAndRename(): void
    {
        $this->insert('section', ['nom' => 'Conserves', 'ordre' => 40]);

        $created = $this->request('POST', '/api/admin/sections', ['nom' => '  Boissons ']);
        self::assertSame(201, $created->status);
        self::assertSame(['id' => $created->data['id'], 'nom' => 'Boissons', 'ordre' => 50, 'nbCategories' => 0], $created->data);

        $duplicate = $this->request('POST', '/api/admin/sections', ['nom' => 'Conserves']);
        self::assertSame(422, $duplicate->status);
        self::assertArrayHasKey('nom', $duplicate->data['error']['details']['fields']);

        $renamed = $this->request('PUT', "/api/admin/sections/{$created->data['id']}", ['nom' => 'Boissons et lait']);
        self::assertSame('Boissons et lait', $renamed->data['nom']);
        self::assertSame(['Conserves', 'Boissons et lait'], array_column(self::json($this->request('GET', '/api/admin/sections')), 'nom'));
        self::assertSame(404, $this->request('PUT', '/api/admin/sections/999', ['nom' => 'X'])->status);
    }

    public function testReorder(): void
    {
        $a = $this->insert('section', ['nom' => 'A', 'ordre' => 10]);
        $b = $this->insert('section', ['nom' => 'B', 'ordre' => 20]);

        self::assertSame(422, $this->request('PUT', '/api/admin/sections/ordre', ['ids' => [$a]])->status);

        $response = $this->request('PUT', '/api/admin/sections/ordre', ['ids' => [$b, $a]]);
        self::assertSame(200, $response->status);
        self::assertSame(['B', 'A'], array_column($response->data, 'nom'));
    }

    public function testDeleteKeepsCategoriesWithoutSection(): void
    {
        $section = $this->insert('section', ['nom' => 'Conserves']);
        $categorie = $this->insert('categorie', ['nom' => 'Poisson', 'section_id' => $section, 'unite' => 'kg']);
        self::assertSame(1, self::json($this->request('GET', '/api/admin/sections'))[0]['nbCategories']);

        self::assertSame(204, $this->request('DELETE', "/api/admin/sections/{$section}")->status);

        self::assertSame([], self::json($this->request('GET', '/api/admin/sections')));
        self::assertNull($this->db->query("SELECT section_id FROM categorie WHERE id = {$categorie}")->fetchColumn());
        self::assertSame(1, (int) $this->db->query("SELECT COUNT(*) FROM journal_admin WHERE entite = 'section' AND action = 'suppression'")->fetchColumn());
    }
}
