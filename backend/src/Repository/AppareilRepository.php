<?php

declare(strict_types=1);

namespace App\Repository;

use DateTimeImmutable;
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

    /**
     * Appareils d'une campagne, le plus récemment vu en premier : ceux qui y ont des saisies et, si la campagne
     * est active, ceux qui se sont connectés depuis son premier jour (bénévole qui n'a encore rien saisi).
     *
     * @param array{id: int, dateDebut: string, active: bool} $campagne
     * @param int $connecteMinutes délai depuis la dernière synchronisation en deçà duquel l'appareil est « connecté »
     * @return list<array{
     *     id: string, prenom: string, magasinId: int|null, nbSaisies: int, nbArticles: int,
     *     derniereSaisie: string|null, creeLe: string, vuLe: string, vuIlYaSecondes: int, connecte: bool
     * }>
     */
    public function findByCampagne(array $campagne, int $connecteMinutes): array
    {
        $stmt = $this->db->prepare(
            'SELECT a.id, a.prenom, a.cree_le, a.vu_le,
                    TIMESTAMPDIFF(SECOND, a.vu_le, NOW()) AS vu_il_y_a,
                    COUNT(s.id) AS nb_saisies, COALESCE(SUM(s.quantite), 0) AS nb_articles,
                    MAX(s.saisie_le) AS derniere_saisie,
                    (SELECT s2.magasin_id FROM saisie s2
                     WHERE s2.appareil_id = a.id AND s2.campagne_id = :campagne2 AND s2.supprime_le IS NULL
                     ORDER BY s2.saisie_le DESC, s2.id LIMIT 1) AS magasin_id
             FROM appareil a
             LEFT JOIN saisie s ON s.appareil_id = a.id AND s.campagne_id = :campagne AND s.supprime_le IS NULL
             GROUP BY a.id, a.prenom, a.cree_le, a.vu_le
             HAVING nb_saisies > 0 OR (:active = 1 AND a.vu_le >= :debut)
             ORDER BY a.vu_le DESC, a.id',
        );
        $stmt->execute([
            'campagne' => $campagne['id'],
            'campagne2' => $campagne['id'],
            'active' => (int) $campagne['active'],
            'debut' => $campagne['dateDebut'],
        ]);

        $tz = new \DateTimeZone(date_default_timezone_get());
        $iso = static fn (?string $date): ?string => $date === null ? null : new DateTimeImmutable($date, $tz)->format(DATE_ATOM);

        return array_map(static fn (array $row): array => [
            'id' => (string) $row['id'],
            'prenom' => (string) $row['prenom'],
            'magasinId' => $row['magasin_id'] === null ? null : (int) $row['magasin_id'],
            'nbSaisies' => (int) $row['nb_saisies'],
            'nbArticles' => (int) $row['nb_articles'],
            'derniereSaisie' => $iso($row['derniere_saisie']),
            'creeLe' => (string) $iso((string) $row['cree_le']),
            'vuLe' => (string) $iso((string) $row['vu_le']),
            'vuIlYaSecondes' => max(0, (int) $row['vu_il_y_a']),
            'connecte' => (int) $row['vu_il_y_a'] < $connecteMinutes * 60,
        ], $stmt->fetchAll());
    }
}
