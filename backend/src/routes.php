<?php

declare(strict_types=1);

use App\App;
use App\Auth\AdminAuth;
use App\Controller\Admin\CampagneController;
use App\Controller\Admin\CategorieController;
use App\Controller\Admin\MagasinController;
use App\Controller\Admin\SaisieController;
use App\Controller\AdminAuthController;
use App\Controller\HealthController;
use App\Controller\ReferentielController;
use App\Controller\SyncController;
use App\Http\JsonResponse;
use App\Http\Request;
use App\Repository\AppareilRepository;
use App\Repository\CampagneRepository;
use App\Repository\CategorieRepository;
use App\Repository\JournalRepository;
use App\Repository\MagasinRepository;
use App\Repository\SaisieRepository;
use App\Saisie\SaisieRules;

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

    $r->post('/api/sync', static fn (Request $q) => new SyncController(
        $db(),
        new AppareilRepository($db()),
        new SaisieRepository($db()),
        new SaisieRules($db()),
    )->sync($q));

    // --- Espace responsable ---------------------------------------------------------------------

    $r->post('/api/admin/login', static fn (Request $q) => new AdminAuthController($auth())->login($q));
    $r->post('/api/admin/logout', static fn (Request $q) => new AdminAuthController($auth())->logout($q));
    $r->get('/api/admin/session', static fn (Request $q) => new AdminAuthController($auth())->session($q));

    $campagnes = static fn (): CampagneController => new CampagneController(
        $db(),
        new CampagneRepository($db()),
        new MagasinRepository($db()),
        new JournalRepository($db()),
    );
    $r->get('/api/admin/campagnes', $admin(static fn ($q, $p) => $campagnes()->list($q, $p)));
    $r->post('/api/admin/campagnes', $admin(static fn ($q, $p) => $campagnes()->create($q, $p)));
    $r->put('/api/admin/campagnes/{id}', $admin(static fn ($q, $p) => $campagnes()->update($q, $p)));
    $r->delete('/api/admin/campagnes/{id}', $admin(static fn ($q, $p) => $campagnes()->delete($q, $p)));
    $r->post('/api/admin/campagnes/{id}/activer', $admin(static fn ($q, $p) => $campagnes()->activate($q, $p)));
    $r->post('/api/admin/campagnes/{id}/desactiver', $admin(static fn ($q, $p) => $campagnes()->deactivate($q, $p)));

    $magasins = static fn (): MagasinController => new MagasinController(
        $db(),
        new MagasinRepository($db()),
        new JournalRepository($db()),
    );
    $r->get('/api/admin/magasins', $admin(static fn ($q, $p) => $magasins()->list($q, $p)));
    $r->post('/api/admin/magasins', $admin(static fn ($q, $p) => $magasins()->create($q, $p)));
    $r->put('/api/admin/magasins/{id}', $admin(static fn ($q, $p) => $magasins()->update($q, $p)));
    $r->delete('/api/admin/magasins/{id}', $admin(static fn ($q, $p) => $magasins()->delete($q, $p)));

    $categories = static fn (): CategorieController => new CategorieController(
        $db(),
        new CategorieRepository($db()),
        new JournalRepository($db()),
    );
    $r->get('/api/admin/categories', $admin(static fn ($q, $p) => $categories()->list($q, $p)));
    $r->post('/api/admin/categories', $admin(static fn ($q, $p) => $categories()->create($q, $p)));
    // Déclarée avant /categories/{id} pour ne pas être capturée par celle-ci
    $r->put('/api/admin/categories/ordre', $admin(static fn ($q, $p) => $categories()->reorder($q, $p)));
    $r->put('/api/admin/categories/{id}', $admin(static fn ($q, $p) => $categories()->update($q, $p)));
    $r->delete('/api/admin/categories/{id}', $admin(static fn ($q, $p) => $categories()->delete($q, $p)));

    $saisies = static fn (): SaisieController => new SaisieController(
        $db(),
        new SaisieRepository($db()),
        new SaisieRules($db()),
        new JournalRepository($db()),
    );
    $r->get('/api/admin/saisies', $admin(static fn ($q, $p) => $saisies()->list($q, $p)));
    $r->put('/api/admin/saisies/{id}', $admin(static fn ($q, $p) => $saisies()->update($q, $p)));
    $r->delete('/api/admin/saisies/{id}', $admin(static fn ($q, $p) => $saisies()->delete($q, $p)));
};
