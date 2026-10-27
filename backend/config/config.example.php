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
];
