<?php

declare(strict_types=1);

namespace App\Tests\Controller\Admin;

use App\Tests\ApiTestCase;

final class CampagneControllerTest extends ApiTestCase
{
    private const array CAMPAGNE = ['nom' => 'Collecte 2026', 'dateDebut' => '2026-11-27', 'dateFin' => '2026-11-28'];

    public function testRoutesRequireAnAdminSession(): void
    {
        self::assertSame(401, $this->request('GET', '/api/admin/campagnes')->status);
        self::assertSame(401, $this->request('POST', '/api/admin/campagnes', self::CAMPAGNE)->status);
        self::assertSame(0, (int) $this->db->query('SELECT COUNT(*) FROM campagne')->fetchColumn());
    }

    public function testCreateAndList(): void
    {
        $this->loginAsAdmin('Sophie');
        $lidl = $this->insert('magasin', ['nom' => 'Lidl']);
        $auchan = $this->insert('magasin', ['nom' => 'Auchan']);

        $response = $this->request('POST', '/api/admin/campagnes', self::CAMPAGNE + ['magasinIds' => [$lidl, $auchan]]);

        self::assertSame(201, $response->status);
        $id = $response->data['id'];
        self::assertSame(
            ['id' => $id, 'nom' => 'Collecte 2026', 'dateDebut' => '2026-11-27', 'dateFin' => '2026-11-28',
                'active' => false, 'magasinIds' => [$lidl, $auchan], 'nbSaisies' => 0],
            $response->data,
        );

        $this->insert('campagne', ['nom' => 'Collecte 2025', 'date_debut' => '2025-11-28', 'date_fin' => '2025-11-29']);
        $list = $this->request('GET', '/api/admin/campagnes')->data;
        self::assertSame(['Collecte 2026', 'Collecte 2025'], array_column($list, 'nom'));

        $journal = $this->db->query("SELECT prenom, action, entite, entite_id FROM journal_admin WHERE action = 'creation'")->fetch();
        self::assertSame(['prenom' => 'Sophie', 'action' => 'creation', 'entite' => 'campagne', 'entite_id' => (string) $id], $journal);
    }

    public function testCreateValidation(): void
    {
        $this->loginAsAdmin();
        $this->insert('campagne', ['nom' => 'Collecte 2026', 'date_debut' => '2026-11-27', 'date_fin' => '2026-11-28']);

        $response = $this->request('POST', '/api/admin/campagnes', [
            'nom' => 'Collecte 2026',
            'dateDebut' => '2026-11-28',
            'dateFin' => '2026-11-27',
            'magasinIds' => [999],
        ]);

        self::assertSame(422, $response->status);
        self::assertSame(['dateFin', 'nom', 'magasinIds'], array_keys($response->data['error']['details']['fields']));
    }

    public function testUpdate(): void
    {
        $this->loginAsAdmin();
        $id = $this->insert('campagne', ['nom' => 'Brouillon', 'date_debut' => '2026-11-27', 'date_fin' => '2026-11-28']);
        $lidl = $this->insert('magasin', ['nom' => 'Lidl']);
        $this->insert('campagne_magasin', ['campagne_id' => $id, 'magasin_id' => $lidl]);

        $response = $this->request('PUT', "/api/admin/campagnes/{$id}", ['nom' => 'Collecte 2026', 'dateDebut' => '2026-11-26', 'dateFin' => '2026-11-28']);

        self::assertSame(200, $response->status);
        self::assertSame('Collecte 2026', $response->data['nom']);
        self::assertSame('2026-11-26', $response->data['dateDebut']);
        self::assertSame([$lidl], $response->data['magasinIds'], 'Sans magasinIds, les rattachements sont conservés');

        $details = json_decode((string) $this->db->query("SELECT details FROM journal_admin WHERE action = 'modification'")->fetchColumn(), true);
        self::assertSame('Brouillon', $details['avant']['nom']);
        self::assertSame('Collecte 2026', $details['apres']['nom']);

        $response = $this->request('PUT', "/api/admin/campagnes/{$id}", self::CAMPAGNE + ['magasinIds' => []]);
        self::assertSame([], $response->data['magasinIds']);
    }

    public function testStoreWithSaisiesCannotBeDetached(): void
    {
        $this->loginAsAdmin();
        $id = $this->insert('campagne', ['nom' => 'C', 'date_debut' => '2026-11-27', 'date_fin' => '2026-11-28']);
        $lidl = $this->insert('magasin', ['nom' => 'Lidl']);
        $auchan = $this->insert('magasin', ['nom' => 'Auchan']);
        $this->insert('campagne_magasin', ['campagne_id' => $id, 'magasin_id' => $lidl]);
        $this->insert('campagne_magasin', ['campagne_id' => $id, 'magasin_id' => $auchan]);
        $this->insertSaisie($id, $lidl, $this->insert('categorie', ['nom' => 'Pâtes', 'unite' => 'kg']));

        $refused = $this->request('PUT', "/api/admin/campagnes/{$id}", self::CAMPAGNE + ['magasinIds' => [$auchan]]);
        self::assertSame(422, $refused->status);
        self::assertArrayHasKey('magasinIds', $refused->data['error']['details']['fields']);

        $accepted = $this->request('PUT', "/api/admin/campagnes/{$id}", self::CAMPAGNE + ['magasinIds' => [$lidl]]);
        self::assertSame(200, $accepted->status);
        self::assertSame([$lidl], $accepted->data['magasinIds']);
    }

    public function testActivateAndDeactivate(): void
    {
        $this->loginAsAdmin();
        $ancienne = $this->insert('campagne', ['nom' => 'A', 'date_debut' => '2025-11-28', 'date_fin' => '2025-11-29', 'active' => 1]);
        $nouvelle = $this->insert('campagne', ['nom' => 'B', 'date_debut' => '2026-11-27', 'date_fin' => '2026-11-28']);

        $response = $this->request('POST', "/api/admin/campagnes/{$nouvelle}/activer");

        self::assertSame(200, $response->status);
        self::assertTrue($response->data['active']);
        self::assertSame([$nouvelle], $this->activeIds());
        self::assertNotContains($ancienne, $this->activeIds());

        $response = $this->request('POST', "/api/admin/campagnes/{$nouvelle}/desactiver");
        self::assertFalse($response->data['active']);
        self::assertSame([], $this->activeIds());
    }

    public function testDelete(): void
    {
        $this->loginAsAdmin();
        $id = $this->insert('campagne', ['nom' => 'C', 'date_debut' => '2026-11-27', 'date_fin' => '2026-11-28']);
        $this->insert('campagne_magasin', ['campagne_id' => $id, 'magasin_id' => $this->insert('magasin', ['nom' => 'Lidl'])]);

        self::assertSame(204, $this->request('DELETE', "/api/admin/campagnes/{$id}")->status);
        self::assertSame(404, $this->request('DELETE', "/api/admin/campagnes/{$id}")->status);
        self::assertSame(0, (int) $this->db->query('SELECT COUNT(*) FROM campagne_magasin')->fetchColumn());
    }

    public function testCampaignWithSaisiesCannotBeDeleted(): void
    {
        $this->loginAsAdmin();
        $id = $this->insert('campagne', ['nom' => 'C', 'date_debut' => '2026-11-27', 'date_fin' => '2026-11-28']);
        $this->insertSaisie($id, $this->insert('magasin', ['nom' => 'Lidl']), $this->insert('categorie', ['nom' => 'Riz', 'unite' => 'kg']));

        $response = $this->request('DELETE', "/api/admin/campagnes/{$id}");

        self::assertSame(409, $response->status);
        self::assertSame('has_saisies', $response->data['error']['code']);
    }

    public function testInvalidIdGives404(): void
    {
        $this->loginAsAdmin();

        self::assertSame(404, $this->request('PUT', '/api/admin/campagnes/abc', self::CAMPAGNE)->status);
        self::assertSame(404, $this->request('PUT', '/api/admin/campagnes/0', self::CAMPAGNE)->status);
        self::assertSame(404, $this->request('PUT', '/api/admin/campagnes/12345', self::CAMPAGNE)->status);
    }

    /**
     * @return list<int>
     */
    private function activeIds(): array
    {
        return array_map(intval(...), $this->db->query('SELECT id FROM campagne WHERE active = 1')->fetchAll(\PDO::FETCH_COLUMN));
    }
}
