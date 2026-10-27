<?php

declare(strict_types=1);

namespace App\Tests\Validation;

use App\Http\HttpException;
use App\Validation\Validator;
use PHPUnit\Framework\TestCase;

final class ValidatorTest extends TestCase
{
    public function testValidDataIsConverted(): void
    {
        $v = new Validator([
            'nom' => '  Pâtes ',
            'ordre' => 3,
            'active' => false,
            'debut' => '2026-11-27',
            'unite' => 'kg',
            'formats' => [250, 500],
        ]);

        self::assertSame('Pâtes', $v->string('nom', max: 5));
        self::assertSame(3, $v->int('ordre', 0, 10));
        self::assertFalse($v->bool('active'));
        self::assertSame('2026-11-27', $v->date('debut'));
        self::assertSame('kg', $v->enum('unite', ['kg', 'L', 'unite']));
        self::assertSame([250, 500], $v->intList('formats', 1, 1000, maxItems: 10));
        $v->validate();
        self::assertSame([], $v->errors());
    }

    public function testOptionalFieldsMayBeAbsent(): void
    {
        $v = new Validator(['ville' => '', 'ordre' => null]);

        self::assertSame('', $v->string('ville', max: 10, optional: true));
        self::assertNull($v->int('ordre', 0, 10, optional: true));
        self::assertNull($v->date('fin', optional: true));
        self::assertSame([], $v->errors());
    }

    public function testErrorsAreCollectedPerField(): void
    {
        $v = new Validator([
            'nom' => 'trop long',
            'vide' => '   ',
            'ordre' => '3',
            'quantite' => 0,
            'active' => 1,
            'debut' => '2026-02-30',
            'unite' => 'g',
            'formats' => [500, 500],
        ]);

        $v->string('nom', max: 5);
        $v->string('vide', max: 5);
        $v->string('absent', max: 5);
        $v->int('ordre', 0, 10);
        $v->int('quantite', 1, 999);
        $v->bool('active');
        $v->date('debut');
        $v->enum('unite', ['kg', 'L']);
        $v->intList('formats', 1, 1000, maxItems: 10);

        self::assertSame(
            [
                'nom' => 'Ce champ ne doit pas dépasser 5 caractères.',
                'vide' => 'Ce champ est obligatoire.',
                'absent' => 'Ce champ est obligatoire.',
                'ordre' => 'Ce champ doit être un nombre entier.',
                'quantite' => 'Ce champ doit être compris entre 1 et 999.',
                'active' => 'Ce champ doit valoir vrai ou faux.',
                'debut' => 'Date invalide (format attendu : AAAA-MM-JJ).',
                'unite' => 'Valeur invalide (valeurs possibles : kg, L).',
                'formats' => 'La liste contient des doublons.',
            ],
            $v->errors(),
        );
    }

    public function testIntListRejectsObjectsAndOutOfRangeValues(): void
    {
        $v = new Validator(['a' => ['x' => 1], 'b' => [0], 'c' => [1, 2, 3]]);

        $v->intList('a', 1, 10, maxItems: 5);
        $v->intList('b', 1, 10, maxItems: 5);
        $v->intList('c', 1, 10, maxItems: 2);

        self::assertSame(['a', 'b', 'c'], array_keys($v->errors()));
    }

    public function testFirstErrorOfAFieldIsKept(): void
    {
        $v = new Validator([]);
        $v->addError('nom', 'Premier');
        $v->addError('nom', 'Second');

        self::assertSame(['nom' => 'Premier'], $v->errors());
    }

    public function testValidateThrows422(): void
    {
        $v = new Validator([]);
        $v->string('nom', max: 5);

        try {
            $v->validate();
            self::fail('Une exception était attendue.');
        } catch (HttpException $e) {
            self::assertSame(422, $e->status);
            self::assertSame(['fields' => ['nom' => 'Ce champ est obligatoire.']], $e->details);
        }
    }
}
