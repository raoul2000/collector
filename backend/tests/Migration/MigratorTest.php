<?php

declare(strict_types=1);

namespace App\Tests\Migration;

use App\Migration\Migrator;
use App\Tests\DatabaseTestCase;
use PHPUnit\Framework\TestCase;

final class MigratorTest extends TestCase
{
    public function testSplitStatementsIgnoresCommentsAndBlankStatements(): void
    {
        $sql = <<<SQL
            -- commentaire ; avec point-virgule
            CREATE TABLE a (
                id INT -- pas un commentaire de ligne entière
            );

            INSERT INTO a VALUES (1);
              -- autre commentaire
            ;
            SQL;

        self::assertSame(
            ["CREATE TABLE a (\n    id INT -- pas un commentaire de ligne entière\n)", 'INSERT INTO a VALUES (1)'],
            Migrator::splitStatements($sql),
        );
    }

    public function testSemicolonInsideLineDoesNotSplit(): void
    {
        self::assertSame(
            ["INSERT INTO a VALUES ('x;y')"],
            Migrator::splitStatements("INSERT INTO a VALUES ('x;y');\n"),
        );
    }

    public function testAllMigrationsAreAppliedAndRecorded(): void
    {
        $pdo = DatabaseTestCase::pdo();
        $migrator = new Migrator($pdo, dirname(__DIR__, 2) . '/sql/migrations');

        self::assertNotEmpty($migrator->available());
        self::assertSame([], $migrator->pending());
        self::assertSame([], $migrator->migrate());

        $tables = $pdo->query('SHOW TABLES')->fetchAll(\PDO::FETCH_COLUMN);
        foreach (['campagne', 'magasin', 'campagne_magasin', 'categorie', 'format', 'appareil', 'saisie', 'journal_admin'] as $table) {
            self::assertContains($table, $tables);
        }
    }
}
