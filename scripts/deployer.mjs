#!/usr/bin/env node
/**
 * Met à jour l'application sur l'hébergement (cf. docs/deploiement.md, section 5) :
 *
 *   1. prépare le paquet (scripts/preparer-deploiement.mjs : lint, tests, compilation) ;
 *   2. dépose par SFTP les fichiers nouveaux ou modifiés de app/, puis applique les migrations de la base
 *      par l'API (routes /api/maintenance, protégées par le jeton de config.php) ;
 *   3. dépose les fichiers de www/ (index.html en dernier), supprime les fichiers obsolètes, vérifie.
 *
 * Usage : node scripts/deployer.mjs [--simulation] [--sans-build] [--sans-migration] [--config=fichier]
 *
 *   --simulation      affiche ce qui serait envoyé, supprimé et migré, sans rien modifier
 *   --sans-build      réutilise frontend/dist sans relancer lint, tests et compilation
 *   --sans-migration  n'applique pas les migrations (à faire alors dans phpMyAdmin)
 *   --config=…        fichier de paramètres (défaut : deploy/deploiement.local.json)
 *   --dossier=…       (essais) dépose dans un dossier local au lieu du serveur SFTP
 *
 * Le mot de passe SFTP est demandé à chaque lancement.
 */
import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, posix } from 'node:path'
import { createInterface } from 'node:readline'
import { fileURLToPath } from 'node:url'
import { MANIFESTE, manifesteLocal, planifier } from './lib/deploiement.mjs'

const racine = join(dirname(fileURLToPath(import.meta.url)), '..')
const paquet = join(racine, 'deploy', 'package')

const options = new Map(
  process.argv.slice(2).map((arg) => {
    const [cle, valeur] = arg.replace(/^--/, '').split('=', 2)
    return [cle, valeur ?? true]
  }),
)
for (const cle of options.keys()) {
  if (!['simulation', 'sans-build', 'sans-migration', 'config', 'dossier'].includes(cle)) {
    arreter(`Option inconnue : --${cle}`)
  }
}
const simulation = options.has('simulation')

const etape = (message) => console.log(`\n▶ ${message}`)

try {
  await deployer()
} catch (e) {
  arreter(e instanceof Error ? e.message : String(e))
}

async function deployer() {
  const debut = Date.now()
  const parametres = lireParametres(String(options.get('config') ?? join(racine, 'deploy', 'deploiement.local.json')))
  const api = clientApi(parametres.url, parametres.jeton)

  // 1. Paquet -----------------------------------------------------------------------------------------
  etape('Préparation du paquet')
  const preparation = spawnSync(
    process.execPath,
    [join(racine, 'scripts', 'preparer-deploiement.mjs'), ...(options.has('sans-build') ? ['--sans-build'] : [])],
    { stdio: 'inherit' },
  )
  if (preparation.status !== 0) throw new Error('La préparation du paquet a échoué : rien n\'a été déposé.')
  const version = JSON.parse(readFileSync(join(racine, 'frontend', 'package.json'), 'utf8')).version
  const local = manifesteLocal(paquet)
  const migrations = readdirSync(join(paquet, 'app', 'sql', 'migrations')).filter((f) => /^\d{3}_.+\.sql$/.test(f)).sort()

  // 2. État du serveur ----------------------------------------------------------------------------------
  etape(`État de ${parametres.url}`)
  const sante = await api.get('/api/health')
  console.log(`  API : ${sante.ok ? 'ok' : `indisponible (${sante.status})`}`)
  let aMigrer = await migrationsAAppliquer(api, migrations)
  console.log(`  Base : ${aMigrer === null ? 'état inconnu (outil de maintenance absent du serveur, il sera déposé)' : aMigrer.length === 0 ? 'à jour' : `migrations à appliquer : ${aMigrer.join(', ')}`}`)

  // 3. Fichiers -----------------------------------------------------------------------------------------
  const cible = options.has('dossier')
    ? cibleDossier(String(options.get('dossier')))
    : await cibleSftp(parametres.sftp, await demanderMotDePasse(`  Mot de passe SFTP de ${parametres.sftp.utilisateur}@${parametres.sftp.hote} : `))
  try {
    const distant = await cible.lire(MANIFESTE)
    const plan = planifier(local, distant === null ? null : JSON.parse(distant.toString('utf8')), {
      version,
      date: new Date().toISOString(),
    })
    etape(`Collector ${version} : ${plan.api.length + plan.interface.length} fichier(s) à envoyer, ${plan.supprimer.length} à supprimer`)
    if (distant === null) console.log('  Premier déploiement avec l\'outil : tous les fichiers sont envoyés, aucun n\'est supprimé.')
    if (simulation) {
      for (const chemin of [...plan.api, ...plan.interface]) console.log(`  + ${chemin}`)
      for (const chemin of plan.supprimer) console.log(`  - ${chemin}`)
      console.log('\nSimulation : rien n\'a été modifié.')
      return
    }

    if (aMigrer?.length && !options.has('sans-migration')) {
      console.log('\n  La base va être modifiée. Faire d\'abord une sauvegarde : phpMyAdmin > Exporter (méthode rapide, SQL).')
      if (!(await confirmer('  La sauvegarde de la base est-elle faite ?'))) throw new Error('Déploiement annulé : rien n\'a été modifié.')
    } else if (!(await confirmer('  Déployer ?'))) {
      throw new Error('Déploiement annulé : rien n\'a été modifié.')
    }

    etape('Dépôt de l\'API (app/)')
    await envoyer(cible, plan.api)

    // 4. Base de données ----------------------------------------------------------------------------------
    if (aMigrer === null) {
      // L'outil de maintenance vient d'être déposé : l'état de la base est maintenant connu
      aMigrer = await migrationsAAppliquer(api, migrations)
      if (aMigrer === null) throw new Error('L\'API ne répond pas aux routes de maintenance après le dépôt.')
      if (aMigrer.length > 0 && !options.has('sans-migration')) {
        console.log(`\n  Migrations à appliquer : ${aMigrer.join(', ')}. Faire d'abord une sauvegarde : phpMyAdmin > Exporter.`)
        if (!(await confirmer('  La sauvegarde de la base est-elle faite ?'))) {
          throw new Error('Déploiement interrompu : l\'API est déposée, ni la base ni l\'interface ne sont à jour. Relancer le déploiement.')
        }
      }
    }
    if (aMigrer.length > 0) {
      if (options.has('sans-migration')) {
        console.log(`\n  --sans-migration : importer dans phpMyAdmin ${aMigrer.map((m) => `sql/migration-${m}`).join(', ')}`)
      } else {
        etape('Mise à jour de la base')
        const reponse = await api.post('/api/maintenance/migrer')
        if (!reponse.ok) {
          throw new Error(`Échec de la mise à jour de la base : ${reponse.message}\n  L'API est déposée, l'interface n'a pas été modifiée. Corriger, puis relancer le déploiement (ou restaurer la sauvegarde).`)
        }
        console.log(`  Migrations appliquées : ${reponse.data.appliquees.join(', ') || 'aucune'}`)
      }
    }

    // 5. Interface et nettoyage --------------------------------------------------------------------------
    etape('Dépôt de l\'interface (www/)')
    await envoyer(cible, plan.interface)
    if (plan.supprimer.length > 0) {
      etape('Suppression des fichiers obsolètes')
      for (const chemin of plan.supprimer) {
        await cible.supprimer(chemin)
        console.log(`  - ${chemin}`)
      }
    }
    await cible.ecrire(MANIFESTE, Buffer.from(JSON.stringify(plan.manifeste, null, 2) + '\n'))
  } finally {
    await cible.fermer()
  }

  // 6. Vérification -------------------------------------------------------------------------------------
  etape('Vérification')
  const verifications = [
    ['API', (await api.get('/api/health')).ok],
    ['Base à jour', options.has('sans-migration') || (await migrationsAAppliquer(api, migrations))?.length === 0],
    ['Interface', (await api.texte('/')) === readFileSync(join(paquet, 'www', 'index.html'), 'utf8')],
  ]
  for (const [nom, ok] of verifications) console.log(`  ${ok ? '✔' : '✘'} ${nom}`)
  if (verifications.some(([, ok]) => !ok)) throw new Error('Déploiement terminé, mais une vérification a échoué (voir ci-dessus).')

  console.log(`\n✔ Collector ${version} déployé sur ${parametres.url} en ${Math.round((Date.now() - debut) / 1000)} s.`)
  console.log('  Les téléphones déjà équipés proposeront « Mettre à jour » à leur prochaine ouverture.')
}

/**
 * Migrations du paquet absentes de la base ; null si le serveur n'a pas encore les routes de maintenance.
 */
async function migrationsAAppliquer(api, migrations) {
  const reponse = await api.get('/api/maintenance/schema')
  if (reponse.status === 404 && reponse.code !== 'maintenance_disabled') return null
  if (!reponse.ok) {
    throw new Error(
      reponse.code === 'maintenance_disabled'
        ? `${reponse.message}\n  Puis recopier le même jeton dans deploy/deploiement.local.json.`
        : `Routes de maintenance : ${reponse.message} (vérifier le jeton de deploy/deploiement.local.json).`,
    )
  }
  return migrations.filter((m) => !reponse.data.appliquees.includes(m))
}

async function envoyer(cible, chemins) {
  for (const [i, chemin] of chemins.entries()) {
    await cible.ecrire(chemin, readFileSync(join(paquet, chemin)))
    console.log(`  [${i + 1}/${chemins.length}] ${chemin}`)
  }
  if (chemins.length === 0) console.log('  Aucun changement.')
}

// Paramètres ------------------------------------------------------------------------------------------------

function lireParametres(fichier) {
  if (!existsSync(fichier)) {
    throw new Error(`Paramètres absents : ${fichier}\n  Copier deploy/deploiement.example.json vers deploy/deploiement.local.json et le compléter.`)
  }
  const p = JSON.parse(readFileSync(fichier, 'utf8'))
  const manquants = ['url', 'jeton', 'sftp.hote', 'sftp.utilisateur'].filter(
    (cle) => !cle.split('.').reduce((o, k) => o?.[k], p),
  )
  if (manquants.length > 0) throw new Error(`${fichier} : à compléter (${manquants.join(', ')}).`)
  return {
    url: String(p.url).replace(/\/+$/, ''),
    jeton: String(p.jeton),
    sftp: { port: 22, racine: '.', ...p.sftp },
  }
}

// API -------------------------------------------------------------------------------------------------------

function clientApi(url, jeton) {
  const appeler = async (methode, chemin) => {
    let reponse
    try {
      reponse = await fetch(url + chemin, {
        method: methode,
        headers: { 'X-Deploy-Token': jeton, 'X-Requested-With': 'Collector-deploiement', Accept: 'application/json' },
      })
    } catch (e) {
      throw new Error(`${url} injoignable : ${e.cause?.message ?? e.message}`)
    }
    const data = await reponse.json().catch(() => null)
    return {
      ok: reponse.ok,
      status: reponse.status,
      data,
      code: data?.error?.code,
      message: data?.error?.message ?? `HTTP ${reponse.status}`,
    }
  }
  return {
    get: (chemin) => appeler('GET', chemin),
    post: (chemin) => appeler('POST', chemin),
    texte: async (chemin) => (await fetch(url + chemin, { cache: 'no-store' })).text(),
  }
}

// Cibles : serveur SFTP, ou dossier local pour les essais ----------------------------------------------------

async function cibleSftp({ hote, port, utilisateur, racine: dossier }, motDePasse) {
  const { default: SftpClient } = await import('ssh2-sftp-client').catch(() => {
    throw new Error('Dépendance absente : lancer « npm install » dans le dossier scripts.')
  })
  const sftp = new SftpClient()
  try {
    await sftp.connect({ host: hote, port, username: utilisateur, password: motDePasse, readyTimeout: 20000 })
  } catch (e) {
    throw new Error(`Connexion SFTP impossible : ${e.message}`)
  }
  const dossiers = new Set()
  const distant = (chemin) => posix.join(dossier, chemin)
  return {
    async lire(chemin) {
      return (await sftp.exists(distant(chemin))) ? sftp.get(distant(chemin)) : null
    },
    async ecrire(chemin, contenu) {
      const parent = posix.dirname(distant(chemin))
      if (!dossiers.has(parent)) {
        if (!(await sftp.exists(parent))) await sftp.mkdir(parent, true)
        dossiers.add(parent)
      }
      await sftp.put(contenu, distant(chemin))
    },
    async supprimer(chemin) {
      await sftp.delete(distant(chemin), true)
    },
    fermer: () => sftp.end(),
  }
}

function cibleDossier(dossier) {
  return {
    async lire(chemin) {
      return existsSync(join(dossier, chemin)) ? readFileSync(join(dossier, chemin)) : null
    },
    async ecrire(chemin, contenu) {
      mkdirSync(dirname(join(dossier, chemin)), { recursive: true })
      writeFileSync(join(dossier, chemin), contenu)
    },
    async supprimer(chemin) {
      rmSync(join(dossier, chemin), { force: true })
    },
    async fermer() {},
  }
}

// Saisie au clavier ---------------------------------------------------------------------------------------

function demanderMotDePasse(question) {
  if (!process.stdin.isTTY) throw new Error('Le mot de passe SFTP doit être saisi dans un terminal.')
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true })
    // Seule la question est affichée, pas les caractères tapés
    rl._writeToOutput = (texte) => {
      if (texte.startsWith(question)) process.stdout.write(texte)
    }
    rl.question(question, (reponse) => {
      rl.close()
      process.stdout.write('\n')
      resolve(reponse)
    })
  })
}

function confirmer(question) {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout })
    rl.question(`${question} (o/N) `, (reponse) => {
      rl.close()
      resolve(/^o(ui)?$/i.test(reponse.trim()))
    })
  })
}

function arreter(message) {
  console.error(`\n✘ ${message}`)
  process.exit(1)
}
