<?php

declare(strict_types=1);

use App\App;
use App\Controller\HealthController;
use App\Http\Request;

/**
 * Déclaration des routes de l'API.
 * Les contrôleurs sont instanciés à la demande : la base n'est ouverte que si la route en a besoin.
 */
return static function (App $app): void {
    $r = $app->router;
    $db = $app->db(...);

    $r->get('/api/health', static fn (Request $q) => new HealthController($db)->show($q));
};
