<?php

declare(strict_types=1);

namespace App\Tests\Controller;

use App\Controller\MaintenanceController;
use App\Http\HttpException;
use App\Http\Request;
use App\Migration\Migrator;
use App\Tests\ApiTestCase;

final class MaintenanceControllerTest extends ApiTestCase
{
    private const string JETON = 'jeton-de-test-0123456789abcdef0123456789';

    private const string MIGRATIONS = __DIR__ . '/../../sql/migrations';

    private ?string $dossier = null;

    protected function setUp(): void
    {
        parent::setUp();
        $this->config = ['deploiement' => ['jeton' => self::JETON]];
    }

    protected function tearDown(): void
    {
        if ($this->dossier !== null) {
            array_map(unlink(...), glob($this->dossier . '/*') ?: []);
            rmdir($this->dossier);
        }
        parent::tearDown();
    }

    public function testRoutesAreDisabledWithoutAToken(): void
    {
        foreach (['', 'trop-court'] as $jeton) {
            $this->config = ['deploiement' => ['jeton' => $jeton]];
            $response = $this->request('GET', '/api/maintenance/schema', headers: ['X-Deploy-Token' => $jeton]);

            self::assertSame(404, $response->status);
            self::assertSame('maintenance_disabled', self::json($response)['error']['code']);
        }
    }

    public function testInvalidTokenIsRejected(): void
    {
        self::assertSame(401, $this->request('GET', '/api/maintenance/schema')->status);
        self::assertSame(401, $this->request('GET', '/api/maintenance/schema', headers: ['X-Deploy-Token' => 'x' . self::JETON])->status);
        self::assertSame(401, $this->request('POST', '/api/maintenance/migrer', headers: ['X-Deploy-Token' => 'mauvais'])->status);
    }

    public function testSchemaListsAppliedMigrations(): void
    {
        $response = $this->request('GET', '/api/maintenance/schema', headers: ['X-Deploy-Token' => self::JETON]);

        self::assertSame(200, $response->status);
        $data = self::json($response);
        self::assertContains('001_schema_initial.sql', $data['appliquees']);
        self::assertSame([], $data['enAttente']);
    }

    public function testMigrateWithNothingPending(): void
    {
        $response = $this->request('POST', '/api/maintenance/migrer', headers: ['X-Deploy-Token' => self::JETON]);

        self::assertSame(200, $response->status);
        self::assertSame(['appliquees' => [], 'enAttente' => []], self::json($response));
    }

    public function testMigrateAppliesPendingMigrations(): void
    {
        // Migration de données (sans DDL, qui validerait la transaction des tests)
        $controller = $this->controller(['999_test.sql' => "INSERT INTO magasin (nom) VALUES ('Migré');\n"]);

        self::assertSame(['999_test.sql'], self::json($controller->schema($this->requete('GET')))['enAttente']);
        self::assertSame(
            ['appliquees' => ['999_test.sql'], 'enAttente' => []],
            self::json($controller->migrate($this->requete('POST'))),
        );
        self::assertSame(1, (int) $this->db->query("SELECT COUNT(*) FROM magasin WHERE nom = 'Migré'")->fetchColumn());
    }

    public function testFailedMigrationIsReported(): void
    {
        $controller = $this->controller(['999_erreur.sql' => "INSERT INTO table_inconnue VALUES (1);\n"]);

        try {
            $controller->migrate($this->requete('POST'));
            self::fail('La migration aurait dû échouer');
        } catch (HttpException $e) {
            self::assertSame(500, $e->status);
            self::assertSame('migration_failed', $e->errorCode);
            self::assertStringStartsWith('Migration 999_erreur.sql : ', $e->getMessage());
        }
    }

    /**
     * Contrôleur sur une copie des migrations réelles complétée par les scripts donnés.
     *
     * @param array<string, string> $scripts
     */
    private function controller(array $scripts): MaintenanceController
    {
        $this->dossier = sys_get_temp_dir() . '/collector-migrations-' . bin2hex(random_bytes(4));
        mkdir($this->dossier);
        foreach (glob(self::MIGRATIONS . '/*.sql') ?: [] as $fichier) {
            copy($fichier, $this->dossier . '/' . basename($fichier));
        }
        foreach ($scripts as $nom => $sql) {
            file_put_contents($this->dossier . '/' . $nom, $sql);
        }

        return new MaintenanceController(fn (): Migrator => new Migrator($this->db, (string) $this->dossier), self::JETON);
    }

    private function requete(string $method): Request
    {
        return new Request($method, '/api/maintenance', headers: ['X-Deploy-Token' => self::JETON]);
    }
}
