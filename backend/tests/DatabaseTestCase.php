<?php

declare(strict_types=1);

namespace App\Tests;

use App\Config;
use App\Database;
use App\Migration\Migrator;
use PDO;
use PHPUnit\Framework\TestCase;

/**
 * Base des tests utilisant MySQL.
 *
 * La base de test (collector_test, ou COLLECTOR_TEST_DB) est recréée et migrée une fois par exécution,
 * avec les accès de config/config.php. Chaque test s'exécute dans une transaction annulée à la fin.
 */
abstract class DatabaseTestCase extends TestCase
{
    private static ?PDO $pdo = null;

    protected PDO $db;

    protected function setUp(): void
    {
        $this->db = self::pdo();
        $this->db->beginTransaction();
    }

    protected function tearDown(): void
    {
        if ($this->db->inTransaction()) {
            $this->db->rollBack();
        }
    }

    public static function pdo(): PDO
    {
        if (self::$pdo !== null) {
            return self::$pdo;
        }

        $appDir = dirname(__DIR__);
        if (!is_file($appDir . '/config/config.php')) {
            self::markTestSkipped('config/config.php absent : tests de base de données ignorés.');
        }

        $config = Config::load($appDir);
        $db = $config['db'];
        $db['name'] = getenv('COLLECTOR_TEST_DB') ?: 'collector_test';
        $timezone = $config['app']['timezone'];

        Database::create($db, $timezone, dropFirst: true);
        $pdo = Database::connect($db, $timezone);
        new Migrator($pdo, $appDir . '/sql/migrations')->migrate();

        return self::$pdo = $pdo;
    }

    /**
     * Insère une ligne et renvoie son identifiant auto-incrémenté.
     *
     * @param array<string, mixed> $row
     */
    protected function insert(string $table, array $row): int
    {
        $columns = array_keys($row);
        $sql = sprintf(
            'INSERT INTO %s (%s) VALUES (%s)',
            $table,
            implode(', ', $columns),
            implode(', ', array_map(static fn (string $c): string => ':' . $c, $columns)),
        );
        $this->db->prepare($sql)->execute($row);

        return (int) $this->db->lastInsertId();
    }
}
