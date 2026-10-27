<?php

declare(strict_types=1);

namespace App\Migration;

use PDO;
use RuntimeException;

/**
 * Applique, dans l'ordre, les scripts SQL numérotés (NNN_description.sql) qui ne l'ont pas encore été.
 * Les scripts appliqués sont enregistrés dans la table schema_version.
 *
 * Les instructions DDL de MySQL valident implicitement les transactions : un script interrompu
 * en cours d'exécution doit être corrigé à la main avant de relancer la migration.
 */
final readonly class Migrator
{
    public function __construct(
        private PDO $pdo,
        private string $directory,
    ) {
    }

    /**
     * @return list<string> noms des scripts appliqués
     */
    public function migrate(): array
    {
        $applied = [];
        foreach ($this->pending() as $file) {
            $sql = (string) file_get_contents($this->directory . '/' . $file);
            foreach (self::splitStatements($sql) as $statement) {
                $this->pdo->exec($statement);
            }
            $this->pdo->prepare('INSERT INTO schema_version (version) VALUES (?)')->execute([$file]);
            $applied[] = $file;
        }

        return $applied;
    }

    /**
     * @return list<string>
     */
    public function pending(): array
    {
        $this->ensureVersionTable();
        $done = $this->pdo->query('SELECT version FROM schema_version')->fetchAll(PDO::FETCH_COLUMN);

        return array_values(array_diff($this->available(), $done));
    }

    /**
     * @return list<string>
     */
    public function available(): array
    {
        $files = glob($this->directory . '/[0-9][0-9][0-9]_*.sql');
        if ($files === false) {
            throw new RuntimeException("Dossier de migrations illisible : {$this->directory}");
        }
        $files = array_map(basename(...), $files);
        sort($files, SORT_STRING);

        return $files;
    }

    /**
     * Découpe un script en instructions : une instruction se termine par « ; » en fin de ligne.
     * Les lignes de commentaire (--) sont ignorées.
     *
     * @return list<string>
     */
    public static function splitStatements(string $sql): array
    {
        $lines = preg_split('/\R/', $sql) ?: [];
        $lines = array_filter($lines, static fn (string $line): bool => !str_starts_with(ltrim($line), '--'));
        $statements = preg_split('/;\s*$/m', implode("\n", $lines)) ?: [];

        return array_values(array_filter(array_map(trim(...), $statements), static fn (string $s): bool => $s !== ''));
    }

    private function ensureVersionTable(): void
    {
        $this->pdo->exec(
            'CREATE TABLE IF NOT EXISTS schema_version (
                version     VARCHAR(100) NOT NULL PRIMARY KEY,
                applique_le DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci',
        );
    }
}
