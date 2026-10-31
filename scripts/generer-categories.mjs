#!/usr/bin/env node
/**
 * Génère les scripts SQL de la liste des catégories à partir de docs/categories/liste-benevoles.csv
 * (une ligne par bouton : section, catégorie, unité, contenance, variante, article AÏDA visé) :
 *
 *   backend/sql/categories_initiales.sql      installation neuve (tables section, categorie et format vides)
 *   backend/sql/reinitialiser-referentiel.sql remise à zéro : supprime saisies, catégories et sections, puis
 *                                             installe la liste (production sans vraie saisie)
 *
 * Usage : node scripts/generer-categories.mjs
 *
 * Les identifiants sont attribués par la base (AUTO_INCREMENT) : après une remise à zéro, une ancienne saisie
 * restée sur un téléphone ne peut pas être rattachée par erreur à une nouvelle catégorie.
 * Le code AÏDA n'est pas encore importé : il servira au rapprochement avec AÏDA (plan, 4.5).
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const racine = join(dirname(fileURLToPath(import.meta.url)), '..')
const source = 'docs/categories/liste-benevoles.csv'

const [entete, ...lignes] = readFileSync(join(racine, source), 'utf8').trim().split(/\r?\n/).map((l) => l.split(';'))
const col = Object.fromEntries(entete.map((nom, i) => [nom, i]))

/** @type {Map<string, Map<string, {unite: string, boutons: {contenance: number|null, libelle: string|null}[]}>>} */
const sections = new Map()
for (const ligne of lignes) {
  const [section, categorie, unite] = [ligne[col.section], ligne[col.categorie], ligne[col.unite]]
  if (!['kg', 'L', 'unite'].includes(unite)) throw new Error(`${categorie} : unité inconnue « ${unite} »`)
  const categories = sections.get(section) ?? sections.set(section, new Map()).get(section)
  const cat = categories.get(categorie) ?? categories.set(categorie, { unite, boutons: [] }).get(categorie)
  if (cat.unite !== unite) throw new Error(`${categorie} : unités différentes`)
  const contenance = ligne[col.contenance] === '' ? null : Number(ligne[col.contenance])
  const libelle = ligne[col.variante] || null
  // Ligne sans contenance ni variante : catégorie sans bouton
  if (contenance !== null || libelle !== null) cat.boutons.push({ contenance, libelle })
}

const sql = (valeur) => (valeur === null ? 'NULL' : typeof valeur === 'number' ? String(valeur) : `'${valeur.replaceAll("'", "''")}'`)

const insertions = []
let ordreSection = 0
let ordreCategorie = 0
for (const [section, categories] of sections) {
  insertions.push('', `-- ${section}`, `INSERT INTO section (nom, ordre) VALUES (${sql(section)}, ${(ordreSection += 10)});`, 'SET @section = LAST_INSERT_ID();')
  for (const [nom, { unite, boutons }] of categories) {
    insertions.push(`INSERT INTO categorie (nom, section_id, unite, ordre) VALUES (${sql(nom)}, @section, ${sql(unite)}, ${(ordreCategorie += 10)});`)
    if (boutons.length > 0) {
      insertions.push(
        'SET @categorie = LAST_INSERT_ID();',
        `INSERT INTO format (categorie_id, contenance, libelle, ordre) VALUES ${boutons
          .map((b, i) => `(@categorie, ${sql(b.contenance)}, ${sql(b.libelle)}, ${i + 1})`)
          .join(', ')};`,
      )
    }
  }
}

const nbCategories = [...sections.values()].reduce((n, c) => n + c.size, 0)
const genere = `-- Généré par scripts/generer-categories.mjs à partir de ${source} : ne pas modifier à la main.
-- ${sections.size} sections, ${nbCategories} catégories.`

writeFileSync(
  join(racine, 'backend/sql/categories_initiales.sql'),
  [
    '-- Liste des catégories des bénévoles (sections, catégories, formats et variantes), construite d\'après la',
    '-- planche « Articles génériques » de la Croix-Rouge. À importer une fois sur une base neuve, après les migrations.',
    genere,
    '',
    'SET NAMES utf8mb4;',
    ...insertions,
    '',
  ].join('\n'),
)

writeFileSync(
  join(racine, 'backend/sql/reinitialiser-referentiel.sql'),
  [
    '-- REMISE À ZÉRO du référentiel : SUPPRIME TOUTES LES SAISIES, puis remplace catégories et sections par la',
    '-- liste des bénévoles. À n\'utiliser que tant qu\'aucune vraie saisie n\'a été faite, après une sauvegarde de la base.',
    '-- Campagnes, magasins, appareils et journal sont conservés.',
    genere,
    '',
    'SET NAMES utf8mb4;',
    '',
    'DELETE FROM saisie;',
    'DELETE FROM format;',
    'DELETE FROM categorie;',
    'DELETE FROM section;',
    ...insertions,
    '',
  ].join('\n'),
)

console.log(`✔ ${sections.size} sections, ${nbCategories} catégories : backend/sql/categories_initiales.sql, backend/sql/reinitialiser-referentiel.sql`)
