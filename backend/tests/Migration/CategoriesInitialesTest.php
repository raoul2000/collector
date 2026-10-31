<?php

declare(strict_types=1);

namespace App\Tests\Migration;

use App\Migration\Migrator;
use App\Tests\DatabaseTestCase;
use PDO;

/**
 * Scripts générés depuis docs/categories/liste-benevoles.csv (scripts/generer-categories.mjs).
 */
final class CategoriesInitialesTest extends DatabaseTestCase
{
    private const string SQL = __DIR__ . '/../../sql/';

    public function testInitialListIsInstalled(): void
    {
        $this->executer('categories_initiales.sql');

        $this->verifierListe();
    }

    public function testResetReplacesTheListAndDeletesSaisies(): void
    {
        $campagne = $this->insert('campagne', ['nom' => 'C', 'date_debut' => '2026-11-27', 'date_fin' => '2026-11-28']);
        $magasin = $this->insert('magasin', ['nom' => 'Lidl']);
        $ancienne = $this->insert('categorie', ['nom' => 'Pâtes', 'unite' => 'kg']);
        $this->insert('section', ['nom' => 'Ancienne']);
        $this->insertSaisie($campagne, $magasin, $ancienne);
        $appareils = (int) $this->db->query('SELECT COUNT(*) FROM appareil')->fetchColumn();

        $this->executer('reinitialiser-referentiel.sql');

        $this->verifierListe();
        self::assertSame(0, (int) $this->db->query('SELECT COUNT(*) FROM saisie')->fetchColumn());
        self::assertSame(0, (int) $this->db->query("SELECT COUNT(*) FROM categorie WHERE id = {$ancienne}")->fetchColumn());
        self::assertSame($appareils, (int) $this->db->query('SELECT COUNT(*) FROM appareil')->fetchColumn(), 'Appareils conservés');
    }

    private function verifierListe(): void
    {
        self::assertSame(7, (int) $this->db->query('SELECT COUNT(*) FROM section')->fetchColumn());
        self::assertSame(35, (int) $this->db->query('SELECT COUNT(*) FROM categorie')->fetchColumn());
        self::assertSame(0, (int) $this->db->query('SELECT COUNT(*) FROM categorie WHERE section_id IS NULL')->fetchColumn());

        $couches = $this->db->query(
            "SELECT f.libelle FROM format f JOIN categorie c ON c.id = f.categorie_id WHERE c.nom = 'Couches' ORDER BY f.ordre",
        )->fetchAll(PDO::FETCH_COLUMN);
        self::assertSame(['T1-2', 'T3', 'T4', 'T5', 'T6'], $couches);

        $huile = $this->db->query(
            "SELECT CONCAT(f.libelle, ' ', f.contenance) FROM format f JOIN categorie c ON c.id = f.categorie_id WHERE c.nom = 'Huile' ORDER BY f.ordre",
        )->fetchAll(PDO::FETCH_COLUMN);
        self::assertSame(['Olive / colza 1000', 'Tournesol, autres 1000'], $huile);

        $motsCles = (string) $this->db->query("SELECT mots_cles FROM categorie WHERE nom = 'Légumineuses en conserve'")->fetchColumn();
        self::assertStringContainsString('lentilles', $motsCles);
        self::assertSame(1, (int) $this->db->query('SELECT COUNT(*) FROM categorie WHERE mots_cles IS NULL')->fetchColumn(), 'Seule « Autre » est sans mots-clés');
    }

    private function executer(string $fichier): void
    {
        foreach (Migrator::splitStatements((string) file_get_contents(self::SQL . $fichier)) as $instruction) {
            $this->db->exec($instruction);
        }
    }
}
