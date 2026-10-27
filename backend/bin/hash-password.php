<?php

declare(strict_types=1);

/*
 * Génère le hash du mot de passe partagé des responsables, à copier dans config/config.php (admin.password_hash).
 *
 *   php bin/hash-password.php "mot de passe"
 */

$password = $argv[1] ?? '';
if ($password === '') {
    fwrite(STDERR, "Usage : php bin/hash-password.php \"mot de passe\"\n");
    exit(1);
}
if (mb_strlen($password) < 8) {
    fwrite(STDERR, "Le mot de passe doit contenir au moins 8 caractères.\n");
    exit(1);
}

echo password_hash($password, PASSWORD_DEFAULT), "\n";
