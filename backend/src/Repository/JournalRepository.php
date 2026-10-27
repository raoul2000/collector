<?php

declare(strict_types=1);

namespace App\Repository;

use PDO;

/**
 * Journal des actions des responsables (connexions, modifications de l'administration, corrections de saisies).
 */
final readonly class JournalRepository
{
    public function __construct(private PDO $db)
    {
    }

    /**
     * @param array<string, mixed>|null $details ex. ['avant' => [...], 'apres' => [...]]
     */
    public function log(
        string $prenom,
        string $action,
        ?string $entite = null,
        int|string|null $entiteId = null,
        ?array $details = null,
    ): void {
        $this->db->prepare(
            'INSERT INTO journal_admin (prenom, action, entite, entite_id, details) VALUES (?, ?, ?, ?, ?)',
        )->execute([
            $prenom,
            $action,
            $entite,
            $entiteId === null ? null : (string) $entiteId,
            $details === null ? null : json_encode($details, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR),
        ]);
    }
}
