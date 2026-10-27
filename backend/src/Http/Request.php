<?php

declare(strict_types=1);

namespace App\Http;

use JsonException;

final class Request
{
    /** @var array<string, string> en-têtes, noms en minuscules */
    private readonly array $headers;

    /** @var array<string, mixed>|null corps JSON décodé (mis en cache) */
    private ?array $json = null;

    /**
     * @param array<string, mixed>  $query
     * @param array<string, string> $headers
     * @param array<string, string> $cookies
     * @param string                $ip      adresse IP du client
     * @param array<string, string> $params  paramètres extraits de l'URL par le routeur
     */
    public function __construct(
        public readonly string $method,
        public readonly string $path,
        private readonly array $query = [],
        array $headers = [],
        private readonly string $rawBody = '',
        private readonly array $cookies = [],
        public readonly string $ip = '',
        private readonly array $params = [],
    ) {
        $this->headers = array_change_key_case($headers, CASE_LOWER);
    }

    public static function fromGlobals(): self
    {
        $headers = [];
        foreach ($_SERVER as $key => $value) {
            if (str_starts_with($key, 'HTTP_')) {
                $headers[str_replace('_', '-', substr($key, 5))] = (string) $value;
            }
        }
        if (isset($_SERVER['CONTENT_TYPE'])) {
            $headers['content-type'] = (string) $_SERVER['CONTENT_TYPE'];
        }

        $path = parse_url((string) ($_SERVER['REQUEST_URI'] ?? '/'), PHP_URL_PATH);

        return new self(
            strtoupper((string) ($_SERVER['REQUEST_METHOD'] ?? 'GET')),
            self::normalizePath(is_string($path) ? $path : '/'),
            $_GET,
            $headers,
            (string) file_get_contents('php://input'),
            array_filter($_COOKIE, is_string(...)),
            (string) ($_SERVER['REMOTE_ADDR'] ?? ''),
        );
    }

    public static function normalizePath(string $path): string
    {
        return '/' . trim($path, '/');
    }

    public function header(string $name): ?string
    {
        return $this->headers[strtolower($name)] ?? null;
    }

    public function cookie(string $name): ?string
    {
        return $this->cookies[$name] ?? null;
    }

    public function query(string $name, ?string $default = null): ?string
    {
        $value = $this->query[$name] ?? null;

        return is_scalar($value) ? (string) $value : $default;
    }

    public function param(string $name): string
    {
        return $this->params[$name] ?? throw new \LogicException("Paramètre de route inconnu : {$name}");
    }

    /**
     * Paramètre de route numérique (identifiant). Une valeur non numérique donne une erreur 404.
     */
    public function intParam(string $name): int
    {
        $value = $this->param($name);
        if (preg_match('/^[1-9]\d{0,9}$/', $value) !== 1) {
            throw HttpException::notFound();
        }

        return (int) $value;
    }

    /**
     * @param array<string, string> $params
     */
    public function withParams(array $params): self
    {
        return new self(
            $this->method,
            $this->path,
            $this->query,
            $this->headers,
            $this->rawBody,
            $this->cookies,
            $this->ip,
            $params,
        );
    }

    /**
     * Corps de la requête décodé. Un corps vide donne un tableau vide.
     *
     * @return array<string, mixed>
     */
    public function json(): array
    {
        if ($this->json !== null) {
            return $this->json;
        }
        if (trim($this->rawBody) === '') {
            return $this->json = [];
        }

        try {
            $data = json_decode($this->rawBody, true, 64, JSON_THROW_ON_ERROR);
        } catch (JsonException) {
            throw HttpException::badRequest('Le corps de la requête n\'est pas un JSON valide.', 'invalid_json');
        }
        if (!is_array($data) || ($data !== [] && array_is_list($data))) {
            throw HttpException::badRequest('Le corps de la requête doit être un objet JSON.', 'invalid_json');
        }

        return $this->json = $data;
    }
}
