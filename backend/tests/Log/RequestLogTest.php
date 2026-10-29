<?php

declare(strict_types=1);

namespace App\Tests\Log;

use App\App;
use App\Log\Logger;
use App\Tests\ApiTestCase;

/**
 * Journal des requêtes : une ligne par requête, avec les informations utiles au diagnostic.
 */
final class RequestLogTest extends ApiTestCase
{
    private string $dir;

    protected function setUp(): void
    {
        parent::setUp();
        $this->dir = sys_get_temp_dir() . '/collector-log-' . bin2hex(random_bytes(4));
        $this->logger = new Logger($this->dir);
    }

    protected function tearDown(): void
    {
        foreach (glob($this->dir . '/*') ?: [] as $file) {
            unlink($file);
        }
        if (is_dir($this->dir)) {
            rmdir($this->dir);
        }
        parent::tearDown();
    }

    public function testEachRequestIsLoggedWithItsIdStatusAndDuration(): void
    {
        $response = $this->request('GET', '/api/admin/saisies', query: ['campagne' => '2']);

        self::assertMatchesRegularExpression(
            '/^\S+ WARN  ' . $response->headers['X-Request-Id'] . ' GET \/api\/admin\/saisies\?campagne=2 401 \d+ms erreur=unauthorized$/',
            $this->lignes()[0],
        );
    }

    public function testAbsentSessionIsNotAWarning(): void
    {
        $this->request('GET', '/api/admin/session');

        self::assertStringContainsString(' INFO  ', $this->lignes()[0]);
    }

    public function testAdminRequestsNameTheResponsableAndLoginShowsTheTruncatedIp(): void
    {
        $this->request('POST', '/api/admin/login', ['prenom' => 'Marie Claire', 'motDePasse' => 'faux'], ip: '86.212.14.7');
        $this->loginAsAdmin('Marie Claire');
        $this->request('GET', '/api/admin/magasins');

        $lignes = $this->lignes();
        self::assertMatchesRegularExpression('/ WARN  \w+ POST \/api\/admin\/login 401 \d+ms erreur=\w+ ip=86\.212\.14\.x$/', $lignes[0]);
        self::assertMatchesRegularExpression('/ INFO  \w+ POST \/api\/admin\/login 200 \d+ms ip=127\.0\.0\.x$/', $lignes[1]);
        self::assertMatchesRegularExpression('/ INFO  \w+ GET \/api\/admin\/magasins 200 \d+ms responsable="Marie Claire"$/', $lignes[2]);
    }

    public function testSyncLogsTheDeviceAndTheExchange(): void
    {
        $this->request('POST', '/api/sync', ['prenom' => 'Marie', 'curseur' => null, 'saisies' => [['id' => 'pas-un-uuid']]], [
            'X-Device-Id' => 'a1a1a1a1-0000-4000-8000-000000000001',
        ]);

        self::assertMatchesRegularExpression(
            '/ INFO  \w+ POST \/api\/sync 200 \d+ms appareil=a1a1a1a1 envoyees=1 ok=0 conflits=0 rejets=1 recues=0$/',
            $this->lignes()[0],
        );
    }

    public function testIpIsTruncated(): void
    {
        self::assertSame('86.212.14.x', App::anonymizeIp('86.212.14.7'));
        self::assertSame('2a01:cb00:1234::/48', App::anonymizeIp('2a01:cb00:1234:5678::1'));
        self::assertSame('0:0:0::/48', App::anonymizeIp('::1'));
        self::assertSame('?', App::anonymizeIp(''));
    }

    /**
     * @return list<string>
     */
    private function lignes(): array
    {
        $files = glob($this->dir . '/collector-*.log') ?: [];
        self::assertCount(1, $files);

        return explode("\n", rtrim((string) file_get_contents($files[0])));
    }
}
