<?php

declare(strict_types=1);

namespace App\Validation;

use App\Http\HttpException;
use DateTimeImmutable;

/**
 * Validation des données reçues par l'API.
 *
 * Chaque méthode lit un champ, le contrôle et le renvoie converti. En cas d'erreur, le message est mémorisé
 * et la méthode renvoie null ; validate() lève ensuite une erreur 422 regroupant tous les messages.
 *
 *   $v = new Validator($request->json());
 *   $nom = $v->string('nom', max: 100);
 *   $v->validate();
 */
final class Validator
{
    /** @var array<string, string> */
    private array $errors = [];

    /**
     * @param array<string, mixed> $data
     */
    public function __construct(private readonly array $data)
    {
    }

    public function has(string $field): bool
    {
        return array_key_exists($field, $this->data) && $this->data[$field] !== null;
    }

    /**
     * Chaîne débarrassée des espaces de début et de fin. Obligatoire et non vide, sauf si $optional
     * (auquel cas un champ absent donne null et une chaîne vide est acceptée).
     */
    public function string(string $field, int $max, bool $optional = false): ?string
    {
        if (!$this->has($field)) {
            return $optional ? null : $this->fail($field, 'Ce champ est obligatoire.');
        }
        $value = $this->data[$field];
        if (!is_string($value)) {
            return $this->fail($field, 'Ce champ doit être un texte.');
        }
        $value = trim($value);
        if ($value === '' && !$optional) {
            return $this->fail($field, 'Ce champ est obligatoire.');
        }
        if (mb_strlen($value) > $max) {
            return $this->fail($field, "Ce champ ne doit pas dépasser {$max} caractères.");
        }

        return $value;
    }

    public function int(string $field, int $min, int $max, bool $optional = false): ?int
    {
        if (!$this->has($field)) {
            return $optional ? null : $this->fail($field, 'Ce champ est obligatoire.');
        }
        $value = $this->data[$field];
        if (!is_int($value)) {
            return $this->fail($field, 'Ce champ doit être un nombre entier.');
        }
        if ($value < $min || $value > $max) {
            return $this->fail($field, "Ce champ doit être compris entre {$min} et {$max}.");
        }

        return $value;
    }

    public function bool(string $field, bool $optional = false): ?bool
    {
        if (!$this->has($field)) {
            return $optional ? null : $this->fail($field, 'Ce champ est obligatoire.');
        }
        $value = $this->data[$field];

        return is_bool($value) ? $value : $this->fail($field, 'Ce champ doit valoir vrai ou faux.');
    }

    /**
     * Date au format AAAA-MM-JJ.
     */
    public function date(string $field, bool $optional = false): ?string
    {
        if (!$this->has($field)) {
            return $optional ? null : $this->fail($field, 'Ce champ est obligatoire.');
        }
        $value = $this->data[$field];
        $date = is_string($value) ? DateTimeImmutable::createFromFormat('!Y-m-d', $value) : false;
        if ($date === false || $date->format('Y-m-d') !== $value) {
            return $this->fail($field, 'Date invalide (format attendu : AAAA-MM-JJ).');
        }

        return $value;
    }

    /**
     * @template T of string
     * @param list<T> $allowed
     * @return T|null
     */
    public function enum(string $field, array $allowed, bool $optional = false): ?string
    {
        if (!$this->has($field)) {
            return $optional ? null : $this->fail($field, 'Ce champ est obligatoire.');
        }
        $value = $this->data[$field];
        if (!is_string($value) || !in_array($value, $allowed, true)) {
            return $this->fail($field, 'Valeur invalide (valeurs possibles : ' . implode(', ', $allowed) . ').');
        }

        return $value;
    }

    /**
     * Liste d'entiers sans doublon, chacun compris entre $min et $max.
     *
     * @return list<int>|null
     */
    public function intList(string $field, int $min, int $max, int $maxItems, bool $optional = false): ?array
    {
        if (!$this->has($field)) {
            return $optional ? null : $this->fail($field, 'Ce champ est obligatoire.');
        }
        $value = $this->data[$field];
        if (!is_array($value) || !array_is_list($value)) {
            return $this->fail($field, 'Ce champ doit être une liste.');
        }
        if (count($value) > $maxItems) {
            return $this->fail($field, "La liste ne doit pas dépasser {$maxItems} éléments.");
        }
        foreach ($value as $item) {
            if (!is_int($item) || $item < $min || $item > $max) {
                return $this->fail($field, "Chaque valeur doit être un nombre entier compris entre {$min} et {$max}.");
            }
        }
        if (count(array_unique($value)) !== count($value)) {
            return $this->fail($field, 'La liste contient des doublons.');
        }

        return $value;
    }

    /**
     * Ajoute une erreur sur un champ (contrôles spécifiques faits par l'appelant).
     */
    public function addError(string $field, string $message): void
    {
        $this->errors[$field] ??= $message;
    }

    /**
     * @return array<string, string>
     */
    public function errors(): array
    {
        return $this->errors;
    }

    /**
     * @throws HttpException 422 si au moins un champ est invalide
     */
    public function validate(): void
    {
        if ($this->errors !== []) {
            throw HttpException::validation($this->errors);
        }
    }

    private function fail(string $field, string $message): null
    {
        $this->addError($field, $message);

        return null;
    }
}
