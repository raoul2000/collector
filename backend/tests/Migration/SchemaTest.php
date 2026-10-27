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
        $this->saisie(['quantite' => 999]);

        $this->expectException(PDOException::class);
        $this->saisie(['quantite' => 1000]);
    }

    public function testSaisieWithoutContenanceIsAllowed(): void
    {
        $this->saisie(['contenance_unitaire' => null]);

        self::assertSame(1, (int) $this->db->query('SELECT COUNT(*) FROM saisie')->fetchColumn());
    }

    public function testStoreWithSaisiesCannotBeDeleted(): void
    {
        $this->saisie();

        $this->expectException(PDOException::class);
        $this->db->exec('DELETE FROM magasin');
    }

    /** @var array{int, int, int}|null campagne, magasin et catégorie communs aux saisies du test */
    private ?array $refs = null;

    /**
     * @param array<string, mixed> $overrides
     */
    private function saisie(array $overrides = []): void
    {
        $this->refs ??= [
            $this->insert('campagne', ['nom' => 'C', 'date_debut' => '2026-11-27', 'date_fin' => '2026-11-28']),
            $this->insert('magasin', ['nom' => 'Lidl']),
            $this->insert('categorie', ['nom' => 'Pâtes', 'unite' => 'kg']),
        ];

        $this->insertSaisie(...$this->refs, overrides: $overrides);
    }
}
