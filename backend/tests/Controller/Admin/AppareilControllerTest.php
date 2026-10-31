<?php

declare(strict_types=1);

namespace App\Tests\Controller\Admin;

use App\Repository\AppareilRepository;
use App\Tests\ApiTestCase;

final class AppareilControllerTest extends ApiTestCase
{
    private const string MARIE = 'a1a1a1a1-0000-4000-8000-000000000001';
    private const string PAUL = 'b2b2b2b2-0000-4000-8000-000000000002';
    private const string ANCIEN = 'c3c3c3c3-0000-4000-8000-000000000003';

    private int $campagne;
    private int $lidl;
    private int $auchan;
    private int $pates;

    protected function setUp(): void
    {
        parent::setUp();
        $this->campagne = $this->insert('campagne', ['nom' => 'C', 'date_debut' => $this->maintenant('-2 DAY'), 'date_fin' => $this->maintenant('+2 DAY'), 'active' => 1]);
        $this->lidl = $this->insert('magasin', ['nom' => 'Lidl']);
        $this->auchan = $this->insert('magasin', ['nom' => 'Auchan']);
        $this->pates = $this->insert('categorie', ['nom' => 'Pâtes', 'unite' => 'kg']);

        // Marie : connectée, deux saisies (et une supprimée) ; Paul : vu il y a 10 minutes, rien saisi ;
        // un ancien appareil vu avant le début de la campagne
        $this->insert('appareil', ['id' => self::MARIE, 'prenom' => 'Marie', 'cree_le' => $this->maintenant('-1 DAY'), 'vu_le' => $this->maintenant()]);
        $this->insert('appareil', ['id' => self::PAUL, 'prenom' => 'Paul', 'cree_le' => $this->maintenant('-1 HOUR'), 'vu_le' => $this->maintenant('-10 MINUTE')]);
        $this->insert('appareil', ['id' => self::ANCIEN, 'prenom' => 'Jean', 'cree_le' => $this->maintenant('-30 DAY'), 'vu_le' => $this->maintenant('-10 DAY')]);
        $this->saisie(self::MARIE, $this->lidl, '-3 HOUR', 2);
        $this->saisie(self::MARIE, $this->auchan, '-1 HOUR', 3);
        $this->saisie(self::MARIE, $this->lidl, '-30 MINUTE', 5, supprimee: true);
    }

    public function testRouteRequiresAnAdminSession(): void
    {
        self::assertSame(401, $this->request('GET', '/api/admin/appareils')->status);
    }

    public function testListsTheDevicesOfTheActiveCampagne(): void
    {
        $this->loginAsAdmin();

        $data = $this->request('GET', '/api/admin/appareils')->data;

        self::assertSame(['id' => $this->campagne, 'nom' => 'C'], $data['campagne']);
        self::assertSame(2, $data['connecteMinutes']);
        self::assertSame([self::MARIE, self::PAUL], array_column($data['appareils'], 'id'));

        [$marie, $paul] = $data['appareils'];
        self::assertSame(
            ['prenom' => 'Marie', 'magasinId' => $this->auchan, 'nbSaisies' => 2, 'nbArticles' => 5, 'connecte' => true],
            array_intersect_key($marie, array_flip(['prenom', 'magasinId', 'nbSaisies', 'nbArticles', 'connecte'])),
        );
        self::assertLessThan(60, $marie['vuIlYaSecondes']);
        self::assertSame(
            ['prenom' => 'Paul', 'magasinId' => null, 'nbSaisies' => 0, 'nbArticles' => 0, 'derniereSaisie' => null, 'connecte' => false],
            array_intersect_key($paul, array_flip(['prenom', 'magasinId', 'nbSaisies', 'nbArticles', 'derniereSaisie', 'connecte'])),
        );
        self::assertEqualsWithDelta(600, $paul['vuIlYaSecondes'], 60);
    }

    public function testConnectedDelayIsConfigurable(): void
    {
        $campagne = ['id' => $this->campagne, 'dateDebut' => $this->maintenant('-2 DAY'), 'active' => true];

        $appareils = new AppareilRepository($this->db)->findByCampagne($campagne, 15);

        self::assertSame([true, true], array_column($appareils, 'connecte'));
    }

    public function testAnInactiveCampagneOnlyListsDevicesWithSaisies(): void
    {
        $this->loginAsAdmin();
        $ancienne = $this->insert('campagne', ['nom' => 'Ancienne', 'date_debut' => '2025-11-28', 'date_fin' => '2025-11-29']);
        $this->insert('saisie', [
            'id' => self::uuid(), 'campagne_id' => $ancienne, 'magasin_id' => $this->lidl, 'appareil_id' => self::ANCIEN,
            'categorie_id' => $this->pates, 'quantite' => 1, 'saisie_le' => '2025-11-28 10:00:00', 'modifie_le' => '2025-11-28 10:00:00.000',
        ]);

        $data = $this->request('GET', '/api/admin/appareils', query: ['campagne' => (string) $ancienne])->data;

        self::assertSame([self::ANCIEN], array_column($data['appareils'], 'id'));
        self::assertSame(404, $this->request('GET', '/api/admin/appareils', query: ['campagne' => '999999'])->status);
        self::assertSame(400, $this->request('GET', '/api/admin/appareils', query: ['campagne' => 'x'])->status);
    }

    public function testSaisiesCanBeFilteredByDevice(): void
    {
        $this->loginAsAdmin();
        $this->insert('appareil', ['id' => 'd4d4d4d4-0000-4000-8000-000000000004', 'prenom' => 'Marie']);
        $this->saisie('d4d4d4d4-0000-4000-8000-000000000004', $this->lidl, '-2 HOUR', 1);

        // Deux bénévoles prénommées Marie : le filtre par appareil les distingue
        $data = $this->request('GET', '/api/admin/saisies', query: ['appareil' => strtoupper(self::MARIE)])->data;

        self::assertSame(2, $data['total']);
        self::assertSame(400, $this->request('GET', '/api/admin/saisies', query: ['appareil' => 'pas-un-uuid'])->status);
    }

    /**
     * Date et heure de la base (son horloge sert de référence), décalée de $intervalle (ex. « -10 MINUTE »).
     */
    private function maintenant(string $intervalle = '0 SECOND'): string
    {
        return (string) $this->db->query("SELECT DATE_FORMAT(NOW() + INTERVAL {$intervalle}, '%Y-%m-%d %H:%i:%s')")->fetchColumn();
    }

    private function saisie(string $appareil, int $magasin, string $decalage, int $quantite, bool $supprimee = false): void
    {
        $quand = $this->maintenant($decalage);
        $this->insert('saisie', [
            'id' => self::uuid(), 'campagne_id' => $this->campagne, 'magasin_id' => $magasin, 'appareil_id' => $appareil,
            'categorie_id' => $this->pates, 'quantite' => $quantite, 'contenance_unitaire' => 500,
            'saisie_le' => $quand, 'modifie_le' => $quand . '.000', 'supprime_le' => $supprimee ? $quand . '.000' : null,
        ]);
    }
}
