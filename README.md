# Collector

Application web de saisie des dons pour la collecte alimentaire de la Croix-Rouge.

- Spécifications : [docs/specifications.md](docs/specifications.md)
- Plan et avancement : [docs/plan.md](docs/plan.md)

## Prérequis

- PHP 8.4 (extensions `pdo_mysql`, `mbstring`), Composer
- MySQL 8
- Node.js et npm

## Backend (API PHP)

```sh
cd backend
composer install
cp config/config.example.php config/config.php   # puis renseigner les accès MySQL
php bin/migrate.php --fresh --seed               # (re)crée la base avec les données de développement
composer serve                                   # API sur http://localhost:8000
composer test                                    # tests PHPUnit (base collector_test recréée)
```

Vérification : http://localhost:8000/api/health

En production, `php bin/migrate.php` applique uniquement les migrations en attente.

Mot de passe des responsables : générer son hash avec `php bin/hash-password.php "mot de passe"` et le copier dans `config/config.php` (`admin.password_hash`).

Toute requête API modifiant des données (POST, PUT, PATCH, DELETE) doit porter l'en-tête `X-Requested-With: Collector`.

## Frontend (application React)

```sh
cd frontend
npm install
npm run dev          # http://localhost:5173 (les appels /api sont relayés vers http://localhost:8000)
npm test             # tests Vitest
npm run lint         # oxlint
npm run build        # vérification TypeScript + compilation dans dist/
```

- Espace bénévole : http://localhost:5173/
- Espace responsable : http://localhost:5173/admin (mot de passe de développement : `responsable-dev`)

## Déploiement

```sh
node scripts/preparer-deploiement.mjs   # vérifie, compile et prépare deploy/package
```

Procédure complète (Ionos) : [docs/deploiement.md](docs/deploiement.md)
