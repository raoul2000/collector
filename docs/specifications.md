# Collector — Spécifications fonctionnelles et techniques

Application web de saisie des dons lors de la collecte alimentaire annuelle de la Croix-Rouge.

- Version du document : 0.3 (brouillon)
- Date : 27/10/2026
- Statut : à valider

---

## 1. Contexte et objectifs

Chaque année, l'unité locale organise une collecte alimentaire dans une dizaine de magasins, sur 2 jours. Des bénévoles se relaient à l'entrée des magasins pour recevoir les dons.

L'application doit permettre :

1. aux **bénévoles** de saisir, depuis leur smartphone et au fil des dons, les articles reçus (catégorie, quantité, poids ou volume) ;
2. aux **responsables** de suivre la collecte en temps réel et de consulter les bilans ensuite ;
3. de **conserver l'historique** des collectes pour les comparer d'une année sur l'autre.

## 2. Glossaire

| Terme | Définition |
|---|---|
| Campagne | Une édition de la collecte (ex. « Collecte novembre 2026 »), avec ses dates. Une seule campagne est active à la fois. |
| Magasin | Point de collecte. |
| Catégorie | Type de produit issu de la liste de référence Croix-Rouge (ex. Pâtes, Conserves de légumes, Huile, Savon). |
| Unité de mesure | Propre à chaque catégorie : **kg** (poids), **L** (volume) ou **unité** (quantité seule). |
| Format | Contenance prédéfinie proposée en raccourci pour une catégorie (ex. 500 g, 1 L). |
| Saisie | Une ligne : catégorie + quantité + contenance unitaire. Ex. « 2 × Pâtes 500 g ». |
| Appareil | Smartphone d'un bénévole, identifié par un identifiant unique généré par l'application. |

## 3. Acteurs

| Acteur | Accès | Identification |
|---|---|---|
| Bénévole | Saisie, consultation/correction de ses saisies, bilans « motivation » | Prénom + identifiant d'appareil, sans mot de passe |
| Responsable | Bilans complets, administration | Prénom + mot de passe unique partagé |

## 4. Spécifications fonctionnelles

### 4.1 Premier lancement (bénévole)

1. Le bénévole ouvre l'URL de l'application (lien ou QR code d'accès générique).
2. L'application génère un **identifiant d'appareil** unique (UUID) et le mémorise sur le téléphone.
3. Le bénévole saisit son **prénom**.
4. Il **sélectionne son magasin** dans la liste des magasins de la campagne active.
5. Prénom et magasin sont mémorisés : aux lancements suivants, il arrive directement sur l'écran de saisie.

L'application propose d'être ajoutée à l'écran d'accueil (PWA).

Le magasin courant est **affiché en permanence** en haut de l'écran et peut être changé à tout moment. Le prénom est modifiable dans les paramètres.

### 4.2 Saisie d'un article

Objectif : **moins de 5 secondes** pour une saisie courante, utilisable d'une main.

1. **Choix de la catégorie** : grille de gros boutons. Les catégories sont triées selon un ordre défini par l'administration (les plus fréquentes en premier).
2. **Contenance**, selon l'unité de la catégorie :
   - **kg** : boutons de formats prédéfinis (ex. [250 g] [500 g] [1 kg]) + champ libre pour le poids exact relevé sur l'emballage (en g ou kg) ;
   - **L** : boutons de formats prédéfinis (ex. [50 cl] [1 L]) + champ libre (en cl ou L) ;
   - **unité** : pas de contenance.

   Pour une catégorie en kg ou en L, un bouton **« Contenance inconnue »** permet de saisir sans poids ni volume (étiquette illisible, par exemple). Un **avertissement** est affiché avant validation (« Le poids ne sera pas comptabilisé. Continuer ? »).
3. **Quantité** : valeur par défaut 1, boutons **[−]** et **[+]**, saisie directe possible.
4. **Valider** : la saisie est enregistrée, une confirmation brève s'affiche (ex. « ✓ 2 × Pâtes 500 g ») et l'application revient à la grille des catégories.

Un bouton **« Annuler la dernière saisie »** reste accessible quelques secondes après chaque validation.

Contrôles :
- quantité entière comprise entre 1 et 999 ;
- contenance strictement positive, avec une borne haute de cohérence (ex. 25 kg, 10 L) ;
- au-delà d'un seuil inhabituel (ex. quantité > 50), une confirmation est demandée.

### 4.3 Mes saisies (bénévole)

- Liste des saisies **faites depuis cet appareil**, de la plus récente à la plus ancienne, avec date/heure, magasin, catégorie, quantité, contenance et état de synchronisation.
- Le bénévole peut **modifier** (catégorie, quantité, contenance) ou **supprimer** n'importe laquelle de ses saisies, sans limite de temps.
- Il ne peut ni voir en détail ni modifier les saisies d'un autre appareil.
- Si un responsable a corrigé une de ses saisies, la liste affiche la version corrigée (avec la mention « corrigée par un responsable ») dès la synchronisation suivante.

### 4.4 Fonctionnement hors ligne

- Toute saisie, modification ou suppression est d'abord **enregistrée sur le téléphone**, puis envoyée au serveur dès que le réseau est disponible.
- Un indicateur montre l'état : « En ligne », « Hors ligne », « N saisies en attente d'envoi ».
- La liste des magasins, des catégories et des formats est conservée sur le téléphone pour que l'application fonctionne entièrement hors ligne, même après un redémarrage.
- La synchronisation est automatique (au retour du réseau, à l'ouverture de l'application, et périodiquement) et peut aussi être déclenchée manuellement.
- Aucune saisie ne doit être perdue ni comptée deux fois.

### 4.5 Bilans

Tous les bilans portent sur la campagne active (ou une campagne choisie par le responsable). Les totaux sont toujours présentés séparément : **nombre d'articles**, **kg**, **L**.

Les articles saisis sans contenance sont comptés dans le nombre d'articles mais pas dans les kg ou les L ; les bilans l'indiquent (ex. « 1 250 kg — dont 12 articles sans poids »).

#### Bilan par magasin (responsable)

- **Par catégorie** : nombre d'articles, poids total (kg) ou volume total (L).
- **Par heure** : nombre d'articles, kg et L par tranche horaire, sur chaque jour de collecte.
- Totaux généraux du magasin.
- Sélection du magasin, ou vue « tous magasins ».
- Rafraîchissement automatique toutes les 30 secondes environ.

#### Bilans « motivation » (bénévole)

Accessibles depuis l'écran de saisie, rafraîchis automatiquement quand le réseau est disponible :

- totaux de **son magasin** : nombre d'articles, kg, L ;
- répartition par catégorie de son magasin ;
- total général de la collecte, tous magasins confondus ;
- **comparaison entre magasins** : classement des magasins (nombre d'articles, kg, L).

Aucune comparaison entre bénévoles n'est affichée.

Les autres bilans (comparaison entre années, export Excel, etc.) seront ajoutés dans une version ultérieure.

### 4.6 Espace responsable

Accès : prénom + mot de passe unique partagé. Le prénom est conservé dans le journal des actions d'administration.

Fonctions :
- **Bilans** (cf. 4.5).
- **Campagnes** : créer, modifier (nom, dates), activer une campagne.
- **Magasins** : créer, modifier, désactiver ; rattacher les magasins à la campagne.
- **Catégories** : créer, modifier, ordonner, désactiver ; définir l'unité (kg / L / unité) et les formats prédéfinis. Import initial depuis la liste de référence Croix-Rouge.
- **Saisies** : consultation de toutes les saisies (filtre par magasin, catégorie, prénom, période) ; **modification et suppression** de n'importe quelle saisie pour corriger une erreur (ex. « 500 × Pâtes »). Chaque correction est tracée dans le journal (prénom du responsable, valeurs avant/après).

### 4.7 Données personnelles (RGPD)

- Aucune donnée sur les donateurs.
- Seules données personnelles : le **prénom** des bénévoles et des responsables, et l'identifiant technique de l'appareil (aléatoire, non lié au téléphone physique).
- Les prénoms et les données de collecte sont conservés sans limite de durée (décision du 27/10/2026).

## 5. Spécifications techniques

### 5.1 Contraintes

- Hébergement **mutualisé Ionos** : PHP **8.4**, MySQL, Apache (`.htaccess`). Pas de processus permanent, pas de Node.js côté serveur, pas de WebSocket.
- **HTTPS obligatoire** (nécessaire au service worker, donc au mode hors ligne) : certificat SSL Ionos.
- Navigateurs cibles : Chrome Android et Safari iOS récents (2 dernières versions majeures). Le tableau de bord doit aussi fonctionner sur ordinateur.

### 5.2 Architecture

```
Smartphone (PWA)                         Serveur Ionos
┌──────────────────────────┐            ┌──────────────────────────┐
│ React + TypeScript       │  HTTPS     │ API REST PHP 8.4 (JSON)  │
│ Service worker (cache)   │ ─────────> │ PDO / requêtes préparées │
│ IndexedDB :              │ <───────── │                          │
│  - référentiel           │            │ MySQL                    │
│  - saisies + file d'envoi│            │                          │
└──────────────────────────┘            └──────────────────────────┘
```

- **Front** : une seule application React (espace bénévole sur `/`, espace responsable sur `/admin`), compilée par Vite en fichiers statiques. Aucune ressource chargée depuis un CDN : tout est servi par le serveur et mis en cache pour le hors ligne.
- **Back** : API JSON en PHP 8.4 **sans framework** (routeur maison), PDO avec requêtes préparées.
- **Déploiement** : compilation locale (`npm run build`), puis copie des fichiers par FTP/SFTP, plus un script SQL d'installation.

#### Stack front

| Besoin | Choix |
|---|---|
| Outillage | Vite, TypeScript (mode strict), oxlint |
| Interface | React, React Router |
| PWA / hors ligne | `vite-plugin-pwa` (Workbox) : service worker, cache, manifeste |
| Données locales (source de vérité côté bénévole) | Dexie.js + `dexie-react-hooks` (`useLiveQuery`) |
| Données serveur (bilans, administration) | TanStack Query (rafraîchissement périodique via `refetchInterval`) |
| État global de l'application (appareil, prénom, magasin, réseau, session) | Zustand (+ middleware `persist`) |
| Graphiques | Recharts |
| Styles | CSS Modules + variables CSS (thème global), composants maison, sans bibliothèque de composants |
| Boîtes de dialogue | Élément HTML natif `<dialog>` |
| Tests | Vitest + Testing Library |

Le **moteur de synchronisation** est un module TypeScript indépendant de React. Il lit la file d'opérations dans Dexie, envoie les lots à l'API et applique les retours. Il est déclenché au démarrage, au retour du réseau et périodiquement, et peut être testé unitairement.

#### Stack back

| Besoin | Choix |
|---|---|
| Langage | PHP 8.4 (`declare(strict_types=1)`) |
| Structure | Sans framework : routeur, contrôleurs, repositories (PDO), validation |
| Dépendances | Composer pour l'autoload PSR-4 et les outils de développement uniquement (aucune dépendance en production) |
| Tests | PHPUnit |
| Base de données | MySQL (utf8mb4), schéma versionné dans des scripts SQL |

#### Environnement de développement

- Serveur de développement Vite, avec un proxy `/api` vers le serveur PHP intégré (`php -S`).
- MySQL ou MariaDB en local.

### 5.3 Modèle de données

Contenances stockées en **entiers** : grammes pour les catégories en kg, millilitres pour les catégories en L (pas de nombres à virgule).

```
campagne      (id, nom, date_debut, date_fin, active, cree_le)
magasin       (id, nom, ville, actif)
campagne_magasin (campagne_id, magasin_id)
categorie     (id, nom, unite ENUM('kg','L','unite'), ordre, active, code_reference)
format        (id, categorie_id, contenance INT, ordre)          -- g ou ml
appareil      (id CHAR(36) UUID, prenom, cree_le, vu_le)
saisie        (id CHAR(36) UUID généré côté client,
               campagne_id, magasin_id, appareil_id, categorie_id,
               quantite INT, contenance_unitaire INT NULL,      -- g ou ml ; NULL si unité ou contenance inconnue
               saisie_le DATETIME,                              -- heure de saisie sur le téléphone
               modifie_le DATETIME, supprime_le DATETIME NULL,  -- suppression logique
               modifie_par_responsable VARCHAR NULL,            -- prénom du responsable ayant corrigé
               recu_le DATETIME)
journal_admin (id, prenom, action, details JSON, cree_le)
```

Index : `saisie(campagne_id, magasin_id, saisie_le)`, `saisie(appareil_id)`.

Volumétrie estimée : quelques dizaines de milliers de lignes par campagne, ce qui ne pose aucune difficulté.

### 5.4 Synchronisation

- Chaque saisie reçoit un **UUID généré sur le téléphone** à sa création. L'envoi est donc **idempotent** : renvoyer deux fois la même saisie ne crée pas de doublon.
- Chaque saisie locale (IndexedDB) porte un indicateur **« à envoyer »**. Le téléphone envoie l'**état courant** de ces saisies, par lots de 200 au plus (plutôt qu'une file d'opérations : pas de problème d'ordre, renvoi sans effet de bord).
- Chaque saisie envoyée porte la version serveur connue du téléphone (`baseMajLe`). Le serveur vérifie que la saisie appartient à l'appareil émetteur, puis :
  - si un responsable l'a corrigée après cette version → la correction l'emporte (statut `conflit`, la version serveur est renvoyée) ;
  - si la version reçue est plus ancienne que celle enregistrée (`modifieLe`, renvoi tardif) → elle est ignorée ;
  - sinon → elle est enregistrée (statut `ok`) ;
  - une saisie invalide est refusée (statut `rejete` avec un message) sans bloquer les autres.
- À chaque synchronisation, le téléphone transmet un **curseur** et reçoit les saisies de l'appareil modifiées côté serveur depuis (corrections des responsables). Sans curseur, il reçoit toutes ses saisies (restauration).
- Dates échangées au format ISO 8601 avec fuseau ; `majLe` est un marqueur opaque de version.
- La suppression est **logique** (`supprime_le`) afin qu'une suppression faite hors ligne soit propagée correctement.
- L'heure retenue pour les bilans est `saisie_le` (heure du don), et non l'heure de réception par le serveur. Fuseau horaire : Europe/Paris.

### 5.5 API (première ébauche)

| Méthode | URL | Rôle |
|---|---|---|
| GET | `/api/referentiel` | Campagne active, magasins, catégories, formats |
| POST | `/api/sync` | Enregistre l'appareil et son prénom, applique les saisies envoyées, renvoie leur statut et les changements depuis le curseur |
| GET | `/api/bilans/public?magasin=` | Bilans « motivation » |
| POST | `/api/admin/login` | Connexion responsable (prénom + mot de passe) |
| POST | `/api/admin/logout` | Déconnexion |
| GET | `/api/admin/session` | Responsable connecté |
| GET, POST | `/api/admin/campagnes` | Liste, création |
| PUT, DELETE | `/api/admin/campagnes/{id}` | Modification (dont magasins rattachés), suppression si aucune saisie |
| POST | `/api/admin/campagnes/{id}/activer`, `/desactiver` | Campagne active (une seule à la fois) |
| GET, POST | `/api/admin/magasins` | Liste, création |
| PUT, DELETE | `/api/admin/magasins/{id}` | Modification, suppression si aucune saisie |
| GET, POST | `/api/admin/categories` | Liste (avec formats), création |
| PUT | `/api/admin/categories/ordre` | Nouvel ordre d'affichage |
| PUT, DELETE | `/api/admin/categories/{id}` | Modification (dont formats), suppression si aucune saisie |
| GET | `/api/admin/bilans/magasin?id=` | Bilan par catégorie et par heure |
| GET | `/api/admin/saisies?campagne=&magasin=&categorie=&prenom=&supprimees=1&page=&parPage=` | Saisies des bénévoles (paginées) |
| PUT, DELETE | `/api/admin/saisies/{id}` | Correction, suppression logique (transmises au téléphone) |

Erreurs : `{"error": {"code": "...", "message": "...", "details": {"fields": {"champ": "message"}}}}` avec les codes HTTP 400, 401, 403, 404, 405, 409, 422, 429, 500, 503.

L'identifiant d'appareil est transmis dans un en-tête `X-Device-Id`.

### 5.6 Sécurité

- Mot de passe responsable stocké **haché** (`password_hash`) dans un fichier de configuration placé hors de la racine web, ou protégé par `.htaccess`.
- Sessions de l'espace responsable stockées en base (table `session_admin`, empreinte SHA-256 du jeton uniquement), jeton dans un cookie `HttpOnly`, `Secure`, `SameSite=Strict` ; expiration après 12 h d'inactivité.
- Limitation des tentatives de connexion : 5 échecs par adresse IP sur 15 minutes.
- Protection CSRF : toute requête modifiant des données doit porter l'en-tête `X-Requested-With` (un autre site ne peut pas l'envoyer sans autorisation CORS).
- Validation stricte de toutes les entrées côté serveur ; requêtes préparées uniquement.
- L'identifiant d'appareil n'est **pas une authentification forte** : il empêche les erreurs, pas une usurpation volontaire. Risque jugé acceptable dans ce contexte.
- Limite de taille des lots de synchronisation.

### 5.7 Exigences non fonctionnelles

- Saisie courante en moins de 5 s, gros boutons (zones tactiles ≥ 48 px), lisibilité en extérieur (contrastes forts).
- Application légère : chargement initial < 300 Ko, peu de requêtes réseau côté bénévole (économie de batterie).
- Interface entièrement en français.

### 5.8 Arborescence prévue

Dépôt :

```
collector/
├── docs/                      spécifications
├── frontend/                  application Vite + React + TypeScript
│   ├── public/                icônes, fichiers statiques
│   ├── src/
│   │   ├── app/               routes, layout, providers
│   │   ├── features/          saisie, mes-saisies, bilans, admin
│   │   ├── components/        composants d'interface maison (Button, BigTile, QuantityStepper…)
│   │   ├── db/                schéma Dexie
│   │   ├── sync/              moteur de synchronisation
│   │   ├── api/               client HTTP et types partagés de l'API
│   │   ├── stores/            stores Zustand
│   │   └── styles/            thème (variables CSS), styles globaux
│   └── vite.config.ts
└── backend/
    ├── public/                point d'entrée de l'API (index.php, .htaccess)
    ├── src/                   routeur, contrôleurs, repositories, validation
    ├── config/                configuration (config.example.php)
    ├── sql/                   schéma et données initiales
    └── tests/                 PHPUnit
```

Sur le serveur (la racine web du domaine pointe sur `www/`, ce que permet Ionos) :

```
www/                           racine web : contenu de frontend/dist
├── index.html, assets/, sw.js, manifest.webmanifest
├── api/                       contenu de backend/public
└── .htaccess                  réécriture : /api/* → api/index.php, autres routes → index.html
app/                           hors racine web : backend/src, vendor, config
```

## 6. Découpage en lots

1. **Lot 1 – Socle** : schéma BDD, API référentiel, administration minimale (campagne, magasins, catégories et formats, import de la liste Croix-Rouge).
2. **Lot 2 – Saisie** : PWA bénévole (premier lancement, saisie, mes saisies, correction/suppression), mode hors ligne et synchronisation.
3. **Lot 3 – Bilans** : bilan par magasin (catégorie, heure) pour les responsables, bilans « motivation » pour les bénévoles.
4. **Lot 4 – Recette** : test sur le terrain (simulation de collecte avec plusieurs téléphones, coupure réseau), corrections.
5. **Évolutions ultérieures** : export Excel, comparaison entre années, autres bilans.

## 7. Points ouverts

| # | Sujet | Statut |
|---|---|---|
| 1 | Liste de référence des catégories Croix-Rouge (catégories, unités, formats courants) | En attente |
| 2 | Contenu exact des bilans visibles par les bénévoles | ✅ Magasin, catégories, total général, classement des magasins ; pas de comparaison entre bénévoles |
| 3 | Le responsable peut-il modifier ou supprimer les saisies des bénévoles ? | ✅ Oui, avec traçabilité |
| 4 | Saisie sans contenance pour une catégorie en kg ou L | ✅ Autorisée, avec avertissement |
| 5 | Durée de conservation des prénoms | ✅ Conservation sans limite |
| 6 | Nom de domaine ou sous-domaine de l'application | En attente |
