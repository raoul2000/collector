<?php

declare(strict_types=1);

namespace App;

use RuntimeException;

/**
 * Chargement de la configuration depuis config/config.php (non versionné), complétée par des valeurs par défaut.
 */
final class Config
{
    private const array DEFAULTS = [
        'app' => [
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
            'password_hash' => '',
        ],
    ];

    /**
     * @return array<string, mixed>
     */
    public static function load(string $appDir): array
    {
        $file = $appDir . '/config/config.php';
        if (!is_file($file)) {
            throw new RuntimeException(
                "Fichier de configuration absent : {$file}. Copier config/config.example.php vers config/config.php.",
            );
        }

        $config = require $file;
        if (!is_array($config)) {
            throw new RuntimeException("Le fichier {$file} doit retourner un tableau.");
        }

        return self::withDefaults($config);
    }

    /**
     * @param array<string, mixed> $config
     * @return array<string, mixed>
     */
    public static function withDefaults(array $config): array
    {
        return array_replace_recursive(self::DEFAULTS, $config);
    }
}
