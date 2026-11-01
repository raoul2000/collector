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
| 2 | Saisie bénévole, hors ligne et synchronisation | ✅ |
| 3 | Bilans | ✅ |
| 4 | Déploiement et recette | 🔄 |

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

## Lot 2 — Saisie bénévole, hors ligne et synchronisation ✅

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

### 2.5 Mes saisies ✅
- ✅ Saisies du téléphone par jour (plus récentes en premier), résumé (saisies, articles), magasin indiqué s'il diffère du magasin courant
- ✅ État de chaque saisie : envoyée, en attente, corrigée par un responsable, refusée (avec le motif)
- ✅ Modification (catégorie, contenance, quantité) et suppression avec confirmation — 91 tests OK

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

### 2.9 Gestion des saisies par les responsables ✅
- ✅ `GET /api/admin/saisies` : filtres campagne, magasin, catégorie, prénom (recherche partielle), saisies supprimées ; pagination (50 par page)
- ✅ `PUT /api/admin/saisies/{id}` (correction du magasin, de la catégorie, de la contenance, de la quantité) et `DELETE` (suppression logique), journalisés avant/après ; la correction redescend sur le téléphone et l'emporte sur ses modifications hors ligne
- ✅ Écran « Saisies » : campagne active par défaut, filtres, statut (corrigée, supprimée), correction avec le même formulaire que les bénévoles, suppression confirmée
- ✅ Règle de synchronisation affinée : une modification faite par le téléphone après réception d'une correction est acceptée même si l'horloge du téléphone retarde

**Critère de fin de lot** ✅ : vérifié par les tests automatisés (102 côté serveur, 95 côté application) et par un scénario de bout en bout sur le serveur PHP et MySQL réels (deux téléphones, renvoi après réponse perdue, correction pendant une coupure réseau) : aucune saisie perdue ni dupliquée, la correction du responsable redescend sur le téléphone. **Reste à faire en recette (lot 4) : l'essai sur de vrais téléphones.**

---

## Lot 3 — Bilans ✅

Objectif : suivre la collecte en temps réel et motiver les bénévoles.

### 3.1 API des bilans ✅
- ✅ `GET /api/admin/bilans?campagne=&magasin=` (campagne active par défaut) : totaux, par catégorie (articles, kg ou L, articles sans contenance), par jour et par heure, par magasin (y compris sans saisie)
- ✅ `GET /api/bilans?magasin=` (bénévoles, sans prénom) : totaux et catégories du magasin, total général, classement des magasins par nombre d'articles
- ✅ Saisies supprimées et autres campagnes exclues ; poids et volumes totalisés en g / ml, jamais additionnés entre eux — 110 tests OK

### 3.2 Bilans responsables ✅
- ✅ Écran « Bilans » (page d'accueil de l'espace responsable) : choix de la campagne (active par défaut) et du magasin, actualisation automatique toutes les 30 s (l'affichage précédent reste visible pendant le rechargement)
- ✅ Chiffres clés : articles (et saisies), poids avec les articles sans poids ni volume, volume
- ✅ Graphiques Recharts (une seule série, une seule teinte validée, graduations rondes, infobulles, valeur au bout des barres) : par catégorie (trié), par heure (un graphique par jour, même échelle), par magasin ; chaque graphique a son tableau (« Voir le tableau »)
- ✅ Rendu vérifié par capture d'écran sur un jeu de 759 saisies ; Recharts n'est chargé que dans l'espace responsable
- ✅ Test instable du lot 2 élucidé et corrigé (assertion trop tôt sur l'en-tête) — 102 tests OK

### 3.3 Bilans bénévoles ✅
- ✅ Onglet « Collecte » (écran « Notre collecte ») : chiffres clés du magasin, catégories les plus collectées (6, puis « Voir les autres »), total général, classement des magasins avec le magasin du bénévole mis en avant (les autres en gris) — aucune comparaison entre bénévoles
- ✅ Barres en HTML/CSS (pas de bibliothèque de graphiques sur le téléphone) ; actualisation chaque minute ; message clair sans connexion (les derniers chiffres reçus restent affichés)
- ✅ Rendu vérifié par capture d'écran sur une largeur de téléphone (390 px)

### Compléments réalisés pendant le lot 3
- ✅ Page d'erreur propre (« Une erreur est survenue », bouton « Recharger ») à la place de la page technique de React Router
- ✅ Bilans des responsables exclus du pré-cache du service worker : 554 Ko au lieu de 912 Ko téléchargés d'avance sur chaque téléphone
- ✅ 110 tests côté serveur, 107 côté application

**Critère de fin de lot** ✅ : les bilans se mettent à jour automatiquement (30 s pour les responsables, 1 min pour les bénévoles ; un téléphone connecté envoie ses saisies 1,5 s après la saisie), soit moins d'une minute en conditions normales ; les totaux sont vérifiés par des tests sur un jeu de données couvrant poids, volumes, articles sans contenance, saisies supprimées et autres campagnes.

---

## Lot 4 — Déploiement et recette 🔄

### 4.1 Déploiement Ionos ✅
- ✅ Procédure documentée : [deploiement.md](deploiement.md) (préparation de l'hébergement, première installation avec ou sans SSH, mise à jour, retour arrière, sauvegardes, dépannage)
- ✅ Script `scripts/preparer-deploiement.mjs` : vérifications (lint, tests), compilation, paquet `deploy/package` (`www/`, `app/` avec dépendances de production uniquement, scripts SQL pour phpMyAdmin)
- ✅ `.htaccess` de production : HTTPS obligatoire, pages de l'application, en-têtes de cache (mises à jour du service worker), en-têtes de sécurité, dossier `app` interdit
- ✅ Vérifié en local : import de `installation.sql` sur une base vide, reconnaissance par `migrate.php`, API du paquet fonctionnelle ; correction de l'encodage des accents à l'import en ligne de commande (`SET NAMES utf8mb4`)
- ✅ Installation sur Ionos le 28/10/2026 : https://collecte.exdata.info (SFTP seulement, pas de SSH) ; `RewriteBase` ajouté aux `.htaccess` (sans lui, erreur 500 sur toute adresse réécrite) ; premiers essais réels concluants (campagne, saisies)

### 4.2 Référentiel Croix-Rouge ✅

Source : planche « Articles génériques » de la Croix-Rouge (AÏDA, version du 08/07/2026, onglet « Planche générique ») : fichier `.ods` d'origine non versionné (19 Mo) ; extrait versionné dans `docs/categories/planche-aida-2026-07-08.csv` (rubrique, dénomination, code AÏDA, tarif) : ~160 articles en 29 rubriques, un code AÏDA (EAN-13) par article, c'est-à-dire par rubrique **et** format.

Décisions (31/10/2026) :
- **Priorité à la saisie des bénévoles**, simple et rapide. La liste des bénévoles est **indépendante** des articles AÏDA, mais construite pour s'en rapprocher : les formats reprennent ceux de la planche. Le rapprochement avec AÏDA est une **deuxième phase**, côté responsable (4.5). Les tarifs de la planche ne sont pas exposés aux bénévoles.
- **Sections** : groupes de catégories, affichés comme repères dans une **grille unique** (intitulés de section + barre de sections pour y accéder directement), sans écran supplémentaire.
- **Variantes** : un bouton de format peut porter un libellé, avec ou sans contenance (Huile : « Olive / colza 1 L », « Tournesol, autres 1 L » ; Couches : T1-2 … T6) ; la saisie enregistre le bouton choisi.
- **Liste** : ~35 catégories en 7 sections (Épicerie salée, Conserves, Petit-déjeuner et sucré, Boissons, Bébé, Hygiène et entretien, Divers), sans fusion ; produits frais (sauf le lait), frais au kg, boulangerie, surgelés, circuits courts, chèques et bons d'achat écartés (« Autre » sinon).
- **Récents** : ligne des dernières catégories utilisées sur le téléphone, en haut de la grille.
- **Recherche** : champ avec auto-complétion sur le nom des catégories, des sections, des variantes et une liste de **mots-clés** par catégorie (pré-remplis, modifiables par les responsables) ; recherche hors ligne, sans accents ni majuscules, sur les débuts de mots ; un résultat de variante mène directement à cette variante.
- **Recherches sans résultat** : remontées au serveur à la synchronisation et présentées aux responsables, pour compléter les mots-clés.

Étapes :
- ✅ Sections : table `section` (migration 003), sections dans l'onglet Catégories (création, renommage, ordre, suppression sans perte des catégories), section de chaque catégorie, référentiel (`sections`, `sectionId`), grille groupée et barre de raccourcis sur l'écran de saisie
- ✅ Variantes : libellé des formats, variantes sans contenance pour les catégories à l'unité (migration 004), bouton choisi enregistré dans la saisie (`formatId` : synchronisation, Mes saisies, correction, liste des saisies, colonne « Variante » de l'export) ; identifiants des formats conservés à la modification ; référentiel compatible avec les versions antérieures (`formats` en contenances, `boutons` complets) ; bouton incohérent ignoré à la synchronisation, refusé en correction
- ✅ Liste Croix-Rouge : `docs/categories/liste-benevoles.csv` (7 sections, 35 catégories, une ligne par bouton avec l'article AÏDA visé, pour 4.5), SQL généré par `scripts/generer-categories.mjs` (`categories_initiales.sql`, `reinitialiser-referentiel.sql`) ; données de développement sur la nouvelle liste (`bin/generer-demo.php`)
- ✅ Remplacement de la liste d'essai en production (fait le 31/10/2026, tests concluants) (décision du 31/10/2026 : repartir de zéro, il n'y a que des saisies d'essai) : déploiement, puis `reinitialiser-referentiel.sql` dans phpMyAdmin ([déploiement](deploiement.md), section 5.3)
- ✅ Récents : les 4 dernières catégories utilisées sur le téléphone (d'après ses saisies, sans doublon, hors saisies supprimées et catégories retirées), avec le nom de leur section, en haut d'une grille de plus de 8 catégories
- ✅ Recherche par mots-clés : colonne `mots_cles` (migration 005), champ « Mots-clés » des catégories, mots-clés pré-remplis dans `liste-benevoles.csv` ; champ « Rechercher un produit » sur l'écran de saisie (hors ligne, sans accents ni majuscules, débuts de mots, singulier/pluriel), variantes ouvertes directement, « Autre » proposé sans résultat
- ✅ Recherches sans résultat : mot cherché et catégorie choisie ensuite, mémorisés sur le téléphone et envoyés avec la synchronisation (`recherches` / `recherchesRecues`, migration 006) ; cadre « Recherches sans résultat » de l'onglet Catégories (regroupement sans accents ni majuscules, catégorie le plus souvent choisie, **Ajouter** aux mots-clés, **Ignorer**)

### 4.3 Recette 🔄
- ✅ [Scénarios de recette](recette.md) validés le 01/11/2026 (40 scénarios avec ceux des produits à privilégier, Android et iPhone) ; à dérouler, nombre de participants à fixer
- Simulation de collecte avec plusieurs téléphones (Android et iPhone)
- Scénarios de coupure réseau, de changement de magasin, de corrections
- Vérification des exigences : saisie < 5 s, chargement initial < 300 Ko, lisibilité en extérieur
- Corrections

### 4.4 Documentation utilisateurs 🔄
- ✅ [Fiche bénévole](fiche-benevole.md) (une page) : installation, saisie, correction, voyant de synchronisation, bons réflexes
- ✅ [Guide du responsable](guide-responsable.md) : préparation (magasins, catégories, campagne, essai), suivi et corrections pendant la collecte, clôture, questions fréquentes
- ⬜ Version imprimable de la fiche bénévole avec l'adresse et le QR code

### 4.5 Rapprochement AÏDA ✅ (en production)

Réalisé le 01/11/2026, sans attendre la collecte : migration `007_codes_aida.sql` (colonne et codes de la liste), `GET /api/admin/bilans/aida`, écran « Réception AÏDA » depuis les Bilans. Les codes ne sont pas envoyés aux téléphones. À valider sur les vraies saisies après la collecte.

Décisions (01/11/2026) : les codes sont **saisis à la main dans AÏDA**, le bilan sert donc de liste à ressaisir (pas d'import de fichier) ; **pas de valorisation en euros** ; aucun changement pour les bénévoles, pas de champ de précision sur « Autre ». Sans tarifs ni import, ni table d'articles ni lecture du `.ods` : le CSV versionné suffit.

- ✅ Code AÏDA par bouton : nouvelle colonne sur `format`, pré-remplie depuis `liste-benevoles.csv`, modifiable dans l'onglet Catégories ; `code_reference` de la catégorie sert de code par défaut (catégories sans variante, contenance inconnue)
- ✅ Rattachement d'une saisie : bouton choisi → son code ; contenance libre → format le plus proche (à égale distance, le plus petit), signalé « à vérifier » sauf correspondance exacte avec un seul format ; contenance inconnue → code par défaut, sinon premier bouton, signalé « à vérifier » ; « Autre » → listé « non rapproché »
- ✅ Bilan « Réception AÏDA » d'une campagne : code, dénomination et nombre d'articles, dans un ordre commode pour la ressaisie, total général et filtre par magasin ; saisies à vérifier et non rapprochées à part ; version imprimable et export Excel
- ✅ Limite rappelée dans le bilan : chiffres déclarés par les bénévoles, à contrôler par rapport à l'entrepôt (hygiène et entretien restent sur les articles génériques)

### Bonus : scan des codes-barres ⬜ (pas pour l'édition 2026)
- Complément à la grille : un bouton « Scanner » pré-remplit catégorie et poids exact
- Lecture par une bibliothèque embarquée (Safari sur iPhone ne lit pas les codes-barres en natif : à tester en priorité)
- Base partagée code-barres → catégorie, alimentée par les bénévoles et par Open Food Facts quand le réseau le permet, synchronisée vers les téléphones
- Essai de faisabilité préalable sur une trentaine de produits réels

---

## Évolutions après la mise en production

### Code de référence dans les saisies ✅
- ✅ Colonne « Code » (code de référence actuel de la catégorie) dans l'onglet *Saisies* des responsables
- ✅ Filtres « Code » (recherche « contient », sans tenir compte des majuscules) et « Sans code de référence »
- ✅ Pour une saisie sans code, le tiret ouvre la catégorie pour lui ajouter un code ; la liste se met à jour à l'enregistrement
- La liste déroulante « Catégorie » du filtre reste sans code (choix de l'utilisateur : le nom est plus parlant)

---

## Éléments en attente

| Élément | Nécessaire pour |
|---|---|
| ~~Liste de référence des catégories Croix-Rouge~~ | Reçue le 31/10/2026 (4.2) |

## Reprise du travail

État au 01/11/2026 : lots 1, 2 et 3 terminés ; référentiel Croix-Rouge (4.2) et rapprochement AÏDA (4.5) terminés et **en production** sur https://collecte.exdata.info (migrations 001 à 008, liste des bénévoles installée par `reinitialiser-referentiel.sql`, tests concluants). Évolutions réalisées : code de référence dans les saisies, correction du magasin des saisies par le responsable, export Excel d'une campagne, liste des appareils, journal technique de l'API (voir [déploiement](deploiement.md), section 7), outil de mise à jour du serveur par SFTP (`scripts/deployer.mjs`, [déploiement](deploiement.md), section 5.1), sections, variantes, récents, recherche par mots-clés, recherches sans résultat.

Mise à jour de la production : `node scripts/deployer.mjs` (mot de passe SFTP demandé ; `--simulation` pour un essai à blanc). Modifier la liste des catégories : `docs/categories/liste-benevoles.csv`, puis `node scripts/generer-categories.mjs` (installation neuve) ; en production, la liste se modifie désormais depuis l'onglet Catégories (la remise à zéro supprimerait les saisies).

Prochaines étapes possibles :
1. **Recette sur de vrais téléphones** (4.3), Android et iPhone, avec la nouvelle liste : dérouler les [scénarios](recette.md) et noter les résultats.
2. **Rapprochement AÏDA** (4.5) : en production depuis le 01/11/2026 (migration 007), à éprouver sur les vraies saisies après la collecte ; scan des codes-barres en bonus, plus tard (pas pour l'édition 2026).
3. **En dernier** (décision du 29/10/2026), une fois toutes les fonctionnalités réalisées et validées : **version imprimable de la fiche bénévole** avec l'adresse et un QR code, pour ne pas avoir à la refaire après chaque évolution.

Environnement de développement : voir le [README](../README.md). La base locale `collector` contient la liste des bénévoles et environ 800 saisies de démonstration ; `php bin/migrate.php --fresh --seed` puis `php bin/generer-demo.php` la remettent à zéro.

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
| 27/10/2026 | Étape 2.5 terminée : mes saisies |
| 27/10/2026 | Étape 2.9 terminée : gestion des saisies par les responsables — **lot 2 terminé** |
| 27/10/2026 | Étape 3.1 terminée : API des bilans |
| 27/10/2026 | Étape 3.2 terminée : bilans des responsables |
| 27/10/2026 | Étape 3.3 terminée : bilans des bénévoles — **lot 3 terminé** |
| 27/10/2026 | Étape 4.1 préparée : procédure et script de déploiement |
| 27/10/2026 | Étape 4.4 : fiche bénévole et guide du responsable |
| 27/10/2026 | Fin de la session de travail : état et prochaines étapes notés dans « Reprise du travail » |
| 28/10/2026 | Installation sur Ionos (https://collecte.exdata.info) ; correctif `RewriteBase` dans les `.htaccess` (erreur 500) |
| 28/10/2026 | Évolution : code de référence dans les saisies (colonne, filtres « Code » et « Sans code ») |
| 29/10/2026 | Évolution : correction du magasin des saisies par le responsable, une à une ou par sélection (`POST /api/admin/saisies/magasin`) ; magasins actifs participant à la campagne uniquement |
| 29/10/2026 | Évolution : export Excel d'une campagne depuis les Bilans (une feuille « Saisies », fichier construit dans le navigateur avec `write-excel-file`, chargé à la demande ; `GET /api/admin/saisies/export?campagne=`) |
| 29/10/2026 | Évolution : onglet « Appareils » (prénom, code, magasin, saisies, dernière synchronisation, badge « Connecté » selon `appareils.connecte_minutes`) ; filtre des saisies par appareil (`GET /api/admin/appareils`, `appareil=` sur `GET /api/admin/saisies`) |
| 29/10/2026 | Journal technique de l'API : une ligne par requête, un fichier par jour dans `var/log`, conservé 30 jours ; référence de requête (`X-Request-Id`) citée dans les erreurs internes |
| 31/10/2026 | Décision : la comparaison entre années est retirée du périmètre de l'application |
| 31/10/2026 | Outil de mise à jour du serveur `scripts/deployer.mjs` : dépôt SFTP des seuls fichiers modifiés (manifeste `app/var/deploiement.json`), migrations appliquées par l'API (`/api/maintenance/schema` et `/migrer`, jeton `deploiement.jeton`), sauvegarde de la base confirmée avant migration, mot de passe SFTP demandé à chaque lancement |
| 31/10/2026 | Liste Croix-Rouge reçue (planche AÏDA) ; décisions du référentiel : liste bénévole indépendante d'AÏDA, sections en grille unique, variantes, récents, recherche par mots-clés et recherches sans résultat ; rapprochement AÏDA après la collecte ; scan des codes-barres en bonus |
| 31/10/2026 | Référentiel Croix-Rouge, étape 1 : sections (migration `003_sections.sql`, `/api/admin/sections`, grille de saisie groupée avec barre de raccourcis) |
| 31/10/2026 | Référentiel Croix-Rouge, étape 2 : variantes (migration `004_variantes.sql`, libellé des formats, `formatId` des saisies, champ `boutons` du référentiel) |
| 31/10/2026 | Référentiel Croix-Rouge, étape 3 : liste des bénévoles (7 sections, 35 catégories, CSV source et SQL généré), script de remise à zéro pour la production, générateur de saisies de démonstration |
| 31/10/2026 | Référentiel Croix-Rouge, étape 4 : catégories récentes en haut de la grille de saisie |
| 31/10/2026 | Référentiel Croix-Rouge, étape 5 : recherche d'une catégorie par mots-clés (migration `005_mots_cles.sql`) |
| 31/10/2026 | Référentiel Croix-Rouge, étape 6 : recherches sans résultat (migration `006_recherches.sql`, `/api/admin/recherches`) |
| 31/10/2026 | Mise en production du référentiel Croix-Rouge (migrations 003 à 006, remise à zéro de la liste) : tests concluants |
| 01/11/2026 | Étape 4.3 : scénarios de recette validés (`docs/recette.md`) |
| 01/11/2026 | Étape 4.5 cadrée : codes saisis à la main dans AÏDA, pas de valorisation en euros, pas de table d'articles |
| 01/11/2026 | Étape 4.5 réalisée : code AÏDA des boutons (migration `007_codes_aida.sql`), écran « Réception AÏDA » (`GET /api/admin/bilans/aida`), impression et export Excel ; pas encore en production |
| 01/11/2026 | Mise en production de la Réception AÏDA ; colonne, filtres et export des saisies alignés sur les mêmes règles de rattachement (requête commune `RapprochementAida`) ; déployé et validé |
| 01/11/2026 | Saisie : bandeau de confirmation flottant au-dessus des onglets (plus de décalage de la grille), protection contre le double appui, bandeau retiré au choix de la catégorie suivante ; déployé et validé |
| 01/11/2026 | Saisie : zones mieux délimitées (panneau des récents, bande des sections, titres de section marqués) ; déployé et validé |
| 01/11/2026 | Produits à privilégier : liste par campagne choisie par les responsables (migration `008_categories_privilegiees.sql`, `PUT /api/admin/categories/{id}/privilegiee`, champ `privilegiees` du référentiel), affichée dans l'onglet Collecte, message et point rouge au changement ; déployé et validé |
