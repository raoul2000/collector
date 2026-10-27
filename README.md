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

En production, `php bin/migrate.php` applique uniquement les migrations en attente.

Vérification : http://localhost:8000/api/health
