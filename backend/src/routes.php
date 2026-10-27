<?php

declare(strict_types=1);

use App\App;
use App\Controller\HealthController;
use App\Controller\ReferentielController;
use App\Http\Request;
use App\Repository\CampagneRepository;
use App\Repository\CategorieRepository;
use App\Repository\MagasinRepository;

/**
 * Déclaration des routes de l'API.
 * Les contrôleurs sont instanciés à la demande : la base n'est ouverte que si la route en a besoin.
 */
return static function (App $app): void {
    $r = $app->router;
    $db = $app->db(...);

    $r->get('/api/health', static fn (Request $q) => new HealthController($db)->show($q));

    $r->get('/api/referentiel', static fn (Request $q) => new ReferentielController(
        new CampagneRepository($db()),
        new MagasinRepository($db()),
        new CategorieRepository($db()),
    )->show($q));
};
