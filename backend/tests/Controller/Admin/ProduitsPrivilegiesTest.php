<?php

declare(strict_types=1);

namespace App\Tests\Controller\Admin;

use App\Tests\ApiTestCase;

final class ProduitsPrivilegiesTest extends ApiTestCase
{
    private int $campagne;
    private int $huile;
    private int $cafe;

    protected function setUp(): void
    {
        parent::setUp();
        $this->campagne = $this->insert('campagne', ['nom' => 'C', 'date_debut' => '2026-11-27', 'date_fin' => '2026-11-28', 'active' => 1]);
        $this->huile = $this->insert('categorie', ['nom' => 'Huile', 'unite' => 'L', 'ordre' => 20]);
        $this->cafe = $this->insert('categorie', ['nom' => 'Café', 'unite' => 'kg', 'ordre' => 10]);
    }

    private function url(int $id): string
    {
        return "/api/admin/categories/{$id}/privilegiee";
    }

    public function testRequiresAnAdminSession(): void
    {
        self::assertSame(401, $this->request('PUT', $this->url($this->huile), ['privilegiee' => true])->status);
    }

    public function testAddAndRemoveChangeTheReferentialVersion(): void
    {
        $this->loginAsAdmin();
        $avant = $this->request('GET', '/api/referentiel')->data;
        self::assertSame([], $avant['privilegiees']);

        self::assertTrue($this->request('PUT', $this->url($this->huile), ['privilegiee' => true])->data['privilegiee']);
        // Deux fois de suite : sans effet
        self::assertSame(200, $this->request('PUT', $this->url($this->huile), ['privilegiee' => true])->status);
        $this->request('PUT', $this->url($this->cafe), ['privilegiee' => true]);

        $apres = $this->request('GET', '/api/referentiel')->data;
        self::assertSame([$this->cafe, $this->huile], $apres['privilegiees']);
        self::assertNotSame($avant['version'], $apres['version']);

        self::assertFalse($this->request('PUT', $this->url($this->huile), ['privilegiee' => false])->data['privilegiee']);
        self::assertSame([$this->cafe], $this->request('GET', '/api/referentiel')->data['privilegiees']);
    }

    public function testListIsSpecificToTheCampaign(): void
    {
        $this->loginAsAdmin();
        $this->request('PUT', $this->url($this->huile), ['privilegiee' => true]);

        $this->db->exec('UPDATE campagne SET active = 0');
        $suivante = $this->insert('campagne', ['nom' => 'Suivante', 'date_debut' => '2027-11-26', 'date_fin' => '2027-11-27', 'active' => 1]);
        self::assertSame([], $this->request('GET', '/api/referentiel')->data['privilegiees']);
        self::assertSame([false, false], array_column($this->request('GET', '/api/admin/categories')->data, 'privilegiee'));

        $this->db->exec('UPDATE campagne SET active = 0');
        $this->db->prepare('UPDATE campagne SET active = 1 WHERE id = ?')->execute([$this->campagne]);
        self::assertSame([$this->huile], $this->request('GET', '/api/referentiel')->data['privilegiees']);
        self::assertGreaterThan(0, $suivante);
    }

    public function testDisabledCategoryIsNotSentToPhones(): void
    {
        $this->loginAsAdmin();
        $this->request('PUT', $this->url($this->huile), ['privilegiee' => true]);
        $this->db->prepare('UPDATE categorie SET active = 0 WHERE id = ?')->execute([$this->huile]);

        self::assertSame([], $this->request('GET', '/api/referentiel')->data['privilegiees']);
    }

    public function testRefusals(): void
    {
        $this->loginAsAdmin();
        self::assertSame(404, $this->request('PUT', $this->url(999999), ['privilegiee' => true])->status);
        self::assertSame(422, $this->request('PUT', $this->url($this->huile), [])->status);

        $this->db->exec('UPDATE campagne SET active = 0');
        self::assertSame(409, $this->request('PUT', $this->url($this->huile), ['privilegiee' => true])->status);
    }
}
