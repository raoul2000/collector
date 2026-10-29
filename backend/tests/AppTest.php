<?php

declare(strict_types=1);

namespace App\Tests;

use App\App;
use App\Config;
use App\Http\HttpException;
use App\Http\JsonResponse;
use App\Http\Request;
use PHPUnit\Framework\TestCase;
use RuntimeException;

final class AppTest extends TestCase
{
    public function testHttpExceptionBecomesJsonError(): void
    {
        $app = $this->app();
        $app->router->post('/api/test', static fn () => throw HttpException::validation(['nom' => 'Obligatoire.']));

        $response = $app->handle(new Request('POST', '/api/test', headers: ['X-Requested-With' => 'Collector']));

        self::assertSame(422, $response->status);
        self::assertSame(
            ['error' => [
                'code' => 'validation_error',
                'message' => 'Données invalides.',
                'details' => ['fields' => ['nom' => 'Obligatoire.']],
            ]],
            $response->data,
        );
    }

    public function testMutatingRequestWithoutCsrfHeaderIsRejected(): void
    {
        $app = $this->app();
        $app->router->post('/api/test', static fn () => new JsonResponse('ok'));
        $app->router->get('/api/test', static fn () => new JsonResponse('ok'));

        $response = $app->handle(new Request('POST', '/api/test'));
        self::assertSame(403, $response->status);
        self::assertSame('csrf', $response->data['error']['code']);

        self::assertSame(200, $app->handle(new Request('GET', '/api/test'))->status);
    }

    public function testUnknownRouteGives404(): void
    {
        $response = $this->app()->handle(new Request('GET', '/api/absent'));

        self::assertSame(404, $response->status);
        self::assertSame('not_found', $response->data['error']['code']);
    }

    public function testUnexpectedErrorIsHiddenWhenDebugIsOff(): void
    {
        $app = $this->app(debug: false);
        $app->router->get('/api/boom', static fn () => throw new RuntimeException('secret'));

        $response = $this->silently(static fn () => $app->handle(new Request('GET', '/api/boom')));

        self::assertSame(500, $response->status);
        $ref = $response->headers['X-Request-Id'];
        self::assertMatchesRegularExpression('/^[0-9a-f]{8}$/', $ref);
        self::assertSame(
            ['error' => ['code' => 'internal_error', 'message' => "Erreur interne du serveur (réf. {$ref}).", 'ref' => $ref]],
            $response->data,
        );
    }

    public function testEachResponseCarriesItsOwnRequestId(): void
    {
        $app = $this->app();
        $app->router->get('/api/test', static fn () => new JsonResponse('ok'));

        $a = $app->handle(new Request('GET', '/api/test'))->headers['X-Request-Id'];
        $b = $app->handle(new Request('GET', '/api/test'))->headers['X-Request-Id'];

        self::assertNotSame($a, $b);
    }

    public function testUnexpectedErrorIsDetailedWhenDebugIsOn(): void
    {
        $app = $this->app(debug: true);
        $app->router->get('/api/boom', static fn () => throw new RuntimeException('détail'));

        $response = $this->silently(static fn () => $app->handle(new Request('GET', '/api/boom')));

        self::assertSame(500, $response->status);
        self::assertSame('détail', $response->data['error']['debug']['message']);
    }

    public function testJsonBodyKeepsUnicodeAndSlashes(): void
    {
        self::assertSame('{"nom":"Pâtes / riz"}', new JsonResponse(['nom' => 'Pâtes / riz'])->body());
        self::assertSame('', JsonResponse::noContent()->body());
    }

    private function app(bool $debug = false): App
    {
        return new App(Config::withDefaults(['app' => ['debug' => $debug]]));
    }

    /**
     * Exécute $fn sans écrire les erreurs journalisées dans la sortie des tests.
     *
     * @template T
     * @param callable(): T $fn
     * @return T
     */
    private function silently(callable $fn): mixed
    {
        $previous = ini_set('error_log', PHP_OS_FAMILY === 'Windows' ? 'NUL' : '/dev/null');
        try {
            return $fn();
        } finally {
            ini_set('error_log', (string) $previous);
        }
    }
}
