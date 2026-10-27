<?php

declare(strict_types=1);

namespace App\Http;

/**
 * Routeur minimal : associe une méthode HTTP et un motif d'URL (ex. /api/magasins/{id}) à un gestionnaire.
 */
final class Router
{
    /** @var list<array{method: string, regex: string, handler: callable(Request): JsonResponse}> */
    private array $routes = [];

    /** @param callable(Request): JsonResponse $handler */
    public function get(string $pattern, callable $handler): void
    {
        $this->add('GET', $pattern, $handler);
    }

    /** @param callable(Request): JsonResponse $handler */
    public function post(string $pattern, callable $handler): void
    {
        $this->add('POST', $pattern, $handler);
    }

    /** @param callable(Request): JsonResponse $handler */
    public function put(string $pattern, callable $handler): void
    {
        $this->add('PUT', $pattern, $handler);
    }

    /** @param callable(Request): JsonResponse $handler */
    public function patch(string $pattern, callable $handler): void
    {
        $this->add('PATCH', $pattern, $handler);
    }

    /** @param callable(Request): JsonResponse $handler */
    public function delete(string $pattern, callable $handler): void
    {
        $this->add('DELETE', $pattern, $handler);
    }

    /** @param callable(Request): JsonResponse $handler */
    public function add(string $method, string $pattern, callable $handler): void
    {
        $this->routes[] = [
            'method' => strtoupper($method),
            'regex' => self::compile(Request::normalizePath($pattern)),
            'handler' => $handler,
        ];
    }

    public function dispatch(Request $request): JsonResponse
    {
        $allowed = [];

        foreach ($this->routes as $route) {
            if (preg_match($route['regex'], $request->path, $matches) !== 1) {
                continue;
            }
            if ($route['method'] !== $request->method) {
                $allowed[] = $route['method'];
                continue;
            }

            $params = array_map(rawurldecode(...), array_filter($matches, is_string(...), ARRAY_FILTER_USE_KEY));

            return ($route['handler'])($request->withParams($params));
        }

        if ($allowed !== []) {
            throw HttpException::methodNotAllowed(array_values(array_unique($allowed)));
        }

        throw HttpException::notFound('Route introuvable.');
    }

    /**
     * Transforme un motif en expression régulière : les segments {nom} deviennent des groupes nommés.
     */
    private static function compile(string $pattern): string
    {
        $regex = preg_replace_callback(
            '/\{(\w+)\}|[^{]+/',
            static fn (array $m): string => ($m[1] ?? '') !== ''
                ? '(?P<' . $m[1] . '>[^/]+)'
                : preg_quote($m[0], '#'),
            $pattern,
        );

        return '#^' . $regex . '$#';
    }
}
