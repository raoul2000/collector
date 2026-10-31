# Collector — Déploiement sur l'hébergement Ionos

Ce document décrit l'installation de Collector sur l'hébergement mutualisé Ionos, puis sa mise à jour.

> Les intitulés exacts des menus de l'espace client Ionos peuvent varier : ils sont indiqués à titre de repère.

---

## 1. Vue d'ensemble

Le domaine (ou sous-domaine) pointe sur un dossier `www`. Le code PHP et la configuration (avec les mots de passe) sont placés **à côté**, dans `app`, hors de portée du web.

```
/collector/                       (dans l'espace web Ionos)
├── www/                          ← racine web du domaine
│   ├── index.html, assets/, sw.js, manifest.webmanifest, icônes…
│   ├── .htaccess                 HTTPS, pages de l'application, en-têtes de cache
│   └── api/
│       ├── index.php             point d'entrée de l'API
│       └── .htaccess
└── app/                          ← jamais accessible depuis le web
    ├── config/config.php         configuration (base de données, mot de passe responsable)
    ├── src/, vendor/, bin/, sql/
    ├── var/log/                  journal technique (créé automatiquement, un fichier par jour)
    └── .htaccess                 « Require all denied » (protection supplémentaire)
```

`www/api/index.php` trouve automatiquement le dossier `app` situé à côté de `www`.

---

## 2. Préparation de l'hébergement (une seule fois)

Dans l'espace client Ionos :

1. **Version de PHP** : choisir **PHP 8.4** pour l'hébergement ou pour le domaine utilisé.
2. **Base de données** : créer une base **MySQL** et noter :
   - le nom d'hôte (de la forme `dbxxxxxxxx.hosting-data.io`) ;
   - le nom de la base (`dbsxxxxxxxx`) ;
   - le nom d'utilisateur (`dbuxxxxxxxx`) ;
   - le mot de passe choisi.
3. **Domaine ou sous-domaine** (ex. `collecte.mon-domaine.fr`) : le faire pointer sur le répertoire **`/collector/www`** (« répertoire cible »). Créer les dossiers s'ils n'existent pas.
4. **Certificat SSL** : activer le certificat SSL (inclus chez Ionos) pour ce domaine. **HTTPS est indispensable** : sans lui, l'application ne fonctionne pas hors ligne et la connexion des responsables est refusée.
5. **Accès SFTP** : noter le serveur, l'identifiant et le mot de passe SFTP (rubrique « Accès SFTP & SSH »). Un accès SSH n'est pas nécessaire : l'outil de mise à jour (section 5.1) applique les migrations de la base par l'API.

Outil conseillé pour déposer les fichiers : **FileZilla** (connexion en **SFTP**, port 22). Dans FileZilla, activer *Serveur > Forcer l'affichage des fichiers cachés* pour voir et déposer les fichiers `.htaccess`.

---

## 3. Préparer le paquet (sur l'ordinateur)

Depuis le dossier du projet :

```sh
node scripts/preparer-deploiement.mjs
```

Le script vérifie le code (lint, tests de l'application et de l'API), compile l'application et prépare :

```
deploy/package/
├── www/                          à déposer dans /collector/www
├── app/                          à déposer dans /collector/app
├── sql/
│   ├── installation.sql          installation complète d'une base vide
│   ├── migration-NNN_….sql       une migration par fichier (mises à jour)
│   └── categories_initiales.sql  liste provisoire de catégories (facultatif)
└── VERSION.txt
```

> Conserver une copie (zip) de chaque paquet déployé : elle permet de revenir à la version précédente.

---

## 4. Première installation

### 4.1 Déposer les fichiers

Avec FileZilla :

1. Copier le **contenu** de `deploy/package/app/` dans `/collector/app/`.
2. Copier le **contenu** de `deploy/package/www/` dans `/collector/www/` (sans oublier `.htaccess` et `api/.htaccess`).

### 4.2 Créer la configuration

1. Dans `/collector/app/config/`, faire une copie de `config.example.php` nommée **`config.php`**.
2. Générer le hash du mot de passe des responsables, **sur l'ordinateur** :

   ```sh
   cd backend
   php bin/hash-password.php "le mot de passe des responsables"
   ```

   Choisir un mot de passe solide (au moins 12 caractères) et le communiquer aux seuls responsables.

3. Compléter `config.php` (le modifier sur l'ordinateur puis le déposer, ou l'éditer dans FileZilla) :

   ```php
   return [
       'app' => [
           'debug' => false,          // toujours false sur le serveur
           'timezone' => 'Europe/Paris',
           'secure_cookies' => true,  // toujours true sur le serveur (HTTPS)
       ],
       'db' => [
           'host' => 'dbxxxxxxxx.hosting-data.io',
           'port' => 3306,
           'name' => 'dbsxxxxxxxx',
           'user' => 'dbuxxxxxxxx',
           'password' => 'mot de passe de la base',
       ],
       'admin' => [
           'password_hash' => '$2y$12$…',   // résultat de bin/hash-password.php
       ],
       'deploiement' => [
           'jeton' => '…',                  // pour l'outil de mise à jour (section 5.1)
       ],
   ];
   ```

4. **Jeton de l'outil de mise à jour** : générer une valeur aléatoire **sur l'ordinateur** et la reporter dans `deploiement.jeton` :

   ```sh
   php -r "echo bin2hex(random_bytes(24)), PHP_EOL;"
   ```

   Sans jeton (ou avec moins de 32 caractères), les routes de maintenance de l'API sont désactivées.

> `config.php` contient des secrets : il n'est jamais versionné dans Git et n'est jamais écrasé lors des mises à jour.

### 4.3 Créer les tables

**Avec un accès SSH** :

```sh
cd collector/app
php -v                      # doit afficher PHP 8.4 ; sinon utiliser la commande versionnée,
                            # par exemple /usr/bin/php8.4-cli à la place de php
php bin/migrate.php         # « Migrations appliquées : … »
```

**Sans accès SSH** : ouvrir **phpMyAdmin** depuis l'espace client (rubrique Bases de données), sélectionner la base, onglet **Importer**, choisir `deploy/package/sql/installation.sql` (jeu de caractères : utf-8), puis **Exécuter**.

**Catégories (facultatif)** : pour partir de la liste provisoire, importer de la même façon `categories_initiales.sql`. Sinon, créer les catégories depuis l'espace responsable.

### 4.4 Vérifier

1. Ouvrir `https://<domaine>/api/health` : la page doit afficher `{"status":"ok","database":"ok",…}`.
   - `"database":"unavailable"` → vérifier la section `db` de `config.php`.
   - Erreur 500 sans détail → vérifier que `config.php` existe et que la version de PHP est 8.4.
2. Ouvrir `http://<domaine>/` (sans « s ») : l'adresse doit basculer automatiquement en `https://`.
3. Ouvrir `https://<domaine>/admin`, se connecter avec un prénom et le mot de passe des responsables.
4. Recharger la page sur `https://<domaine>/admin/campagnes` : elle doit s'afficher (et non une erreur 404).

### 4.5 Préparer la collecte

Voir le [guide du responsable](guide-responsable.md) : créer la campagne, les magasins et les catégories, puis activer la campagne.

---

## 5. Mise à jour

> Éviter de mettre à jour pendant la collecte. Si c'est indispensable, le faire entre deux créneaux : les saisies faites hors ligne pendant la mise à jour sont conservées sur les téléphones et envoyées ensuite.

### 5.1 Avec l'outil de mise à jour (conseillé)

`scripts/deployer.mjs` prépare le paquet, dépose par SFTP **uniquement les fichiers nouveaux ou modifiés**, applique les migrations de la base et vérifie le résultat.

**Une seule fois, sur l'ordinateur :**

1. `npm install` dans le dossier `scripts/`.
2. Copier `deploy/deploiement.example.json` vers **`deploy/deploiement.local.json`** (non versionné) et le compléter :
   - `url` : adresse de l'application (`https://collecte.mon-domaine.fr`) ;
   - `jeton` : la valeur de `deploiement.jeton` du `config.php` du serveur (section 4.2, étape 4) ; l'ajouter au `config.php` du serveur s'il n'y figure pas ;
   - `sftp` : serveur, port et identifiant SFTP ; `racine` : dossier qui contient `app/` et `www/`, vu depuis la connexion SFTP (`.` si la connexion s'ouvre directement dessus, sinon par exemple `collector`).

   Le mot de passe SFTP n'est enregistré nulle part : il est demandé à chaque lancement.

**À chaque mise à jour**, depuis le dossier du projet :

```sh
node scripts/deployer.mjs --simulation   # facultatif : liste ce qui serait envoyé, supprimé et migré
node scripts/deployer.mjs
```

L'outil :

1. vérifie le code et prépare le paquet (comme `preparer-deploiement.mjs`) ;
2. interroge l'API : état du service et migrations de la base à appliquer ;
3. demande le mot de passe SFTP, puis une confirmation. **Si la base va être modifiée, il demande de faire d'abord la sauvegarde** (phpMyAdmin > Exporter) ;
4. dépose les fichiers modifiés de `app/`, applique les migrations, puis dépose ceux de `www/` (`index.html` en dernier) ;
5. supprime les fichiers retirés du paquet. Les anciens fichiers de `www/assets/` sont gardés jusqu'à la mise à jour suivante, pour les pages encore ouvertes ;
6. vérifie l'API, la base et la page d'accueil.

L'outil ne touche jamais à `app/config/config.php` ni à `app/var/`. La liste des fichiers déposés est conservée sur le serveur dans `app/var/deploiement.json` : au premier lancement, en son absence, tous les fichiers sont envoyés et aucun n'est supprimé (les anciens fichiers de `www/assets/` peuvent alors être supprimés à la main).

Options : `--sans-build` (réutilise la dernière compilation), `--sans-migration` (migrations à importer dans phpMyAdmin, section 5.2).

En cas d'échec d'une migration, l'outil s'arrête avant de déposer l'interface et affiche l'erreur de MySQL : corriger, puis relancer, ou restaurer la sauvegarde. Les appels de l'outil apparaissent dans le journal technique avec `maintenance=oui`.

### 5.2 À la main (FileZilla et phpMyAdmin)

1. **Sauvegarder la base** : phpMyAdmin > Exporter (méthode rapide, format SQL). Conserver le fichier.
2. **Préparer le paquet** : `node scripts/preparer-deploiement.mjs`.
3. **Déposer `app/`** : copier le contenu de `deploy/package/app/` dans `/collector/app/` en remplaçant les fichiers existants. Le paquet ne contient pas `config/config.php` : la configuration du serveur est conservée.
4. **Mettre à jour la base** si de nouvelles migrations existent :
   - avec SSH : `php bin/migrate.php` (n'applique que les migrations manquantes) ;
   - sans SSH : dans phpMyAdmin, afficher la table `schema_version` et importer **uniquement** les fichiers `migration-NNN_….sql` qui n'y figurent pas, dans l'ordre des numéros.
5. **Déposer `www/`** : copier le contenu de `deploy/package/www/` dans `/collector/www/` en remplaçant les fichiers existants. Les anciens fichiers de `www/assets/` peuvent rester (ils ne gênent pas) ou être supprimés.
6. **Vérifier** : `https://<domaine>/api/health`, puis ouvrir l'application. Les téléphones déjà équipés affichent le bandeau « Une nouvelle version de l'application est disponible » : toucher **Mettre à jour**.
7. **Si l'outil de mise à jour a déjà été utilisé** : supprimer `app/var/deploiement.json` sur le serveur, pour que le prochain lancement de l'outil renvoie tous les fichiers.

---

## 6. Retour à la version précédente

1. Redéposer le contenu de `app/` et de `www/` du paquet précédent (copie zip conservée à l'étape 2 de la mise à jour), ou, avec l'outil, revenir dans Git à la version précédente (`git checkout <version>`) et relancer `node scripts/deployer.mjs`.
2. Si la mise à jour avait ajouté une migration, restaurer la sauvegarde de la base faite avant la mise à jour (phpMyAdmin > Importer).

---

## 7. Journal technique

L'API écrit une ligne par requête dans `app/var/log/collector-AAAA-MM-JJ.log` (un fichier par jour, conservé 30 jours ; réglages dans la section `log` de `config.php`). Pour le consulter : le télécharger par SFTP ou avec le gestionnaire de fichiers d'Ionos.

```
2026-11-27T10:15:02+01:00 INFO  a3f9c1d2 POST /api/sync 200 84ms appareil=7c2e1a0b benevole=Marie envoyees=3 ok=3 conflits=0 rejets=0 recues=0
2026-11-27T10:15:09+01:00 WARN  b81d22e4 POST /api/admin/login 401 12ms erreur=invalid_credentials ip=86.212.14.x
2026-11-27T10:16:40+01:00 ERROR c09e7a51 GET /api/admin/bilans 500 31ms responsable=Sophie
    PDOException: … (trace de l'erreur)
```

- **INFO** : requête traitée ; **WARN** : requête refusée (4xx) ou lente (plus d'une seconde) ; **ERROR** : erreur interne, suivie de sa trace.
- Le 2ᵉ champ est la **référence de la requête**, renvoyée au navigateur (en-tête `X-Request-Id`). Une erreur interne l'affiche à l'écran : « Erreur interne du serveur (réf. c09e7a51) ». Il suffit de chercher cette référence dans le fichier du jour.
- Les lignes de synchronisation donnent le début de l'identifiant du téléphone et le prénom saisi sur le téléphone à ce moment-là. L'identifiant complet et le dernier prénom connu sont dans la table `appareil` (`SELECT * FROM appareil WHERE id LIKE '7c2e1a0b%'`).
- Ni mots de passe, ni cookies, ni contenu des saisies ne sont écrits ; l'adresse IP (tronquée) n'apparaît que pour les connexions des responsables.
- Si le dossier `var/log` ne peut pas être créé ou écrit, l'application fonctionne normalement et les erreurs internes partent dans le journal PHP d'Ionos.

---

## 8. Sauvegardes

- **Avant chaque mise à jour** et **à la fin de chaque journée de collecte** : export de la base dans phpMyAdmin.
- Après la collecte : conserver un export de la base avec les bilans de la campagne.

---

## 9. Dépannage

| Symptôme | Piste |
|---|---|
| `/api/health` renvoie une erreur 500 | `config.php` absent ou invalide ; version de PHP différente de 8.4 ; fichiers `app/vendor` manquants |
| Message « Erreur interne du serveur (réf. …) » | Chercher la référence dans `app/var/log/collector-<date du jour>.log` : la ligne ERROR est suivie de la cause |
| `"database":"unavailable"` | Paramètres `db` de `config.php` (hôte, nom, utilisateur, mot de passe) |
| Erreur 404 en rechargeant une page (ex. `/mes-saisies`) | `www/.htaccess` absent (fichier caché non déposé) |
| Erreur 404 sur `/api/…` | `www/api/.htaccess` absent |
| Erreur 500 sur `/api/…` ou en rechargeant une page | `RewriteBase` absent des `.htaccess` (ancienne version du paquet) |
| La connexion responsable ne tient pas (retour à la connexion) | Le site n'est pas en HTTPS ; `secure_cookies` doit rester à `true` avec HTTPS |
| « Trop de tentatives de connexion » | 5 mots de passe erronés en 15 minutes depuis la même connexion : patienter 15 minutes |
| Les téléphones ne voient pas la nouvelle version | Vérifier que `sw.js` et `index.html` ont bien été remplacés ; fermer et rouvrir l'application |
| Accents incorrects après un import SQL | Importer avec le jeu de caractères utf-8 (les fichiers fournis commencent par `SET NAMES utf8mb4`) |

Les erreurs de l'API sont écrites dans le journal d'erreurs PHP de l'hébergement (espace client Ionos, rubrique des journaux / logs).
