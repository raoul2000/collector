<?php

declare(strict_types=1);

namespace App\Repository;

use PDO;

final readonly class AppareilRepository
{
    public function __construct(private PDO $db)
    {
    }

    /**
     * Enregistre l'appareil s'il est inconnu, met à jour son prénom et sa date de dernière connexion sinon.
     */
    public function touch(string $id, string $prenom): void
    {
        $this->db->prepare(
            'INSERT INTO appareil (id, prenom) VALUES (?, ?)
             ON DUPLICATE KEY UPDATE prenom = ?, vu_le = NOW()',
        )->execute([$id, $prenom, $prenom]);
    }
}
