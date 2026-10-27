<?php

declare(strict_types=1);

/*
 * Point d'entrée de l'API.
 *
 * Le code applicatif (src/, vendor/, config/) se trouve :
 *  - en développement : dans le dossier parent (backend/) ;
 *  - en production : dans un dossier « app » hors de la racine web (cf. docs/specifications.md, 5.8) ;
 *  - ou dans le dossier indiqué par la variable d'environnement COLLECTOR_APP_DIR.
 */
$appDir = (static function (): ?string {
    $candidates = [getenv('COLLECTOR_APP_DIR') ?: null, dirname(__DIR__), dirname(__DIR__, 2) . '/app'];
    foreach ($candidates as $dir) {
        if ($dir !== null && is_file($dir . '/vendor/autoload.php')) {
            return $dir;
        }
    }

    return null;
})();

if ($appDir === null) {
    error_log('Collector : dossier applicatif introuvable (vendor/autoload.php absent).');
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo '{"error":{"code":"internal_error","message":"Erreur interne du serveur."}}';

    return;
}

require $appDir . '/vendor/autoload.php';

App\App::run($appDir);
