<?php

declare(strict_types=1);

/*
 * Mise à jour du schéma de la base de données.
 *
 *   php bin/migrate.php            applique les migrations en attente
 *   php bin/migrate.php --fresh    (développement) recrée la base vide avant de migrer
 *   php bin/migrate.php --seed     charge ensuite les données de développement (sql/seed_dev.sql) et la liste
 *                                  des catégories (sql/categories_initiales.sql)
 *   php bin/migrate.php --db=nom   utilise une autre base que celle de la configuration
 */

use App\Config;
use App\Database;
use App\Migration\Migrator;

$appDir = dirname(__DIR__);
require $appDir . '/vendor/autoload.php';

$options = getopt('', ['fresh', 'seed', 'db:']);
$config = Config::load($appDir);
$timezone = $config['app']['timezone'];
$db = $config['db'];
if (isset($options['db']) && is_string($options['db'])) {
    $db['name'] = $options['db'];
}

try {
    if (isset($options['fresh'])) {
        if ($config['app']['debug'] !== true) {
            fwrite(STDERR, "--fresh est réservé au développement (app.debug = true).\n");
            exit(1);
        }
        Database::create($db, $timezone, dropFirst: true);
        echo "Base « {$db['name']} » recréée.\n";
    }

    $pdo = Database::connect($db, $timezone);
    $applied = new Migrator($pdo, $appDir . '/sql/migrations')->migrate();
    echo $applied === []
        ? "Schéma à jour.\n"
        : 'Migrations appliquées : ' . implode(', ', $applied) . "\n";

    if (isset($options['seed'])) {
        foreach (['seed_dev.sql', 'categories_initiales.sql'] as $fichier) {
            $seed = (string) file_get_contents($appDir . '/sql/' . $fichier);
            foreach (Migrator::splitStatements($seed) as $statement) {
                $pdo->exec($statement);
            }
        }
        echo "Données de développement chargées.\n";
    }
} catch (Throwable $e) {
    fwrite(STDERR, 'Erreur : ' . $e->getMessage() . "\n");
    exit(1);
}
