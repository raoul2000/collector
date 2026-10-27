<?php

declare(strict_types=1);

namespace App\Tests\Migration;

use App\Tests\DatabaseTestCase;
use PDOException;

/**
 * Vérifie que les contraintes d'intégrité du schéma sont bien appliquées par MySQL.
 */
final class SchemaTest extends DatabaseTestCase
{
    public function testOnlyOneActiveCampaign(): void
    {
        $this->insert('campagne', ['nom' => 'A', 'date_debut' => '2026-11-27', 'date_fin' => '2026-11-28', 'active' => 1]);
        $this->insert('campagne', ['nom' => 'B', 'date_debut' => '2025-11-28', 'date_fin' => '2025-11-29', 'active' => 0]);
        $this->insert('campagne', ['nom' => 'C', 'date_debut' => '2024-11-28', 'date_fin' => '2024-11-29', 'active' => 0]);

        $this->expectException(PDOException::class);
        $this->insert('campagne', ['nom' => 'D', 'date_debut' => '2027-11-26', 'date_fin' => '2027-11-27', 'active' => 1]);
    }

    public function testCampaignEndCannotPrecedeStart(): void
    {
        $this->expectException(PDOException::class);
        $this->insert('campagne', ['nom' => 'A', 'date_debut' => '2026-11-28', 'date_fin' => '2026-11-27']);
    }

    public function testFormatContenanceMustBePositive(): void
    {
        $categorie = $this->insert('categorie', ['nom' => 'Pâtes', 'unite' => 'kg']);

        $this->expectException(PDOException::class);
        $this->insert('format', ['categorie_id' => $categorie, 'contenance' => 0]);
    }

    public function testSaisieQuantityMustBeBetween1And999(): void
    {
        $this->insertSaisie(['id' => 'a0000000-0000-4000-8000-000000000001', 'quantite' => 999]);

        $this->expectException(PDOException::class);
        $this->insertSaisie(['id' => 'a0000000-0000-4000-8000-000000000002', 'quantite' => 1000]);
    }

    public function testSaisieWithoutContenanceIsAllowed(): void
    {
        $this->insertSaisie(['contenance_unitaire' => null]);

        self::assertSame(1, (int) $this->db->query('SELECT COUNT(*) FROM saisie')->fetchColumn());
    }

    public function testStoreWithSaisiesCannotBeDeleted(): void
    {
        $this->insertSaisie([]);

        $this->expectException(PDOException::class);
        $this->db->exec('DELETE FROM magasin');
    }

    /** @var array<string, int|string>|null clés étrangères communes aux saisies du test */
    private ?array $refs = null;

    /**
     * @param array<string, mixed> $overrides
     */
    private function insertSaisie(array $overrides): void
    {
        if ($this->refs === null) {
            $this->refs = [
                'campagne_id' => $this->insert('campagne', ['nom' => 'C', 'date_debut' => '2026-11-27', 'date_fin' => '2026-11-28']),
                'magasin_id' => $this->insert('magasin', ['nom' => 'Lidl']),
                'categorie_id' => $this->insert('categorie', ['nom' => 'Pâtes', 'unite' => 'kg']),
                'appareil_id' => 'd0000000-0000-4000-8000-000000000001',
            ];
            $this->insert('appareil', ['id' => $this->refs['appareil_id'], 'prenom' => 'Marie']);
        }

        $this->insert('saisie', array_merge($this->refs, [
            'id' => 'a0000000-0000-4000-8000-000000000000',
            'quantite' => 2,
            'contenance_unitaire' => 500,
            'saisie_le' => '2026-11-27 10:15:00',
            'modifie_le' => '2026-11-27 10:15:00.000',
        ], $overrides));
    }
}
