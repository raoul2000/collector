<?php

declare(strict_types=1);

namespace App\Tests\Controller\Admin;

use App\Tests\ApiTestCase;

final class RechercheControllerTest extends ApiTestCase
{
    private const string MARIE = 'a1a1a1a1-0000-4000-8000-000000000001';
    private const string PAUL = 'b2b2b2b2-0000-4000-8000-000000000002';

    private int $campagne;
    private int $pates;
    private int $riz;

    protected function setUp(): void
    {
        parent::setUp();
        $this->campagne = $this->insert('campagne', ['nom' => 'C', 'date_debut' => '2026-11-27', 'date_fin' => '2026-11-28', 'active' => 1]);
        $this->pates = $this->insert('categorie', ['nom' => 'Pâtes, semoule', 'unite' => 'kg', 'mots_cles' => 'coquillettes']);
        $this->riz = $this->insert('categorie', ['nom' => 'Riz', 'unite' => 'kg']);
        $this->insert('appareil', ['id' => self::MARIE, 'prenom' => 'Marie']);
        $this->insert('appareil', ['id' => self::PAUL, 'prenom' => 'Paul']);
    }

    public function testRoutesRequireAnAdminSession(): void
    {
        self::assertSame(401, $this->request('GET', '/api/admin/recherches')->status);
        self::assertSame(401, $this->request('POST', '/api/admin/recherches/ignorer', ['terme' => 'x'])->status);
    }

    public function testSearchesAreGroupedWithTheMostChosenCategory(): void
    {
        $this->loginAsAdmin();
        $this->recherche(self::MARIE, 'gnocchi', $this->pates, '10:00:00');
        $this->recherche(self::PAUL, 'Gnocchi', $this->pates, '11:00:00');
        $this->recherche(self::PAUL, 'gnocchï ', $this->riz, '11:30:00');
        $this->recherche(self::MARIE, 'gnocchi', null, '12:00:00');
        $this->recherche(self::MARIE, 'boulgour', null, '09:00:00');
        // Déjà mot-clé ou nom de catégorie : plus présentés
        $this->recherche(self::MARIE, 'Coquillettes', $this->pates, '09:00:00');
        $this->recherche(self::MARIE, 'riz', $this->riz, '09:00:00');
        // Autre campagne
        $autre = $this->insert('campagne', ['nom' => 'Ancienne', 'date_debut' => '2025-11-28', 'date_fin' => '2025-11-29']);
        $this->insert('recherche', ['id' => self::uuid(), 'campagne_id' => $autre, 'appareil_id' => self::MARIE, 'terme' => 'quinoa', 'cherche_le' => '2025-11-28 10:00:00']);

        $response = $this->request('GET', '/api/admin/recherches');

        self::assertSame(200, $response->status);
        self::assertSame(['id' => $this->campagne, 'nom' => 'C'], $response->data['campagne']);
        self::assertSame([
            ['terme' => 'gnocchi', 'nombre' => 4, 'derniere' => '2026-11-27T12:00:00+01:00', 'categorie' => ['id' => $this->pates, 'nom' => 'Pâtes, semoule']],
            ['terme' => 'boulgour', 'nombre' => 1, 'derniere' => '2026-11-27T09:00:00+01:00', 'categorie' => null],
        ], $response->data['recherches']);
        self::assertSame(['quinoa'], array_column(self::json($this->request('GET', '/api/admin/recherches', query: ['campagne' => (string) $autre]))['recherches'], 'terme'));
        self::assertSame(400, $this->request('GET', '/api/admin/recherches', query: ['campagne' => 'x'])->status);
    }

    public function testAddingAKeywordRemovesTheSearch(): void
    {
        $this->loginAsAdmin('Sophie');
        $this->recherche(self::MARIE, 'Gnocchi', $this->pates, '10:00:00');

        $response = $this->request('POST', '/api/admin/recherches/mot-cle', ['terme' => 'Gnocchi', 'categorieId' => $this->pates]);

        self::assertSame(200, $response->status);
        self::assertSame(['coquillettes', 'Gnocchi'], $response->data['motsCles']);
        self::assertSame([], self::json($this->request('GET', '/api/admin/recherches'))['recherches']);
        self::assertSame(1, (int) $this->db->query("SELECT COUNT(*) FROM journal_admin WHERE entite = 'categorie' AND prenom = 'Sophie'")->fetchColumn());

        $refus = $this->request('POST', '/api/admin/recherches/mot-cle', ['terme' => 'x', 'categorieId' => 999999]);
        self::assertSame(422, $refus->status);
        $this->db->prepare('UPDATE categorie SET mots_cles = ? WHERE id = ?')->execute([str_repeat('m', 495), $this->riz]);
        self::assertSame(422, $this->request('POST', '/api/admin/recherches/mot-cle', ['terme' => 'boulgour', 'categorieId' => $this->riz])->status);
    }

    public function testIgnoredSearchesAreNoLongerShown(): void
    {
        $this->loginAsAdmin();
        $this->recherche(self::MARIE, 'zzz', null, '10:00:00');
        $this->recherche(self::MARIE, 'boulgour', null, '10:00:00');

        self::assertSame(204, $this->request('POST', '/api/admin/recherches/ignorer', ['terme' => 'ZZZ'])->status);
        self::assertSame(204, $this->request('POST', '/api/admin/recherches/ignorer', ['terme' => 'zzz'])->status, 'Sans effet une seconde fois');

        self::assertSame(['boulgour'], array_column(self::json($this->request('GET', '/api/admin/recherches'))['recherches'], 'terme'));
    }

    private function recherche(string $appareil, string $terme, ?int $categorie, string $heure): void
    {
        $this->insert('recherche', [
            'id' => self::uuid(),
            'campagne_id' => $this->campagne,
            'appareil_id' => $appareil,
            'terme' => $terme,
            'categorie_id' => $categorie,
            'cherche_le' => '2026-11-27 ' . $heure,
        ]);
    }
}
