<?php

declare(strict_types=1);

namespace App\Tests\Controller;

use App\Auth\AdminAuth;
use App\Tests\ApiTestCase;

final class AdminAuthControllerTest extends ApiTestCase
{
    public function testLoginOpensSessionAndSetsSecureCookie(): void
    {
        $response = $this->request('POST', '/api/admin/login', ['prenom' => '  Sophie ', 'motDePasse' => self::ADMIN_PASSWORD]);

        self::assertSame(200, $response->status);
        self::assertSame(['prenom' => 'Sophie'], $response->data);
        self::assertMatchesRegularExpression(
            '/^collector_admin=[0-9a-f]{64}; Path=\/; Max-Age=43200; HttpOnly; SameSite=Strict; Secure$/',
            $response->headers['Set-Cookie'],
        );

        $session = $this->request('GET', '/api/admin/session');
        self::assertSame(200, $session->status);
        self::assertSame(['prenom' => 'Sophie'], $session->data);
    }

    public function testOnlyTokenHashIsStored(): void
    {
        $this->loginAsAdmin();
        $token = $this->cookies[AdminAuth::COOKIE];

        $stored = $this->db->query('SELECT jeton_hash FROM session_admin')->fetchColumn();
        self::assertSame(hash('sha256', $token), $stored);
    }

    public function testLoginIsJournaled(): void
    {
        $this->loginAsAdmin('Paul');

        $row = $this->db->query('SELECT prenom, action FROM journal_admin')->fetch();
        self::assertSame(['prenom' => 'Paul', 'action' => 'connexion'], $row);
    }

    public function testWrongPasswordIsRejected(): void
    {
        $response = $this->request('POST', '/api/admin/login', ['prenom' => 'Sophie', 'motDePasse' => 'mauvais']);

        self::assertSame(401, $response->status);
        self::assertSame('invalid_credentials', $response->data['error']['code']);
        self::assertArrayNotHasKey('Set-Cookie', $response->headers);
        self::assertSame(401, $this->request('GET', '/api/admin/session')->status);
    }

    public function testMissingFieldsGiveValidationError(): void
    {
        $response = $this->request('POST', '/api/admin/login', ['prenom' => ' ']);

        self::assertSame(422, $response->status);
        self::assertSame(['prenom', 'motDePasse'], array_keys($response->data['error']['details']['fields']));
    }

    public function testTooManyFailuresBlockTheIpEvenWithTheRightPassword(): void
    {
        for ($i = 0; $i < AdminAuth::MAX_FAILURES; $i++) {
            $this->request('POST', '/api/admin/login', ['prenom' => 'X', 'motDePasse' => 'mauvais'], ip: '10.0.0.1');
        }

        $blocked = $this->request('POST', '/api/admin/login', ['prenom' => 'X', 'motDePasse' => self::ADMIN_PASSWORD], ip: '10.0.0.1');
        self::assertSame(429, $blocked->status);

        $otherIp = $this->request('POST', '/api/admin/login', ['prenom' => 'Y', 'motDePasse' => self::ADMIN_PASSWORD], ip: '10.0.0.2');
        self::assertSame(200, $otherIp->status);
    }

    public function testLogoutEndsSessionAndClearsCookie(): void
    {
        $this->loginAsAdmin();

        $response = $this->request('POST', '/api/admin/logout');

        self::assertSame(204, $response->status);
        self::assertStringContainsString('Max-Age=0', $response->headers['Set-Cookie']);
        self::assertSame(0, (int) $this->db->query('SELECT COUNT(*) FROM session_admin')->fetchColumn());
    }

    public function testExpiredSessionIsRejected(): void
    {
        $this->loginAsAdmin();
        $this->db->exec('UPDATE session_admin SET expire_le = NOW() - INTERVAL 1 MINUTE');

        self::assertSame(401, $this->request('GET', '/api/admin/session')->status);
    }

    public function testUnknownTokenIsRejected(): void
    {
        $this->cookies[AdminAuth::COOKIE] = str_repeat('a', 64);

        self::assertSame(401, $this->request('GET', '/api/admin/session')->status);
    }

    public function testInsecureCookieWhenConfiguredForLocalDevelopment(): void
    {
        $response = $this->app(['app' => ['secure_cookies' => false]])->handle(new \App\Http\Request(
            'POST',
            '/api/admin/login',
            headers: ['X-Requested-With' => 'Collector'],
            rawBody: json_encode(['prenom' => 'Sophie', 'motDePasse' => self::ADMIN_PASSWORD], JSON_THROW_ON_ERROR),
        ));

        self::assertStringEndsWith('SameSite=Strict', $response->headers['Set-Cookie']);
    }

    public function testLoginFailsWhenPasswordIsNotConfigured(): void
    {
        $response = $this->app(['admin' => ['password_hash' => '']])->handle(new \App\Http\Request(
            'POST',
            '/api/admin/login',
            headers: ['X-Requested-With' => 'Collector'],
            rawBody: json_encode(['prenom' => 'Sophie', 'motDePasse' => 'x'], JSON_THROW_ON_ERROR),
        ));

        self::assertSame(503, $response->status);
    }
}
