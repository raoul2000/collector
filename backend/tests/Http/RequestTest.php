<?php

declare(strict_types=1);

namespace App\Tests\Http;

use App\Http\HttpException;
use App\Http\Request;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

final class RequestTest extends TestCase
{
    /**
     * @return iterable<string, array{string, string}>
     */
    public static function paths(): iterable
    {
        yield 'racine' => ['/', '/'];
        yield 'vide' => ['', '/'];
        yield 'slash final' => ['/api/health/', '/api/health'];
        yield 'sans slash initial' => ['api/health', '/api/health'];
    }

    #[DataProvider('paths')]
    public function testNormalizePath(string $input, string $expected): void
    {
        self::assertSame($expected, Request::normalizePath($input));
    }

    public function testHeadersAreCaseInsensitive(): void
    {
        $request = new Request('GET', '/', headers: ['X-Device-Id' => 'abc']);

        self::assertSame('abc', $request->header('x-device-id'));
        self::assertSame('abc', $request->header('X-DEVICE-ID'));
        self::assertNull($request->header('Authorization'));
    }

    public function testQueryReturnsScalarsOnly(): void
    {
        $request = new Request('GET', '/', ['magasin' => '3', 'liste' => ['a']]);

        self::assertSame('3', $request->query('magasin'));
        self::assertNull($request->query('liste'));
        self::assertSame('x', $request->query('absent', 'x'));
    }

    public function testJsonDecodesObjectBody(): void
    {
        $request = new Request('POST', '/', rawBody: '{"nom":"Carrefour","actif":true}');

        self::assertSame(['nom' => 'Carrefour', 'actif' => true], $request->json());
    }

    public function testEmptyBodyGivesEmptyArray(): void
    {
        self::assertSame([], new Request('POST', '/', rawBody: "  \n")->json());
    }

    public function testInvalidJsonThrowsBadRequest(): void
    {
        $this->expectExceptionObject(
            HttpException::badRequest('Le corps de la requête n\'est pas un JSON valide.', 'invalid_json'),
        );

        new Request('POST', '/', rawBody: '{nom:')->json();
    }

    public function testJsonListIsRejected(): void
    {
        $this->expectException(HttpException::class);

        new Request('POST', '/', rawBody: '[1, 2]')->json();
    }

    public function testWithParamsKeepsRequestData(): void
    {
        $request = new Request('PUT', '/api/x/1', ['q' => 'v'], ['X-A' => 'b'], '{"a":1}')
            ->withParams(['id' => '1']);

        self::assertSame('1', $request->param('id'));
        self::assertSame('v', $request->query('q'));
        self::assertSame('b', $request->header('x-a'));
        self::assertSame(['a' => 1], $request->json());
    }
}
