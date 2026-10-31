import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { after, describe, it } from 'node:test'
import { empreinte, manifesteLocal, planifier } from './deploiement.mjs'

describe('manifesteLocal', () => {
  const paquet = mkdtempSync(join(tmpdir(), 'collector-paquet-'))
  after(() => rmSync(paquet, { recursive: true, force: true }))

  it('donne l’empreinte des fichiers de app/ et www/ uniquement', () => {
    mkdirSync(join(paquet, 'app', 'src'), { recursive: true })
    mkdirSync(join(paquet, 'www', 'assets'), { recursive: true })
    mkdirSync(join(paquet, 'sql'))
    writeFileSync(join(paquet, 'app', 'src', 'App.php'), '<?php')
    writeFileSync(join(paquet, 'www', 'index.html'), '<html>')
    writeFileSync(join(paquet, 'www', 'assets', 'index-a1.js'), 'js')
    writeFileSync(join(paquet, 'sql', 'installation.sql'), 'sql')
    writeFileSync(join(paquet, 'VERSION.txt'), '1.0.0')

    assert.deepEqual(manifesteLocal(paquet), {
      'app/src/App.php': empreinte('<?php'),
      'www/assets/index-a1.js': empreinte('js'),
      'www/index.html': empreinte('<html>'),
    })
  })
})

describe('planifier', () => {
  const local = {
    'app/src/App.php': 'v2',
    'app/vendor/autoload.php': 'v1',
    'www/api/index.php': 'v1',
    'www/assets/index-B.js': 'v2',
    'www/index.html': 'v2',
    'www/sw.js': 'v2',
    'www/favicon.ico': 'v1',
  }

  it('envoie tout sans manifeste sur le serveur, l’API d’abord, index.html en dernier', () => {
    const plan = planifier(local, null, { version: '1.2.0' })

    assert.deepEqual(plan.api, ['app/src/App.php', 'app/vendor/autoload.php'])
    assert.deepEqual(plan.interface, ['www/api/index.php', 'www/assets/index-B.js', 'www/favicon.ico', 'www/sw.js', 'www/index.html'])
    assert.deepEqual(plan.supprimer, [])
    assert.deepEqual(plan.manifeste, { version: '1.2.0', fichiers: local, anciens: [] })
  })

  it('n’envoie que les fichiers modifiés et garde les anciens fichiers compilés un déploiement de plus', () => {
    const distant = {
      fichiers: {
        'app/src/App.php': 'v1',
        'app/src/Ancien.php': 'v1',
        'app/vendor/autoload.php': 'v1',
        'www/api/index.php': 'v1',
        'www/assets/index-A.js': 'v1',
        'www/index.html': 'v1',
        'www/sw.js': 'v1',
        'www/favicon.ico': 'v1',
      },
      anciens: ['www/assets/index-0.js'],
    }
    const plan = planifier(local, distant)

    assert.deepEqual(plan.api, ['app/src/App.php'])
    assert.deepEqual(plan.interface, ['www/assets/index-B.js', 'www/sw.js', 'www/index.html'])
    assert.deepEqual(plan.supprimer, ['app/src/Ancien.php', 'www/assets/index-0.js'])
    assert.deepEqual(plan.manifeste.anciens, ['www/assets/index-A.js'])
  })

  it('ne touche jamais à la configuration ni à var/', () => {
    const distant = { fichiers: { 'app/config/config.php': 'x', 'app/var/log/a.log': 'x', ...local }, anciens: ['app/var/b'] }
    assert.deepEqual(planifier(local, distant).supprimer, [])
    assert.throws(() => planifier({ ...local, 'app/config/config.php': 'x' }, null), /ne doit pas contenir app\/config\/config\.php/)
  })
})
