<?php

declare(strict_types=1);

namespace App\Tests\Http;

use App\Http\HttpException;
use App\Http\JsonResponse;
use App\Http\Request;
use App\Http\Router;
use PHPUnit\Framework\TestCase;

final class RouterTest extends TestCase
{
    public function testDispatchesToMatchingRoute(): void
    {
        $router = new Router();
        $router->get('/api/ping', static fn () => new JsonResponse(['pong' => true]));

        $response = $router->dispatch(new Request('GET', '/api/ping'));

        self::assertSame(200, $response->status);
        self::assertSame(['pong' => true], $response->data);
    }

    public function testExtractsAndDecodesRouteParameters(): void
    {
        $router = new Router();
        $router->get(
            '/api/magasins/{id}/saisies/{saisie}',
            static fn (Request $q) => new JsonResponse([$q->param('id'), $q->param('saisie')]),
        );

        $response = $router->dispatch(new Request('GET', '/api/magasins/12/saisies/a%20b'));

        self::assertSame(['12', 'a b'], $response->data);
    }

    public function testParameterDoesNotSpanSegments(): void
    {
        $router = new Router();
        $router->get('/api/magasins/{id}', static fn () => new JsonResponse(null));

        $this->expectExceptionObject(HttpException::notFound('Route introuvable.'));
        $router->dispatch(new Request('GET', '/api/magasins/12/autre'));
    }

    public function testPatternSpecialCharactersAreLiteral(): void
    {
        $router = new Router();
        $router->get('/api/bilans.json', static fn () => new JsonResponse('ok'));

        self::assertSame('ok', $router->dispatch(new Request('GET', '/api/bilans.json'))->data);

        $this->expectException(HttpException::class);
        $router->dispatch(new Request('GET', '/api/bilansXjson'));
    }

    public function testUnknownRouteThrowsNotFound(): void
    {
        $router = new Router();

        try {
            $router->dispatch(new Request('GET', '/api/inconnu'));
            self::fail('Une exception était attendue.');
        } catch (HttpException $e) {
            self::assertSame(404, $e->status);
        }
    }

    public function testWrongMethodThrowsMethodNotAllowedWithAllowHeader(): void
    {
        $router = new Router();
        $router->get('/api/magasins', static fn () => new JsonResponse([]));
        $router->post('/api/magasins', static fn () => new JsonResponse([]));

        try {
            $router->dispatch(new Request('DELETE', '/api/magasins'));
            self::fail('Une exception était attendue.');
        } catch (HttpException $e) {
            self::assertSame(405, $e->status);
            self::assertSame(['Allow' => 'GET, POST'], $e->headers);
        }
    }

    public function testFirstMatchingRouteWins(): void
    {
        $router = new Router();
        $router->get('/api/magasins/actifs', static fn () => new JsonResponse('actifs'));
        $router->get('/api/magasins/{id}', static fn () => new JsonResponse('id'));

        self::assertSame('actifs', $router->dispatch(new Request('GET', '/api/magasins/actifs'))->data);
        self::assertSame('id', $router->dispatch(new Request('GET', '/api/magasins/3'))->data);
    }
}
