<?php

declare(strict_types=1);

namespace App\Log;

use DateTimeImmutable;
use Throwable;

/**
 * Journal technique de l'API, au format texte : un fichier par jour (collector-AAAA-MM-JJ.log).
 *
 * Rotation : à la création du fichier du jour, les fichiers de plus de $retentionDays jours sont supprimés.
 * Une écriture impossible (droits, disque plein…) n'interrompt jamais la requête : write() renvoie alors false.
 *
 *   2026-11-27T10:15:02+01:00 INFO  a3f9c1d2 POST /api/sync 200 84ms appareil=7c2e1a0b saisies=3
 */
final class Logger
{
    public const array LEVELS = ['info' => 0, 'warning' => 1, 'error' => 2];

    private const array LABELS = ['info' => 'INFO ', 'warning' => 'WARN ', 'error' => 'ERROR'];

    private const string PREFIX = 'collector-';

    /**
     * @param string|null $dir dossier des fichiers ; null désactive le journal
     * @param key-of<self::LEVELS> $minLevel niveau minimal écrit
     * @param \Closure(): DateTimeImmutable|null $clock heure courante (tests)
     */
    public function __construct(
        private readonly ?string $dir,
        private readonly string $minLevel = 'info',
        private readonly int $retentionDays = 30,
        private readonly ?\Closure $clock = null,
    ) {
    }

    public static function disabled(): self
    {
        return new self(null);
    }

    /**
     * Écrit une ligne (et, pour une erreur, la trace de l'exception sur les lignes suivantes, indentées).
     *
     * @param key-of<self::LEVELS> $level
     * @return bool false si le journal est désactivé ou si l'écriture a échoué
     */
    public function write(string $level, string $message, ?Throwable $exception = null): bool
    {
        if ($this->dir === null) {
            return false;
        }
        if (self::LEVELS[$level] < self::LEVELS[$this->minLevel]) {
            return true;
        }

        $now = $this->clock !== null ? ($this->clock)() : new DateTimeImmutable();
        $line = $now->format('Y-m-d\TH:i:sP') . ' ' . self::LABELS[$level] . ' ' . self::clean($message) . "\n";
        if ($exception !== null) {
            $line .= preg_replace('/^/m', '    ', rtrim((string) $exception)) . "\n";
        }

        // Avertissements de PHP masqués : l'échec est signalé par la valeur de retour
        try {
            if (!is_dir($this->dir) && !@mkdir($this->dir, 0o775, true) && !is_dir($this->dir)) {
                return false;
            }
            $file = $this->dir . '/' . self::PREFIX . $now->format('Y-m-d') . '.log';
            $nouveau = !is_file($file);
            if (@file_put_contents($file, $line, FILE_APPEND | LOCK_EX) === false) {
                return false;
            }
            if ($nouveau) {
                $this->purge($now);
            }

            return true;
        } catch (Throwable) {
            return false;
        }
    }

    /**
     * Supprime les fichiers datés de plus de $retentionDays jours (le fichier du jour compte pour un jour).
     */
    private function purge(DateTimeImmutable $now): void
    {
        $limite = $now->modify('-' . ($this->retentionDays - 1) . ' days')->format('Y-m-d');
        foreach (glob($this->dir . '/' . self::PREFIX . '*.log') ?: [] as $file) {
            $date = substr(basename($file, '.log'), strlen(self::PREFIX));
            if (preg_match('/^\d{4}-\d{2}-\d{2}$/', $date) === 1 && $date < $limite) {
                @unlink($file);
            }
        }
    }

    /**
     * Une entrée = une ligne : les caractères de contrôle (sauts de ligne d'une URL forgée…) sont neutralisés.
     */
    private static function clean(string $message): string
    {
        return (string) preg_replace('/[\x00-\x1F\x7F]/', '?', $message);
    }
}
