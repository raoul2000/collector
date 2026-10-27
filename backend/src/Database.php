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
    public static function connect(array $db, string $timezone, bool $selectDatabase = true): PDO
    {
        $dsn = sprintf('mysql:host=%s;port=%d;charset=utf8mb4', $db['host'], $db['port'])
            . ($selectDatabase ? ';dbname=' . $db['name'] : '');

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

    /**
     * Crée la base si elle n'existe pas (en la supprimant d'abord si $dropFirst). Réservé au développement et aux tests.
     *
     * @param array{host: string, port: int, name: string, user: string, password: string} $db
     */
    public static function create(array $db, string $timezone, bool $dropFirst = false): void
    {
        if (preg_match('/^\w+$/', $db['name']) !== 1) {
            throw new \InvalidArgumentException("Nom de base invalide : {$db['name']}");
        }

        $server = self::connect($db, $timezone, selectDatabase: false);
        if ($dropFirst) {
            $server->exec("DROP DATABASE IF EXISTS `{$db['name']}`");
        }
        $server->exec(
            "CREATE DATABASE IF NOT EXISTS `{$db['name']}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci",
        );
    }
}
