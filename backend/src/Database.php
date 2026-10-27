<?php

declare(strict_types=1);

namespace App;

use DateTimeImmutable;
use DateTimeZone;
use PDO;

final class Database
{
    /**
     * Ouvre une connexion PDO MySQL.
     *
     * Le fuseau horaire de la session MySQL est aligné sur celui de l'application par un décalage (+01:00, +02:00…)
     * plutôt que par un nom : les tables de fuseaux horaires ne sont pas toujours installées sur les serveurs MySQL.
     *
     * @param array{host: string, port: int, name: string, user: string, password: string} $db
     */
    public static function connect(array $db, string $timezone): PDO
    {
        $dsn = sprintf('mysql:host=%s;port=%d;dbname=%s;charset=utf8mb4', $db['host'], $db['port'], $db['name']);

        $pdo = new PDO($dsn, $db['user'], $db['password'], [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::ATTR_STRINGIFY_FETCHES => false,
        ]);

        $offset = new DateTimeImmutable('now', new DateTimeZone($timezone))->format('P');
        $pdo->exec("SET time_zone = '{$offset}'");

        return $pdo;
    }
}
