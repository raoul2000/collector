<?php

declare(strict_types=1);

/*
 * Modèle de configuration.
 * Copier ce fichier vers config.php (non versionné) et renseigner les valeurs.
 * Les clés absentes prennent les valeurs par défaut définies dans src/Config.php.
 */
return [
    'app' => [
        // true uniquement en développement : ajoute le détail des erreurs internes dans les réponses
        'debug' => false,
        'timezone' => 'Europe/Paris',
        // Cookie de session réservé à HTTPS : laisser true en production
        'secure_cookies' => true,
    ],
    'db' => [
        'host' => '127.0.0.1',
        'port' => 3306,
        'name' => 'collector',
        'user' => 'root',
        'password' => '',
    ],
    'admin' => [
        // Hash du mot de passe partagé des responsables (généré par bin/hash-password.php)
        'password_hash' => '',
    ],
    'appareils' => [
        // Liste des appareils : « Connecté » si la dernière synchronisation date de moins de N minutes
        // (le téléphone se synchronise toutes les 30 secondes tant que l'application est ouverte)
        'connecte_minutes' => 2,
    ],
    'log' => [
        // Journal technique : un fichier par jour, var/log/collector-AAAA-MM-JJ.log
        'enabled' => true,
        // info (toutes les requêtes), warning (refus et requêtes lentes) ou error (erreurs internes)
        'level' => 'info',
        // Nombre de jours conservés ; les fichiers plus anciens sont supprimés automatiquement
        'retention_days' => 30,
    ],
];
