<?php

declare(strict_types=1);

namespace App\Tests\Controller\Admin;

use App\Tests\ApiTestCase;

final class MagasinControllerTest extends ApiTestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        $this->loginAsAdmin();
    }

    public function testCreateWithDefaults(): void
    {
        $response = $this->request('POST', '/api/admin/magasins', ['nom' => ' Lidl ']);

        self::assertSame(201, $response->status);
        self::assertSame(
            ['id' => $response->data['id'], 'nom' => 'Lidl', 'ville' => '', 'actif' => true, 'nbSaisies' => 0],
            $response->data,
        );
    }

    public function testSameNameIsAllowedInAnotherTown(): void
    {
        self::assertSame(201, $this->request('POST', '/api/admin/magasins', ['nom' => 'Lidl', 'ville' => 'Nord'])->status);
        self::assertSame(201, $this->request('POST', '/api/admin/magasins', ['nom' => 'Lidl', 'ville' => 'Sud'])->status);

        $duplicate = $this->request('POST', '/api/admin/magasins', ['nom' => 'Lidl', 'ville' => 'Sud']);
        self::assertSame(422, $duplicate->status);
        self::assertSame(['nom' => 'Ce magasin existe déjà.'], $duplicate->data['error']['details']['fields']);
    }

    public function testListIncludesInactiveStoresSortedByName(): void
    {
        $this->insert('magasin', ['nom' => 'Lidl']);
        $this->insert('magasin', ['nom' => 'Auchan', 'actif' => 0]);

        $list = $this->request('GET', '/api/admin/magasins')->data;

        self::assertSame(['Auchan', 'Lidl'], array_column($list, 'nom'));
        self::assertSame([false, true], array_column($list, 'actif'));
    }

    public function testUpdateKeepsActiveFlagWhenOmitted(): void
    {
        $id = $this->insert('magasin', ['nom' => 'Lidl', 'actif' => 0]);

        $response = $this->request('PUT', "/api/admin/magasins/{$id}", ['nom' => 'Lidl', 'ville' => 'Centre']);
        self::assertSame(200, $response->status);
        self::assertSame('Centre', $response->data['ville']);
        self::assertFalse($response->data['actif']);

        $response = $this->request('PUT', "/api/admin/magasins/{$id}", ['nom' => 'Lidl', 'ville' => 'Centre', 'actif' => true]);
        self::assertTrue($response->data['actif']);
    }

    public function testUpdateMayKeepItsOwnName(): void
    {
        $id = $this->insert('magasin', ['nom' => 'Lidl']);

        self::assertSame(200, $this->request('PUT', "/api/admin/magasins/{$id}", ['nom' => 'Lidl'])->status);
    }

    public function testDeleteRemovesCampaignLinks(): void
    {
        $id = $this->insert('magasin', ['nom' => 'Lidl']);
        $campagne = $this->insert('campagne', ['nom' => 'C', 'date_debut' => '2026-11-27', 'date_fin' => '2026-11-28']);
        $this->insert('campagne_magasin', ['campagne_id' => $campagne, 'magasin_id' => $id]);

        self::assertSame(204, $this->request('DELETE', "/api/admin/magasins/{$id}")->status);
        self::assertSame(0, (int) $this->db->query('SELECT COUNT(*) FROM magasin')->fetchColumn());
    }

    public function testStoreWithSaisiesCannotBeDeleted(): void
    {
        $id = $this->insert('magasin', ['nom' => 'Lidl']);
        $campagne = $this->insert('campagne', ['nom' => 'C', 'date_debut' => '2026-11-27', 'date_fin' => '2026-11-28']);
        $this->insertSaisie($campagne, $id, $this->insert('categorie', ['nom' => 'Riz', 'unite' => 'kg']));

        $response = $this->request('DELETE', "/api/admin/magasins/{$id}");

        self::assertSame(409, $response->status);
        self::assertSame(1, $this->request('GET', '/api/admin/magasins')->data[0]['nbSaisies']);
    }
}
