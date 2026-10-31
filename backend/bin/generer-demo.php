<?php

declare(strict_types=1);

/*
 * Saisies de démonstration pour le développement (bilans, listes) : quelques bénévoles par magasin saisissent,
 * pendant les deux jours de la campagne active, des articles de la liste des catégories.
 *
 *   php bin/generer-demo.php                 environ 800 saisies
 *   php bin/generer-demo.php --saisies=2000
 *
 * Réservé au développement (app.debug = true). Les saisies existantes sont conservées.
 */

use App\Config;
use App\Database;

$appDir = dirname(__DIR__);
require $appDir . '/vendor/autoload.php';

$config = Config::load($appDir);
if ($config['app']['debug'] !== true) {
    fwrite(STDERR, "Réservé au développement (app.debug = true).\n");
    exit(1);
}
$options = getopt('', ['saisies:']);
$nombre = max(1, (int) ($options['saisies'] ?? 800));
$pdo = Database::connect($config['db'], $config['app']['timezone']);

$campagne = $pdo->query('SELECT id, date_debut, date_fin FROM campagne WHERE active = 1')->fetch();
if ($campagne === false) {
    fwrite(STDERR, "Aucune campagne active.\n");
    exit(1);
}
$magasins = $pdo->query("SELECT magasin_id FROM campagne_magasin WHERE campagne_id = {$campagne['id']}")->fetchAll(PDO::FETCH_COLUMN);
$categories = $pdo->query('SELECT id, unite FROM categorie WHERE active = 1 ORDER BY ordre')->fetchAll();
$formats = [];
foreach ($pdo->query('SELECT id, categorie_id, contenance FROM format ORDER BY ordre')->fetchAll() as $f) {
    $formats[(int) $f['categorie_id']][] = $f;
}
if ($magasins === [] || $categories === []) {
    fwrite(STDERR, "Il faut des magasins participants et des catégories.\n");
    exit(1);
}

// Les premières catégories de la liste (épicerie, conserves) sont les plus fréquentes
$poids = array_map(static fn (int $rang): float => 1 / sqrt($rang + 1), array_keys($categories));
$tirerCategorie = static function () use ($categories, $poids): array {
    $r = mt_rand() / mt_getrandmax() * array_sum($poids);
    foreach ($categories as $i => $categorie) {
        if (($r -= $poids[$i]) <= 0) {
            return $categorie;
        }
    }

    return $categories[array_key_last($categories)];
};

$prenoms = ['Marie', 'Paul', 'Sophie', 'Karim', 'Léa', 'Jean', 'Fatou', 'Hugo', 'Inès', 'Louis', 'Chloé', 'Nadia'];
$appareils = [];
foreach ($magasins as $i => $magasin) {
    foreach (array_slice($prenoms, ($i * 2) % count($prenoms), 2) as $prenom) {
        $appareils[] = ['id' => uuid(), 'prenom' => $prenom, 'magasin' => (int) $magasin];
    }
}

$jours = [$campagne['date_debut'], $campagne['date_fin']];
$insertAppareil = $pdo->prepare('INSERT INTO appareil (id, prenom, cree_le, vu_le) VALUES (?, ?, ?, ?)');
$insertSaisie = $pdo->prepare(
    'INSERT INTO saisie (id, campagne_id, magasin_id, appareil_id, categorie_id, quantite, contenance_unitaire, format_id,
                         saisie_le, modifie_le)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
);

Database::transaction($pdo, function () use ($appareils, $jours, $nombre, $campagne, $tirerCategorie, $formats, $insertAppareil, $insertSaisie): void {
    foreach ($appareils as $appareil) {
        $insertAppareil->execute([$appareil['id'], $appareil['prenom'], $jours[0] . ' 08:30:00', $jours[1] . ' 19:00:00']);
    }
    for ($n = 0; $n < $nombre; $n++) {
        $appareil = $appareils[array_rand($appareils)];
        $categorie = $tirerCategorie();
        $boutons = $formats[(int) $categorie['id']] ?? [];
        $bouton = $boutons === [] || mt_rand(1, 10) === 1 ? null : $boutons[array_rand($boutons)];
        $contenance = match (true) {
            $bouton !== null => $bouton['contenance'],
            $categorie['unite'] === 'unite' => null,
            // Poids ou volume libre (sans bouton)
            default => mt_rand(1, 20) * 50,
        };
        $quand = sprintf('%s %02d:%02d:%02d', $jours[array_rand($jours)], mt_rand(9, 18), mt_rand(0, 59), mt_rand(0, 59));
        $insertSaisie->execute([
            uuid(), $campagne['id'], $appareil['magasin'], $appareil['id'], $categorie['id'],
            mt_rand(1, 10) <= 7 ? 1 : mt_rand(2, 6), $contenance, $bouton['id'] ?? null, $quand, $quand . '.000',
        ]);
    }
});

echo "Saisies de démonstration créées : {$nombre} (" . count($appareils) . " bénévoles).\n";

function uuid(): string
{
    $b = random_bytes(16);
    $b[6] = chr(ord($b[6]) & 0x0f | 0x40);
    $b[8] = chr(ord($b[8]) & 0x3f | 0x80);

    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($b), 4));
}
