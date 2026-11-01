<?php

declare(strict_types=1);

use App\App;
use App\Auth\AdminAuth;
use App\Controller\Admin\AppareilController;
use App\Controller\Admin\CampagneController;
use App\Controller\Admin\CategorieController;
use App\Controller\Admin\MagasinController;
use App\Controller\Admin\RechercheController;
use App\Controller\Admin\SaisieController;
use App\Controller\Admin\SectionController;
use App\Controller\AdminAuthController;
use App\Controller\BilanController;
use App\Controller\HealthController;
use App\Controller\MaintenanceController;
use App\Controller\ReferentielController;
use App\Controller\SyncController;
use App\Http\JsonResponse;
use App\Http\Request;
use App\Migration\Migrator;
use App\Repository\AppareilRepository;
use App\Repository\BilanRepository;
use App\Repository\CampagneRepository;
use App\Repository\CategorieRepository;
use App\Repository\JournalRepository;
use App\Repository\MagasinRepository;
use App\Repository\RechercheRepository;
use App\Repository\SaisieRepository;
use App\Repository\SectionRepository;
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
    $admin = static fn (callable $handler): callable => static function (Request $q) use ($app, $auth, $handler): JsonResponse {
        $prenom = $auth()->require($q);
        $app->logContext('responsable', $prenom);

        return $handler($q, $prenom);
    };

    // --- Public ---------------------------------------------------------------------------------

    $r->get('/api/health', static fn (Request $q) => new HealthController($db)->show($q));

    $r->get('/api/referentiel', static fn (Request $q) => new ReferentielController(
        new CampagneRepository($db()),
        new MagasinRepository($db()),
        new CategorieRepository($db()),
        new SectionRepository($db()),
    )->show($q));

    $bilans = static fn (): BilanController => new BilanController(new CampagneRepository($db()), new BilanRepository($db()), new CategorieRepository($db()));
    $r->get('/api/bilans', static fn (Request $q) => $bilans()->public($q));

    $r->post('/api/sync', static function (Request $q) use ($app, $db): JsonResponse {
        $app->logContext('appareil', substr((string) $q->header('X-Device-Id'), 0, 8));
        // Prénom au moment de l'échange (la table appareil ne garde que le dernier)
        $prenom = $q->json()['prenom'] ?? null;
        if (is_string($prenom) && trim($prenom) !== '') {
            $app->logContext('benevole', mb_substr(trim($prenom), 0, 50));
        }
        $response = new SyncController(
            $db(),
            new AppareilRepository($db()),
            new SaisieRepository($db()),
            new SaisieRules($db()),
            new RechercheRepository($db()),
        )->sync($q);

        // Bilan de l'échange, pour le journal
        $statuts = array_count_values(array_column($response->data['resultats'] ?? [], 'statut'));
        $app->logContext('envoyees', count($response->data['resultats'] ?? []));
        foreach (['ok' => 'ok', 'conflit' => 'conflits', 'rejete' => 'rejets'] as $statut => $cle) {
            $app->logContext($cle, $statuts[$statut] ?? 0);
        }
        $app->logContext('recues', count($response->data['changements'] ?? []));

        return $response;
    });

    // --- Outil de déploiement (jeton de config.php) ------------------------------------------------

    $maintenance = static function () use ($app, $db, $config): MaintenanceController {
        $app->logContext('maintenance', 'oui');

        return new MaintenanceController(
            static fn (): Migrator => new Migrator($db(), dirname(__DIR__) . '/sql/migrations'),
            (string) $config['deploiement']['jeton'],
        );
    };
    $r->get('/api/maintenance/schema', static fn (Request $q) => $maintenance()->schema($q));
    $r->post('/api/maintenance/migrer', static fn (Request $q) => $maintenance()->migrate($q));

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
        new SectionRepository($db()),
        new JournalRepository($db()),
        new CampagneRepository($db()),
    );
    $sections = static fn (): SectionController => new SectionController(
        $db(),
        new SectionRepository($db()),
        new JournalRepository($db()),
    );
    $recherches = static fn (): RechercheController => new RechercheController(
        $db(),
        new CampagneRepository($db()),
        new RechercheRepository($db()),
        new CategorieRepository($db()),
        new JournalRepository($db()),
    );
    $r->get('/api/admin/recherches', $admin(static fn ($q, $p) => $recherches()->list($q, $p)));
    $r->post('/api/admin/recherches/mot-cle', $admin(static fn ($q, $p) => $recherches()->ajouterMotCle($q, $p)));
    $r->post('/api/admin/recherches/ignorer', $admin(static fn ($q, $p) => $recherches()->ignorer($q, $p)));

    $r->get('/api/admin/sections', $admin(static fn ($q, $p) => $sections()->list($q, $p)));
    $r->post('/api/admin/sections', $admin(static fn ($q, $p) => $sections()->create($q, $p)));
    $r->put('/api/admin/sections/ordre', $admin(static fn ($q, $p) => $sections()->reorder($q, $p)));
    $r->put('/api/admin/sections/{id}', $admin(static fn ($q, $p) => $sections()->update($q, $p)));
    $r->delete('/api/admin/sections/{id}', $admin(static fn ($q, $p) => $sections()->delete($q, $p)));

    $r->get('/api/admin/categories', $admin(static fn ($q, $p) => $categories()->list($q, $p)));
    $r->post('/api/admin/categories', $admin(static fn ($q, $p) => $categories()->create($q, $p)));
    // Déclarée avant /categories/{id} pour ne pas être capturée par celle-ci
    $r->put('/api/admin/categories/ordre', $admin(static fn ($q, $p) => $categories()->reorder($q, $p)));
    $r->put('/api/admin/categories/{id}', $admin(static fn ($q, $p) => $categories()->update($q, $p)));
    $r->put('/api/admin/categories/{id}/privilegiee', $admin(static fn ($q, $p) => $categories()->privilegier($q, $p)));
    $r->delete('/api/admin/categories/{id}', $admin(static fn ($q, $p) => $categories()->delete($q, $p)));

    $saisies = static fn (): SaisieController => new SaisieController(
        $db(),
        new SaisieRepository($db()),
        new SaisieRules($db()),
        new JournalRepository($db()),
        new CampagneRepository($db()),
    );
    $r->get('/api/admin/bilans', $admin(static fn ($q, $p) => $bilans()->admin($q, $p)));
    $r->get('/api/admin/bilans/aida', $admin(static fn ($q, $p) => $bilans()->aida($q, $p)));

    $r->get('/api/admin/saisies', $admin(static fn ($q, $p) => $saisies()->list($q, $p)));
    $r->get('/api/admin/saisies/export', $admin(static fn ($q, $p) => $saisies()->export($q, $p)));
    $r->post('/api/admin/saisies/magasin', $admin(static fn ($q, $p) => $saisies()->changeMagasin($q, $p)));
    $r->put('/api/admin/saisies/{id}',$admin(static fn ($q, $p) => $saisies()->update($q, $p)));
    $r->get('/api/admin/appareils', $admin(static fn ($q, $p) => new AppareilController(
        new CampagneRepository($db()),
        new AppareilRepository($db()),
        (int) $config['appareils']['connecte_minutes'],
    )->list($q, $p)));

    $r->delete('/api/admin/saisies/{id}', $admin(static fn ($q, $p) => $saisies()->delete($q, $p)));
};
