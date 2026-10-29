<?php

declare(strict_types=1);

namespace App\Tests\Log;

use App\Log\Logger;
use DateTimeImmutable;
use PHPUnit\Framework\TestCase;
use RuntimeException;

final class LoggerTest extends TestCase
{
    private string $dir;

    protected function setUp(): void
    {
        $this->dir = sys_get_temp_dir() . '/collector-log-' . bin2hex(random_bytes(4));
    }

    protected function tearDown(): void
    {
        foreach (glob($this->dir . '/*') ?: [] as $file) {
            unlink($file);
        }
        if (is_dir($this->dir)) {
            rmdir($this->dir);
        }
    }

    public function testWritesOneLinePerEntryInTheFileOfTheDay(): void
    {
        $logger = $this->logger('2026-11-27 10:15:02');

        self::assertTrue($logger->write('info', 'a3f9c1d2 GET /api/health 200 3ms'));
        self::assertTrue($logger->write('warning', "ligne\ninjectée"));

        self::assertSame(
            "2026-11-27T10:15:02+01:00 INFO  a3f9c1d2 GET /api/health 200 3ms\n"
            . "2026-11-27T10:15:02+01:00 WARN  ligne?injectée\n",
            file_get_contents($this->dir . '/collector-2026-11-27.log'),
        );
    }

    public function testErrorIsFollowedByTheIndentedTrace(): void
    {
        $this->logger('2026-11-27 10:15:02')->write('error', 'boum', new RuntimeException('détail'));

        $lignes = explode("\n", (string) file_get_contents($this->dir . '/collector-2026-11-27.log'));
        self::assertSame('2026-11-27T10:15:02+01:00 ERROR boum', $lignes[0]);
        self::assertStringStartsWith('    RuntimeException: détail in ', $lignes[1]);
        self::assertStringStartsWith('    #0 ', $lignes[3]);
    }

    public function testEntriesBelowTheMinimumLevelAreIgnored(): void
    {
        $logger = $this->logger('2026-11-27 10:15:02', minLevel: 'warning');

        $logger->write('info', 'ignorée');
        $logger->write('error', 'gardée');

        self::assertStringNotContainsString('ignorée', (string) file_get_contents($this->dir . '/collector-2026-11-27.log'));
    }

    public function testOldFilesAreDeletedWhenANewDayStarts(): void
    {
        mkdir($this->dir);
        foreach (['2026-10-28', '2026-10-29', '2026-11-26'] as $jour) {
            file_put_contents("{$this->dir}/collector-{$jour}.log", "x\n");
        }
        file_put_contents("{$this->dir}/autre.log", "x\n");

        // 30 jours conservés au 27/11 : du 29/10 au 27/11
        $this->logger('2026-11-27 00:00:01')->write('info', 'nouveau jour');

        $fichiers = array_map(basename(...), glob($this->dir . '/*') ?: []);
        sort($fichiers);
        self::assertSame(['autre.log', 'collector-2026-10-29.log', 'collector-2026-11-26.log', 'collector-2026-11-27.log'], $fichiers);
    }

    public function testFailuresNeverInterruptTheRequest(): void
    {
        self::assertFalse(Logger::disabled()->write('error', 'perdue'));

        // Le dossier du journal est en fait un fichier : écriture impossible
        file_put_contents($this->dir, 'pas un dossier');
        try {
            self::assertFalse($this->logger('2026-11-27 10:15:02')->write('info', 'perdue'));
        } finally {
            unlink($this->dir);
        }
    }

    /**
     * @param key-of<Logger::LEVELS> $minLevel
     */
    private function logger(string $now, string $minLevel = 'info'): Logger
    {
        $date = new DateTimeImmutable($now, new \DateTimeZone('Europe/Paris'));

        return new Logger($this->dir, $minLevel, 30, static fn (): DateTimeImmutable => $date);
    }
}
