<?php

declare(strict_types=1);

namespace App\Repository;

use DateTimeImmutable;
use PDO;

/**
 * Format d'échange d'une saisie avec le téléphone :
 * - saisieLe, modifieLe : ISO 8601 avec fuseau ;
 * - majLe : marqueur opaque de la dernière écriture côté serveur (sert de version et de curseur de synchronisation).
 *
 * @phpstan-type SaisieRow array<string, mixed> ligne brute de la table saisie
 * @phpstan-type Saisie array{
 *     id: string, campagneId: int, magasinId: int, categorieId: int, quantite: int,
 *     contenanceUnitaire: int|null, formatId: int|null, saisieLe: string, modifieLe: string, supprime: bool,
 *     corrigeParResponsable: string|null, majLe: string
 * }
 */
final readonly class SaisieRepository
{
    public function __construct(private PDO $db)
    {
    }

    /**
     * @return SaisieRow|null
     */
    public function findRow(string $id, bool $forUpdate = false): ?array
    {
        $stmt = $this->db->prepare('SELECT * FROM saisie WHERE id = ?' . ($forUpdate ? ' FOR UPDATE' : ''));
        $stmt->execute([$id]);
        $row = $stmt->fetch();

        return $row === false ? null : $row;
    }

    /**
     * @return Saisie|null
     */
    public function find(string $id): ?array
    {
        $row = $this->findRow($id);

        return $row === null ? null : self::map($row);
    }

    /**
     * @param array{
     *     id: string, campagneId: int, magasinId: int, categorieId: int, quantite: int,
     *     contenanceUnitaire: int|null, formatId: int|null, saisieLe: DateTimeImmutable, modifieLe: DateTimeImmutable,
     *     supprime: bool
     * } $saisie
     */
    public function insert(string $appareilId, array $saisie): void
    {
        $this->db->prepare(
            'INSERT INTO saisie (id, campagne_id, magasin_id, appareil_id, categorie_id, quantite, contenance_unitaire,
                                 format_id, saisie_le, modifie_le, supprime_le)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        )->execute([
            $saisie['id'],
            $saisie['campagneId'],
            $saisie['magasinId'],
            $appareilId,
            $saisie['categorieId'],
            $saisie['quantite'],
            $saisie['contenanceUnitaire'],
            $saisie['formatId'],
            self::datetime($saisie['saisieLe']),
            self::datetimeMs($saisie['modifieLe']),
            $saisie['supprime'] ? self::datetimeMs($saisie['modifieLe']) : null,
        ]);
    }

    /**
     * Mise à jour par le téléphone qui a créé la saisie.
     *
     * @param array{
     *     campagneId: int, magasinId: int, categorieId: int, quantite: int, contenanceUnitaire: int|null,
     *     formatId: int|null, saisieLe: DateTimeImmutable, modifieLe: DateTimeImmutable, supprime: bool
     * } $saisie
     */
    public function updateFromDevice(string $id, array $saisie): void
    {
        $this->db->prepare(
            'UPDATE saisie
             SET campagne_id = ?, magasin_id = ?, categorie_id = ?, quantite = ?, contenance_unitaire = ?, format_id = ?,
                 saisie_le = ?, modifie_le = ?,
                 supprime_le = IF(?, COALESCE(supprime_le, ?), NULL)
             WHERE id = ?',
        )->execute([
            $saisie['campagneId'],
            $saisie['magasinId'],
            $saisie['categorieId'],
            $saisie['quantite'],
            $saisie['contenanceUnitaire'],
            $saisie['formatId'],
            self::datetime($saisie['saisieLe']),
            self::datetimeMs($saisie['modifieLe']),
            (int) $saisie['supprime'],
            self::datetimeMs($saisie['modifieLe']),
            $id,
        ]);
    }

    /**
     * Saisies d'un appareil écrites côté serveur après le curseur (toutes si le curseur est null),
     * suppressions comprises.
     *
     * @return list<Saisie>
     */
    public function changesForAppareil(string $appareilId, ?string $depuis): array
    {
        $sql = 'SELECT * FROM saisie WHERE appareil_id = ?';
        $params = [$appareilId];
        if ($depuis !== null) {
            $sql .= ' AND maj_le > ?';
            $params[] = $depuis;
        }
        $stmt = $this->db->prepare($sql . ' ORDER BY maj_le');
        $stmt->execute($params);

        return array_map(self::map(...), $stmt->fetchAll());
    }

    // --- Administration ------------------------------------------------------------------------

    private const string SELECT_DETAIL =
        'SELECT s.*, a.prenom, m.nom AS magasin_nom, c.nom AS categorie_nom, c.unite, c.code_reference,
                f.libelle AS format_libelle
         FROM saisie s
         JOIN appareil a ON a.id = s.appareil_id
         JOIN magasin m ON m.id = s.magasin_id
         JOIN categorie c ON c.id = s.categorie_id
         LEFT JOIN format f ON f.id = s.format_id';

    /**
     * Recherche paginée pour l'espace responsable, de la plus récente à la plus ancienne.
     *
     * @param array{campagneId?: int|null, magasinId?: int|null, categorieId?: int|null, appareilId?: string|null, prenom?: string|null, code?: string|null, sansCode?: bool, supprimees?: bool} $filtres
     * @return array{saisies: list<array<string, mixed>>, total: int}
     */
    public function search(array $filtres, int $page, int $parPage): array
    {
        $where = [];
        $params = [];
        foreach (['campagneId' => 's.campagne_id', 'magasinId' => 's.magasin_id', 'categorieId' => 's.categorie_id', 'appareilId' => 's.appareil_id'] as $filtre => $colonne) {
            if (($filtres[$filtre] ?? null) !== null) {
                $where[] = "{$colonne} = ?";
                $params[] = $filtres[$filtre];
            }
        }
        if (($filtres['prenom'] ?? '') !== '') {
            $where[] = 'a.prenom LIKE ?';
            $params[] = '%' . addcslashes((string) $filtres['prenom'], '%_\\') . '%';
        }
        if ($filtres['sansCode'] ?? false) {
            $where[] = 'c.code_reference IS NULL';
        } elseif (($filtres['code'] ?? '') !== '') {
            $where[] = 'c.code_reference LIKE ?';
            $params[] = '%' . addcslashes((string) $filtres['code'], '%_\\') . '%';
        }
        if (!($filtres['supprimees'] ?? false)) {
            $where[] = 's.supprime_le IS NULL';
        }
        $clause = $where === [] ? '' : ' WHERE ' . implode(' AND ', $where);

        $count = $this->db->prepare(
            'SELECT COUNT(*) FROM saisie s JOIN appareil a ON a.id = s.appareil_id JOIN categorie c ON c.id = s.categorie_id' . $clause,
        );
        $count->execute($params);

        $stmt = $this->db->prepare(
            self::SELECT_DETAIL . $clause . ' ORDER BY s.saisie_le DESC, s.id LIMIT ' . $parPage . ' OFFSET ' . (($page - 1) * $parPage),
        );
        $stmt->execute($params);

        return ['saisies' => array_map(self::mapDetail(...), $stmt->fetchAll()), 'total' => (int) $count->fetchColumn()];
    }

    /**
     * @return array<string, mixed>|null
     */
    public function findDetail(string $id): ?array
    {
        $stmt = $this->db->prepare(self::SELECT_DETAIL . ' WHERE s.id = ?');
        $stmt->execute([$id]);
        $row = $stmt->fetch();

        return $row === false ? null : self::mapDetail($row);
    }

    /**
     * Saisies non supprimées d'une campagne pour l'export Excel, dans l'ordre chronologique.
     * La date est l'heure locale du don, sans fuseau (« AAAA-MM-JJ HH:MM:SS »), telle qu'Excel l'affichera.
     *
     * @return list<array{
     *     saisieLe: string, magasin: string, ville: string, prenom: string, categorie: string,
     *     codeReference: string|null, variante: string|null, unite: string, quantite: int,
     *     contenanceUnitaire: int|null, corrigeParResponsable: string|null
     * }>
     */
    public function forExport(int $campagneId): array
    {
        $stmt = $this->db->prepare(
            'SELECT s.saisie_le, m.nom AS magasin, m.ville, a.prenom, c.nom AS categorie, c.code_reference, c.unite,
                    f.libelle AS variante, s.quantite, s.contenance_unitaire, s.modifie_par_responsable
             FROM saisie s
             JOIN appareil a ON a.id = s.appareil_id
             JOIN magasin m ON m.id = s.magasin_id
             JOIN categorie c ON c.id = s.categorie_id
             LEFT JOIN format f ON f.id = s.format_id
             WHERE s.campagne_id = ? AND s.supprime_le IS NULL
             ORDER BY s.saisie_le, s.id',
        );
        $stmt->execute([$campagneId]);

        return array_map(static fn (array $row): array => [
            'saisieLe' => (string) $row['saisie_le'],
            'magasin' => (string) $row['magasin'],
            'ville' => (string) $row['ville'],
            'prenom' => (string) $row['prenom'],
            'categorie' => (string) $row['categorie'],
            'codeReference' => $row['code_reference'] === null ? null : (string) $row['code_reference'],
            'variante' => $row['variante'] === null ? null : (string) $row['variante'],
            'unite' => (string) $row['unite'],
            'quantite' => (int) $row['quantite'],
            'contenanceUnitaire' => $row['contenance_unitaire'] === null ? null : (int) $row['contenance_unitaire'],
            'corrigeParResponsable' => $row['modifie_par_responsable'] === null ? null : (string) $row['modifie_par_responsable'],
        ], $stmt->fetchAll());
    }

    /**
     * Correction par un responsable : elle sera renvoyée au téléphone et l'emportera sur ses modifications
     * antérieures (cf. SyncController).
     */
    public function correct(
        string $id,
        string $prenom,
        int $magasinId,
        int $categorieId,
        int $quantite,
        ?int $contenanceUnitaire,
        ?int $formatId,
    ): void {
        $this->db->prepare(
            'UPDATE saisie
             SET magasin_id = ?, categorie_id = ?, quantite = ?, contenance_unitaire = ?, format_id = ?,
                 modifie_le = NOW(3), corrige_le = NOW(3), modifie_par_responsable = ?
             WHERE id = ?',
        )->execute([$magasinId, $categorieId, $quantite, $contenanceUnitaire, $formatId, $prenom, $id]);
    }

    /**
     * Changement de magasin par un responsable (même effet sur la synchronisation qu'une correction).
     */
    public function changeMagasin(string $id, string $prenom, int $magasinId): void
    {
        $this->db->prepare(
            'UPDATE saisie
             SET magasin_id = ?, modifie_le = NOW(3), corrige_le = NOW(3), modifie_par_responsable = ?
             WHERE id = ?',
        )->execute([$magasinId, $prenom, $id]);
    }

    public function deleteByResponsable(string $id, string $prenom): void
    {
        $this->db->prepare(
            'UPDATE saisie
             SET supprime_le = NOW(3), modifie_le = NOW(3), corrige_le = NOW(3), modifie_par_responsable = ?
             WHERE id = ?',
        )->execute([$prenom, $id]);
    }

    /**
     * @param SaisieRow $row
     * @return array<string, mixed>
     */
    private static function mapDetail(array $row): array
    {
        $saisie = self::map($row);
        unset($saisie['majLe']);

        return $saisie + [
            'prenom' => (string) $row['prenom'],
            'magasinNom' => (string) $row['magasin_nom'],
            'categorieNom' => (string) $row['categorie_nom'],
            'unite' => (string) $row['unite'],
            'codeReference' => $row['code_reference'] === null ? null : (string) $row['code_reference'],
            'formatLibelle' => $row['format_libelle'] === null ? null : (string) $row['format_libelle'],
        ];
    }

    /**
     * Curseur de synchronisation à renvoyer au téléphone. Il est volontairement placé quelques secondes
     * dans le passé : une écriture concurrente en cours de validation ne peut pas être manquée
     * (les doublons éventuels sont sans effet côté téléphone).
     */
    public function cursor(): string
    {
        // Même format que maj_le (millisecondes) : « AAAA-MM-JJ HH:MM:SS.mmm »
        return (string) $this->db->query(
            "SELECT LEFT(DATE_FORMAT(NOW(3) - INTERVAL 5 SECOND, '%Y-%m-%d %H:%i:%s.%f'), 23)",
        )->fetchColumn();
    }

    /**
     * @param SaisieRow $row
     * @return Saisie
     */
    public static function map(array $row): array
    {
        $tz = new \DateTimeZone(date_default_timezone_get());

        return [
            'id' => (string) $row['id'],
            'campagneId' => (int) $row['campagne_id'],
            'magasinId' => (int) $row['magasin_id'],
            'categorieId' => (int) $row['categorie_id'],
            'quantite' => (int) $row['quantite'],
            'contenanceUnitaire' => $row['contenance_unitaire'] === null ? null : (int) $row['contenance_unitaire'],
            'formatId' => $row['format_id'] === null ? null : (int) $row['format_id'],
            'saisieLe' => new DateTimeImmutable((string) $row['saisie_le'], $tz)->format(DATE_ATOM),
            'modifieLe' => new DateTimeImmutable((string) $row['modifie_le'], $tz)->format('Y-m-d\TH:i:s.vP'),
            'supprime' => $row['supprime_le'] !== null,
            'corrigeParResponsable' => $row['modifie_par_responsable'],
            'majLe' => (string) $row['maj_le'],
        ];
    }

    private static function datetime(DateTimeImmutable $date): string
    {
        return $date->format('Y-m-d H:i:s');
    }

    private static function datetimeMs(DateTimeImmutable $date): string
    {
        return $date->format('Y-m-d H:i:s.v');
    }
}
