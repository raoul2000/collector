# Collector — Plan de réalisation

Ce document décrit les étapes de réalisation de l'application et suit leur avancement. Il est mis à jour au fil du projet.

Référence fonctionnelle et technique : [specifications.md](specifications.md).

**Légende** : ⬜ à faire · 🔄 en cours · ✅ terminé · ⏸️ en attente d'un élément extérieur

---

## État d'avancement

| Lot | Contenu | Statut |
|---|---|---|
| 0 | Environnement de développement | ✅ |
| 1 | Socle : base de données, API référentiel, administration minimale | 🔄 |
| 2 | Saisie bénévole, hors ligne et synchronisation | ⬜ |
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

## Lot 1 — Socle 🔄

Objectif : une base de données en place, une API qui expose le référentiel, et un espace responsable permettant de configurer une campagne (magasins, catégories, formats).

### 1.1 Squelette du backend PHP ✅
- ✅ `backend/composer.json` : autoload PSR-4 (`App\`), PHPUnit 12 en dépendance de développement
- ✅ Point d'entrée `backend/public/index.php` (recherche du dossier applicatif en dev et en prod) et `.htaccess`
- ✅ Noyau HTTP maison : `Router` (paramètres `{id}`, 404/405), `Request`, `JsonResponse`, `HttpException`, gestion centralisée des erreurs (réponses JSON ; détail des erreurs internes seulement en mode debug)
- ✅ Connexion PDO paresseuse (mode exceptions, `utf8mb4`, fuseau Europe/Paris)
- ✅ Configuration : `config.example.php` versionné, `config.php` local ignoré par Git
- ✅ Route `GET /api/health` (état de l'API et de la base)
- ✅ Commandes : `composer serve`, `composer test` — 23 tests OK

### 1.2 Schéma de la base de données ⬜
- `backend/sql/001_schema.sql` : tables `campagne`, `magasin`, `campagne_magasin`, `categorie`, `format`, `appareil`, `saisie`, `journal_admin` et index
- Petit outil de migration `backend/bin/migrate.php` (scripts numérotés + table `schema_version`)
- `backend/sql/seed_dev.sql` : une campagne, quelques magasins de test, **liste provisoire de catégories et formats** (en attendant la liste Croix-Rouge)
- Base de test séparée `collector_test` pour PHPUnit

### 1.3 API référentiel ⬜
- `GET /api/referentiel` : campagne active, magasins de la campagne, catégories actives (ordonnées) et leurs formats

### 1.4 Authentification responsable ⬜
- `POST /api/admin/login` (prénom + mot de passe partagé), `POST /api/admin/logout`, `GET /api/admin/session`
- Mot de passe haché (`password_hash`) dans la configuration ; script `backend/bin/hash-password.php` pour le générer
- Session PHP sécurisée (`HttpOnly`, `Secure`, `SameSite=Strict`), limitation des tentatives de connexion
- Protection des routes `/api/admin/*`

### 1.5 API d'administration ⬜
- CRUD **campagnes** (dont activation d'une campagne, une seule active à la fois)
- CRUD **magasins** et rattachement à une campagne
- CRUD **catégories** (unité kg / L / unité, ordre, activation) et de leurs **formats**
- Validation des entrées, journalisation dans `journal_admin`

### 1.6 Squelette du frontend ⬜
- Projet Vite + React + TypeScript (mode strict), ESLint
- React Router : routes `/` (bénévole) et `/admin` (responsable)
- TanStack Query, Zustand
- Thème CSS (variables : couleurs, espacements, typographie) et styles globaux
- Composants de base : `Button`, `TextField`, `Select`, `Dialog` (`<dialog>` natif), `Toast`, `Table`, `Card`
- Client HTTP typé pour l'API ; proxy Vite `/api` → `localhost:8000`

### 1.7 Écrans d'administration ⬜
- Connexion responsable
- Gestion des campagnes
- Gestion des magasins
- Gestion des catégories et de leurs formats (ordre, unité, formats prédéfinis)

### 1.8 Tests du lot 1 ⬜
- PHPUnit : routeur, validation, repositories (sur `collector_test`), authentification
- Vitest : mise en place et premiers tests (client API)

**Critère de fin de lot** : un responsable se connecte, crée une campagne, ses magasins et ses catégories ; `GET /api/referentiel` renvoie ces données ; tous les tests passent.

---

## Lot 2 — Saisie bénévole, hors ligne et synchronisation ⬜

Objectif : un bénévole saisit des articles depuis son téléphone, y compris sans réseau, et retrouve et corrige ses saisies.

### 2.1 PWA ⬜
- `vite-plugin-pwa` : manifeste, icônes, service worker (pré-cache de l'application)
- Gestion des mises à jour de l'application (proposition de rechargement)
- Invitation à l'ajout à l'écran d'accueil

### 2.2 Stockage local (Dexie) ⬜
- Tables locales : référentiel, saisies, file d'opérations, métadonnées (dernière synchronisation)
- Mise en cache du référentiel pour un fonctionnement hors ligne complet

### 2.3 Premier lancement et identification ⬜
- Génération et mémorisation de l'identifiant d'appareil (UUID)
- Saisie du prénom, choix du magasin ; mémorisation (Zustand `persist`)
- Magasin affiché en permanence, modifiable ; prénom modifiable dans les paramètres

### 2.4 Écran de saisie ⬜
- Grille de catégories (gros boutons, ordre défini par l'administration)
- Contenance selon l'unité : formats prédéfinis + champ libre (g/kg, cl/L) ; bouton « Contenance inconnue » avec avertissement
- Quantité [−] / [+] et saisie directe ; contrôles de cohérence et confirmation au-delà d'un seuil
- Validation, confirmation brève, retour à la grille ; « Annuler la dernière saisie »

### 2.5 Mes saisies ⬜
- Liste des saisies de l'appareil avec état de synchronisation
- Modification et suppression
- Mention « corrigée par un responsable »

### 2.6 API de synchronisation ⬜
- `POST /api/appareils` (enregistrement de l'appareil et du prénom)
- `POST /api/sync` : lot d'opérations idempotent (UUID client), contrôle d'appartenance, résolution des conflits (cf. spécifications 5.4), suppression logique
- `GET /api/mes-saisies` : saisies de l'appareil, y compris corrections des responsables

### 2.7 Moteur de synchronisation ⬜
- Module TypeScript indépendant de React
- Déclenchement au démarrage, au retour du réseau, périodiquement et manuellement
- Envoi par lots, nouvelles tentatives avec délai croissant, récupération des corrections
- Tests unitaires Vitest (cas nominal, coupure réseau, doublons, conflits)

### 2.8 Indicateur d'état ⬜
- « En ligne » / « Hors ligne » / « N saisies en attente d'envoi », bouton de synchronisation manuelle

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
