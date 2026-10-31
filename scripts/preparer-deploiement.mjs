#!/usr/bin/env node
/**
 * Prépare le paquet à déposer sur l'hébergement (cf. docs/deploiement.md) :
 *
 *   deploy/package/
 *   ├── www/          contenu de la racine web (application compilée + api/)
 *   ├── app/          code PHP, dépendances de production, migrations (hors racine web)
 *   └── sql/          scripts SQL pour une installation sans accès SSH (phpMyAdmin)
 *
 * Usage : node scripts/preparer-deploiement.mjs [--sans-build]
 */
import { execSync } from 'node:child_process'
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const racine = join(dirname(fileURLToPath(import.meta.url)), '..')
const frontend = join(racine, 'frontend')
const backend = join(racine, 'backend')
const paquet = join(racine, 'deploy', 'package')
const www = join(paquet, 'www')
const app = join(paquet, 'app')

const etape = (message) => console.log(`\n▶ ${message}`)
const executer = (commande, cwd) => execSync(commande, { cwd, stdio: 'inherit', shell: true })

/**
 * Commande Composer : variable COMPOSER_BIN, sinon « composer » du PATH, sinon l'emplacement de
 * l'installateur Windows (absent du PATH d'un terminal ouvert avant l'installation de Composer).
 */
function trouverComposer() {
  const candidats = [
    process.env.COMPOSER_BIN,
    'composer',
    process.platform === 'win32' ? join(process.env.ProgramData ?? 'C:\\ProgramData', 'ComposerSetup', 'bin', 'composer.bat') : null,
  ].filter(Boolean)
  for (const candidat of candidats) {
    const commande = candidat.includes(' ') ? `"${candidat}"` : candidat
    try {
      execSync(`${commande} --version`, { stdio: 'ignore', shell: true })
      return commande
    } catch {
      // candidat suivant
    }
  }
  throw new Error('Composer introuvable : l\'ajouter au PATH, ou indiquer son chemin dans la variable COMPOSER_BIN.')
}
const composer = trouverComposer()

// 1. Compilation de l'application -------------------------------------------------------------------
if (!process.argv.includes('--sans-build')) {
  etape('Tests et compilation de l\'application')
  executer('npm run lint', frontend)
  executer('npm test', frontend)
  executer('npm run build', frontend)
  etape('Tests de l\'API')
  executer(`${composer} test`, backend)
}
if (!existsSync(join(frontend, 'dist', 'index.html'))) {
  throw new Error('frontend/dist est absent : lancer le script sans --sans-build.')
}

// 2. Racine web ---------------------------------------------------------------------------------------
etape('Préparation de deploy/package')
rmSync(paquet, { recursive: true, force: true })
mkdirSync(paquet, { recursive: true })

cpSync(join(frontend, 'dist'), www, { recursive: true })
cpSync(join(racine, 'deploy', 'www.htaccess'), join(www, '.htaccess'))
mkdirSync(join(www, 'api'))
cpSync(join(backend, 'public', 'index.php'), join(www, 'api', 'index.php'))
cpSync(join(backend, 'public', '.htaccess'), join(www, 'api', '.htaccess'))

// 3. Dossier applicatif ---------------------------------------------------------------------------------
for (const element of ['src', 'bin', 'sql', 'composer.json', 'composer.lock']) {
  cpSync(join(backend, element), join(app, element), { recursive: true })
}
mkdirSync(join(app, 'config'))
cpSync(join(backend, 'config', 'config.example.php'), join(app, 'config', 'config.example.php'))
cpSync(join(racine, 'deploy', 'app.htaccess'), join(app, '.htaccess'))

etape('Dépendances PHP de production (sans les outils de test)')
executer(`${composer} install --no-dev --optimize-autoloader --no-interaction --no-progress`, app)

// 4. Scripts SQL pour phpMyAdmin --------------------------------------------------------------------------
etape('Scripts SQL')
mkdirSync(join(paquet, 'sql'))
const migrations = readdirSync(join(backend, 'sql', 'migrations'))
  .filter((f) => /^\d{3}_.+\.sql$/.test(f))
  .sort()

const versionTable = `CREATE TABLE IF NOT EXISTS schema_version (
    version     VARCHAR(100) NOT NULL PRIMARY KEY,
    applique_le DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`

// Installation complète d'une base vide
writeFileSync(
  join(paquet, 'sql', 'installation.sql'),
  [
    '-- Collector : installation complète sur une base vide (à importer dans phpMyAdmin)',
    `-- Généré le ${new Date().toISOString()}`,
    'SET NAMES utf8mb4;',
    '',
    versionTable,
    ...migrations.flatMap((f) => [
      '',
      `-- ${f} ${'-'.repeat(Math.max(0, 80 - f.length))}`,
      readFileSync(join(backend, 'sql', 'migrations', f), 'utf8').trim(),
      `INSERT INTO schema_version (version) VALUES ('${f}');`,
    ]),
    '',
  ].join('\n'),
)

// Une migration par fichier, pour les mises à jour (n'importer que celles qui manquent)
for (const f of migrations) {
  writeFileSync(
    join(paquet, 'sql', `migration-${f}`),
    [
      `-- Collector : migration ${f} (à importer seulement si elle n'apparaît pas dans la table schema_version)`,
      'SET NAMES utf8mb4;',
      '',
      readFileSync(join(backend, 'sql', 'migrations', f), 'utf8').trim(),
      `INSERT INTO schema_version (version) VALUES ('${f}');`,
      '',
    ].join('\n'),
  )
}
for (const fichier of ['categories_initiales.sql', 'reinitialiser-referentiel.sql']) {
  cpSync(join(backend, 'sql', fichier), join(paquet, 'sql', fichier))
}

// 5. Résumé -----------------------------------------------------------------------------------------------
const version = JSON.parse(readFileSync(join(frontend, 'package.json'), 'utf8')).version
writeFileSync(join(paquet, 'VERSION.txt'), `Collector ${version} — paquet préparé le ${new Date().toLocaleString('fr-FR')}\n`)

console.log(`
✔ Paquet prêt dans deploy/package (Collector ${version})

  www/  → à déposer dans la racine web du domaine (ex. /collector/www)
  app/  → à déposer à côté, hors racine web       (ex. /collector/app)
  sql/  → scripts pour phpMyAdmin (installation.sql, migrations, catégories initiales)

  Première installation : créer app/config/config.php à partir de config.example.php.
  Procédure complète : docs/deploiement.md
`)
