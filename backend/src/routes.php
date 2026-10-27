<?php

declare(strict_types=1);

use App\App;
use App\Auth\AdminAuth;
use App\Controller\AdminAuthController;
use App\Controller\HealthController;
use App\Controller\ReferentielController;
use App\Http\JsonResponse;
use App\Http\Request;
use App\Repository\CampagneRepository;
use App\Repository\CategorieRepository;
use App\Repository\JournalRepository;
use App\Repository\MagasinRepository;

/**
 * Déclaration des routes de l'API.
 * Les services sont créés à la demande : la base n'est ouverte que si la route en a besoin.
 */
return static function (App $app): void {
    $r = $app->router;
    $config = $app->config();
    $db = $app->db(...);

    $auth = static fn (): AdminAuth => new AdminAuth(
        $db(),
        new JournalRepository($db()),
        (string) $config['admin']['password_hash'],
        (bool) $config['app']['secure_cookies'],
    );

    /**
     * Réserve une route aux responsables connectés ; le gestionnaire reçoit le prénom du responsable.
     *
     * @param callable(Request, string): JsonResponse $handler
     * @return callable(Request): JsonResponse
     */
    $admin = static fn (callable $handler): callable => static fn (Request $q): JsonResponse => $handler(
        $q,
        $auth()->require($q),
    );

    // --- Public ---------------------------------------------------------------------------------

    $r->get('/api/health', static fn (Request $q) => new HealthController($db)->show($q));

    $r->get('/api/referentiel', static fn (Request $q) => new ReferentielController(
        new CampagneRepository($db()),
        new MagasinRepository($db()),
        new CategorieRepository($db()),
    )->show($q));

    // --- Espace responsable ---------------------------------------------------------------------

    $r->post('/api/admin/login', static fn (Request $q) => new AdminAuthController($auth())->login($q));
    $r->post('/api/admin/logout', static fn (Request $q) => new AdminAuthController($auth())->logout($q));
    $r->get('/api/admin/session', static fn (Request $q) => new AdminAuthController($auth())->session($q));
};
