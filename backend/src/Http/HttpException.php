<?php

declare(strict_types=1);

namespace App\Http;

use RuntimeException;

/**
 * Erreur métier ou protocolaire renvoyée au client sous forme de réponse JSON.
 */
final class HttpException extends RuntimeException
{
    /**
     * @param array<string, mixed>  $details informations complémentaires (ex. erreurs de validation par champ)
     * @param array<string, string> $headers en-têtes HTTP à ajouter à la réponse
     */
    public function __construct(
        public readonly int $status,
        public readonly string $errorCode,
        string $message,
        public readonly array $details = [],
        public readonly array $headers = [],
    ) {
        parent::__construct($message);
    }

    public static function badRequest(string $message, string $errorCode = 'bad_request'): self
    {
        return new self(400, $errorCode, $message);
    }

    public static function unauthorized(string $message = 'Authentification requise.'): self
    {
        return new self(401, 'unauthorized', $message);
    }

    public static function forbidden(string $message = 'Accès refusé.'): self
    {
        return new self(403, 'forbidden', $message);
    }

    public static function notFound(string $message = 'Ressource introuvable.'): self
    {
        return new self(404, 'not_found', $message);
    }

    /**
     * @param list<string> $allowed
     */
    public static function methodNotAllowed(array $allowed): self
    {
        return new self(405, 'method_not_allowed', 'Méthode non autorisée.', [], ['Allow' => implode(', ', $allowed)]);
    }

    public static function conflict(string $message, string $errorCode = 'conflict'): self
    {
        return new self(409, $errorCode, $message);
    }

    /**
     * @param array<string, string> $fieldErrors message d'erreur par champ
     */
    public static function validation(array $fieldErrors, string $message = 'Données invalides.'): self
    {
        return new self(422, 'validation_error', $message, ['fields' => $fieldErrors]);
    }

    public function toResponse(): JsonResponse
    {
        $error = ['code' => $this->errorCode, 'message' => $this->getMessage()];
        if ($this->details !== []) {
            $error['details'] = $this->details;
        }

        return new JsonResponse(['error' => $error], $this->status, $this->headers);
    }
}
