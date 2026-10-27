# Collector — Plan de réalisation

Ce document décrit les étapes de réalisation de l'application et suit leur avancement. Il est mis à jour au fil du projet.

Référence fonctionnelle et technique : [specifications.md](specifications.md).

**Légende** : ⬜ à faire · 🔄 en cours · ✅ terminé · ⏸️ en attente d'un élément extérieur

---

## État d'avancement

| Lot | Contenu | Statut |
|---|---|---|
| 0 | Environnement de développement | ✅ |
| 1 | Socle : base de données, API référentiel, administration minimale | ✅ |
| 2 | Saisie bénévole, hors ligne et synchronisation | 🔄 |
| 3 | Bilans | ⬜ |
| 4 | Déploiement et recette | ⬜ |

---

## Lot 0 — Environnement de développement ✅

- ✅ Node.js 26.8 / npm 11.19
- ✅ PHP 8.4.11 (extensions `pdo_mysql`, `mbstring`, `openssl`)
- ✅ Composer 2.10.3
- ✅ MySQL 8.0.43, base `collector` créée (`utf8mb4_unicode_ci`)
- ✅ Dépôt Git initialisé (branche `main`), `.gitignore`
- ✅ Spécifications v0.3

---

## Lot 1 — Socle ✅

Objectif : une base de données en place, une API qui expose le référentiel, et un espace responsable permettant de configurer une campagne (magasins, catégories, formats).

### 1.1 Squelette du backend PHP ✅
- ✅ `backend/composer.json` : autoload PSR-4 (`App\`), PHPUnit 12 en dépendance de développement
- ✅ Point d'entrée `backend/public/index.php` (recherche du dossier applicatif en dev et en prod) et `.htaccess`
- ✅ Noyau HTTP maison : `Router` (paramètres `{id}`, 404/405), `Request`, `JsonResponse`, `HttpException`, gestion centralisée des erreurs (réponses JSON ; détail des erreurs internes seulement en mode debug)
- ✅ Connexion PDO paresseuse (mode exceptions, `utf8mb4`, fuseau Europe/Paris)
- ✅ Configuration : `config.example.php` versionné, `config.php` local ignoré par Git
- ✅ Route `GET /api/health` (état de l'API et de la base)
- ✅ Commandes : `composer serve`, `composer test` — 23 tests OK

### 1.2 Schéma de la base de données ✅
- ✅ `backend/sql/migrations/001_schema_initial.sql` : tables `campagne`, `magasin`, `campagne_magasin`, `categorie`, `format`, `appareil`, `saisie`, `journal_admin`, index et contraintes (une seule campagne active, quantité 1–999, contenances positives, clés étrangères)
- ✅ Colonnes de synchronisation sur `saisie` : `modifie_le`, `supprime_le`, `corrige_le`, `maj_le` (précision à la milliseconde)
- ✅ Outil de migration `backend/bin/migrate.php` (scripts numérotés + table `schema_version` ; options `--fresh`, `--seed`, `--db`)
- ✅ `backend/sql/seed_dev.sql` : 2 campagnes, 5 magasins, **19 catégories provisoires** et 32 formats
- ✅ Base de test `collector_test` recréée à chaque exécution de PHPUnit, tests en transaction — 32 tests OK

### 1.3 API référentiel ✅
- ✅ `GET /api/referentiel` : campagne active, magasins actifs de la campagne, catégories actives (ordonnées) et leurs formats (liste de contenances en g ou ml)
- ✅ Champ `version` (empreinte du contenu) pour que le téléphone sache si sa copie locale est à jour
- ✅ Repositories `CampagneRepository`, `MagasinRepository`, `CategorieRepository` ; base de tests d'API (`ApiTestCase`) — 35 tests OK

### 1.4 Authentification responsable ✅
- ✅ `POST /api/admin/login` (prénom + mot de passe partagé), `POST /api/admin/logout`, `GET /api/admin/session`
- ✅ Mot de passe haché (`password_hash`) dans la configuration ; script `backend/bin/hash-password.php` pour le générer
- ✅ Sessions stockées en base (migration `002_authentification.sql`), cookie `HttpOnly` / `SameSite=Strict` / `Secure`, expiration après 12 h d'inactivité
- ✅ Limitation des tentatives : 5 échecs par IP sur 15 minutes
- ✅ Protection CSRF par l'en-tête `X-Requested-With` sur toutes les requêtes modifiant des données
- ✅ Garde `$admin(...)` pour protéger les routes `/api/admin/*` ; connexions journalisées
- ✅ Validateur générique des entrées (`Validator`, messages en français) — 53 tests OK

### 1.5 API d'administration ✅
- ✅ CRUD **campagnes**, rattachement des magasins, activation / désactivation (une seule active à la fois)
- ✅ CRUD **magasins** (même nom autorisé dans des villes différentes)
- ✅ CRUD **catégories** (unité kg / L / unité, ordre, activation, code de référence) et de leurs **formats** (max. 8, bornes 25 kg / 10 L) ; réordonnancement
- ✅ Garde-fous : suppression impossible si des saisies existent (désactivation proposée), unité non modifiable après saisies, magasin non détachable d'une campagne où il a des saisies
- ✅ Validation des entrées, journalisation avant/après dans `journal_admin` — 78 tests OK

### 1.6 Squelette du frontend ✅
- ✅ Projet Vite 8 + React 19 + TypeScript 7 (mode strict, `noUncheckedIndexedAccess`), linter **oxlint** (proposé par défaut par Vite, équivalent plus rapide d'ESLint)
- ✅ React Router 8 : `/` (bénévole), `/admin/*` (responsable), `/admin/connexion`, page introuvable
- ✅ TanStack Query (pas de nouvel essai sur les erreurs 4xx), Zustand (messages)
- ✅ Thème CSS (variables : couleurs à fort contraste, espacements, typographie, zones tactiles, encoches) et styles globaux
- ✅ Composants : `Button`, `TextField`, `Select`, `Checkbox`, `Dialog` (`<dialog>` natif), `ConfirmDialog`, `Toaster`, `Table`, `Card`, `Alert`
- ✅ Client HTTP typé (`ApiError`, erreurs par champ, détection d'absence de réseau) et types de l'API ; proxy Vite `/api` → `localhost:8000`
- ✅ Vitest + Testing Library — 26 tests OK ; build : 108 Ko compressés

### 1.7 Écrans d'administration ✅
- ✅ Connexion responsable, garde d'accès (redirection vers la connexion puis retour à la page demandée), retour automatique à la connexion à l'expiration de la session, déconnexion
- ✅ Gestion des campagnes : liste, création/modification (dates, magasins participants), activation avec confirmation, alerte si aucune campagne active, suppression
- ✅ Gestion des magasins : liste, création/modification, activation, suppression (bloquée s'il y a des saisies)
- ✅ Gestion des catégories : liste ordonnée (↑/↓), unité verrouillée après saisies, éditeur de formats (saisie en g/kg, cl/L/ml, tri, doublons), suppression
- ✅ Erreurs de validation du serveur affichées sous les champs ; messages de confirmation

### 1.8 Tests du lot 1 ✅
- ✅ PHPUnit : routeur, requêtes, validation, migrations et contraintes du schéma, référentiel, authentification, administration — 78 tests
- ✅ Vitest : client API, formats, composants, routes, parcours d'administration complets avec un faux serveur d'API — 48 tests

**Critère de fin de lot** ✅ : un responsable se connecte, crée une campagne, ses magasins et ses catégories ; `GET /api/referentiel` renvoie ces données ; tous les tests passent.

> À reprendre au lot 2 : charger l'espace responsable à la demande (découpage du code) pour alléger le chargement des bénévoles (actuellement 118 Ko compressés pour l'ensemble).

---

## Lot 2 — Saisie bénévole, hors ligne et synchronisation 🔄

Objectif : un bénévole saisit des articles depuis son téléphone, y compris sans réseau, et retrouve et corrige ses saisies.

### 2.1 PWA ✅
- ✅ `vite-plugin-pwa` : manifeste (nom, couleurs, mode autonome, portrait), icônes générées depuis `public/logo.svg` (`pwa-assets.config.ts`), service worker mettant en cache toute l'application (démarrage sans réseau), API jamais mise en cache
- ✅ Nouvelle version : bandeau « Mettre à jour » (vérification toutes les heures)
- ✅ Espace responsable chargé à la demande : ~115 Ko compressés au démarrage côté bénévole
- ➡️ Invitation à l'ajout à l'écran d'accueil : intégrée aux paramètres du bénévole (2.3)

### 2.2 Stockage local (Dexie) ✅
- ✅ Base IndexedDB `collector` : saisies (indicateur `aEnvoyer`, version serveur `baseMajLe`, motif de refus), référentiel, métadonnées (curseur, dernière synchronisation)
- ✅ Création, modification, suppression logique des saisies ; lectures réactives (`useMesSaisies`, `useNbAEnvoyer`, `useReferentiel`)
- ✅ Référentiel mis en cache, réécrit seulement si sa version change ; dates ISO avec le fuseau du téléphone
- ✅ Tests sur IndexedDB simulée (`fake-indexeddb`) — 56 tests OK

### 2.3 Premier lancement et identification ✅
- ✅ Identifiant d'appareil (UUID) généré une fois et conservé ; écran de bienvenue : prénom et magasin (grandes cases) ; demande de stockage persistant au navigateur
- ✅ Premier lancement sans réseau : message explicite et bouton « Réessayer » ; magasin retiré de la collecte : nouveau choix demandé (prénom conservé)
- ✅ Magasin affiché en permanence dans l'en-tête ; barre de navigation en bas (Saisir, Mes saisies, Réglages)
- ✅ Réglages : magasin, prénom, installation sur l'écran d'accueil (Android : bouton ; iPhone : instructions Safari), synchronisation manuelle, lien vers l'espace responsable

### 2.4 Écran de saisie ✅
- ✅ Grille de catégories (grandes cases, ordre défini par l'administration, indication poids / volume / à l'unité)
- ✅ Contenance selon l'unité : formats prédéfinis, « Autre… » (g/kg, cl/L/ml, virgule acceptée, 25 kg / 10 L max.), « Inconnu » avec confirmation (« le poids ne sera pas comptabilisé »)
- ✅ Quantité [−] / [+] et saisie directe ; confirmation au-delà de 50 articles
- ✅ Saisie courante en 3 touches (catégorie, format, Valider), retour immédiat à la grille, bandeau « ✓ 1 × Pâtes 500 g » avec « Annuler » pendant 8 s
- ✅ Saisie bloquée (message) sans collecte active ou sans catégorie — 88 tests OK

### 2.5 Mes saisies ⬜
- Liste des saisies de l'appareil avec état de synchronisation
- Modification et suppression
- Mention « corrigée par un responsable »

### 2.6 API de synchronisation ✅ (réalisée en premier : c'est le contrat utilisé par le téléphone)
- ✅ `POST /api/sync` (en-tête `X-Device-Id`) en un seul appel : enregistrement de l'appareil et de son prénom, envoi de l'état courant des saisies modifiées (200 max.), changements depuis le curseur (corrections des responsables, restauration sans curseur). Les routes `/api/appareils` et `/api/mes-saisies` initialement prévues sont devenues inutiles.
- ✅ Idempotence (UUID client), contrôle d'appartenance, suppression logique, renvois tardifs ignorés, corrections des responsables prioritaires (`conflit`), saisies invalides refusées une par une (`rejete`)
- ✅ Règles de validité communes (`SaisieRules`) : catégorie, quantité 1–999, contenance selon l'unité (25 kg / 10 L), magasin et campagne existants ; dates ISO 8601 converties en Europe/Paris — 94 tests OK

### 2.7 Moteur de synchronisation ✅
- ✅ Module TypeScript indépendant de React (`src/sync/engine.ts`) ; règles de fusion en fonctions pures (`merge.ts`)
- ✅ Synchronisation : référentiel, envoi par lots de 100 avec l'identifiant d'appareil, application des résultats (acceptée, corrigée par un responsable, refusée) et des changements serveur, mémorisation du curseur ; une seule synchronisation à la fois
- ✅ Déclenchement au démarrage, au retour du réseau, au retour au premier plan, 1,5 s après une saisie, toutes les 30 s ; après un échec, nouvelles tentatives espacées (5 s → 60 s)
- ✅ Identité du bénévole (identifiant d'appareil, prénom, magasin) conservée sur le téléphone (Zustand `persist`)
- ✅ Tests Vitest (nominal, coupure réseau, erreur serveur, corrections, lots, concurrence) — 71 tests OK

### 2.8 Indicateur d'état ✅
- ✅ Dans l'en-tête : « À jour », « N en attente », « Envoi… », « Hors ligne · N en attente », « Erreur d'envoi » ; un appui relance la synchronisation
- ✅ Tests des parcours (premier lancement, hors ligne, réglages) — 77 tests OK

### 2.9 Gestion des saisies par les responsables ⬜
- `GET /api/admin/saisies` (filtres : magasin, catégorie, prénom, période), modification, suppression
- Écran de consultation et de correction, journalisation (avant/après)

**Critère de fin de lot** : plusieurs téléphones saisissent en parallèle, avec et sans réseau ; aucune saisie perdue ni dupliquée ; les corrections d'un responsable redescendent sur le téléphone du bénévole.

---

## Lot 3 — Bilans ⬜

Objectif : suivre la collecte en temps réel et motiver les bénévoles.

### 3.1 API des bilans ⬜
- `GET /api/admin/bilans/magasin` : par catégorie (articles, kg, L, articles sans contenance) et par heure, pour un magasin ou tous
- `GET /api/bilans/public` : totaux du magasin, répartition par catégorie, total général, classement des magasins
- Tests des calculs (conversions g → kg, ml → L, exclusion des saisies supprimées)

### 3.2 Bilans responsables ⬜
- Tableaux et graphiques (Recharts) par catégorie et par heure, choix du magasin et de la campagne
- Rafraîchissement automatique (~30 s)

### 3.3 Bilans bénévoles ⬜
- Écran « Notre collecte » accessible depuis la saisie : magasin, catégories, total général, classement des magasins
- Rafraîchissement automatique quand le réseau est disponible

**Critère de fin de lot** : les bilans reflètent les saisies en moins d'une minute ; les totaux sont vérifiés par des tests.

---

## Lot 4 — Déploiement et recette ⬜

### 4.1 Déploiement Ionos ⏸️ (en attente du nom de domaine)
- Procédure de déploiement documentée (`docs/deploiement.md`) : build, arborescence serveur, `.htaccess`, configuration de production, installation SQL
- Script d'aide au déploiement
- HTTPS et vérification du service worker en production

### 4.2 Référentiel définitif ⏸️ (en attente de la liste Croix-Rouge)
- Import de la liste de référence des catégories, unités et formats

### 4.3 Recette ⬜
- Simulation de collecte avec plusieurs téléphones (Android et iPhone)
- Scénarios de coupure réseau, de changement de magasin, de corrections
- Vérification des exigences : saisie < 5 s, chargement initial < 300 Ko, lisibilité en extérieur
- Corrections

### 4.4 Documentation utilisateurs ⬜
- Fiche bénévole (1 page) : installation et saisie
- Guide responsable : préparation d'une campagne, suivi, corrections

---

## Éléments en attente

| Élément | Nécessaire pour |
|---|---|
| Liste de référence des catégories Croix-Rouge | 4.2 (une liste provisoire est utilisée d'ici là) |
| Nom de domaine / sous-domaine | 4.1 |

## Journal

| Date | Événement |
|---|---|
| 27/10/2026 | Spécifications v0.3 validées, environnement prêt, plan établi |
| 27/10/2026 | Étape 1.1 terminée : squelette du backend PHP |
| 27/10/2026 | Étape 1.2 terminée : schéma de la base, migrations, données de développement |
| 27/10/2026 | Étape 1.3 terminée : API du référentiel |
| 27/10/2026 | Étape 1.4 terminée : authentification des responsables |
| 27/10/2026 | Étape 1.5 terminée : API d'administration |
| 27/10/2026 | Étape 1.6 terminée : squelette du frontend |
| 27/10/2026 | Étapes 1.7 et 1.8 terminées : écrans d'administration et tests — **lot 1 terminé** |
| 27/10/2026 | Étape 2.6 terminée : API de synchronisation |
| 27/10/2026 | Étape 2.1 terminée : PWA |
| 27/10/2026 | Étape 2.2 terminée : stockage local |
| 27/10/2026 | Étape 2.7 terminée : moteur de synchronisation |
| 27/10/2026 | Étapes 2.3 et 2.8 terminées : identification du bénévole, indicateur de synchronisation |
| 27/10/2026 | Étape 2.4 terminée : écran de saisie |
