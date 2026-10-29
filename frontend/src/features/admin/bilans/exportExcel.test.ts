import { strFromU8, unzipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import writeExcelFile from 'write-excel-file/universal'
import type { SaisieExport } from '../../../api/types'
import { COLONNES, dateExcel, nomFichier } from './exportExcel'

const PATES: SaisieExport = {
  saisieLe: '2026-11-27 10:15:00',
  magasin: 'Lidl',
  ville: 'Centre',
  prenom: 'Marie',
  categorie: 'Pâtes',
  codeReference: 'EPI-01',
  unite: 'kg',
  quantite: 3,
  contenanceUnitaire: 500,
  corrigeParResponsable: null,
}

describe('Export Excel', () => {
  it("garde l'heure locale du don (Excel n'a pas de fuseau)", () => {
    expect(dateExcel('2026-11-27 10:15:00').toISOString()).toBe('2026-11-27T10:15:00.000Z')
  })

  it('tire le nom du fichier du nom de la campagne', () => {
    expect(nomFichier('Collecte novembre 2026')).toBe('collecte-novembre-2026')
    expect(nomFichier('  Été / Noël ! ')).toBe('ete-noel')
    expect(nomFichier('???')).toBe('collecte')
  })

  it('produit une feuille « Saisies » avec une ligne par saisie', async () => {
    const huile: SaisieExport = { ...PATES, categorie: 'Huile', codeReference: null, unite: 'L', quantite: 2, contenanceUnitaire: 750, corrigeParResponsable: 'Paul' }
    const savon: SaisieExport = { ...PATES, categorie: 'Savon', unite: 'unite', quantite: 4, contenanceUnitaire: null }

    const blob = await writeExcelFile([PATES, huile, savon], { columns: COLONNES, sheet: 'Saisies' }).toBlob()
    const fichiers = unzipSync(new Uint8Array(await blob.arrayBuffer()))
    const classeur = strFromU8(fichiers['xl/workbook.xml']!)
    const feuille = strFromU8(fichiers['xl/worksheets/sheet1.xml']!)
    const textes = strFromU8(fichiers['xl/sharedStrings.xml'] ?? new Uint8Array())
    const contenu = feuille + textes

    expect(classeur).toContain('name="Saisies"')
    expect(feuille.match(/<row /g)).toHaveLength(4)
    for (const texte of ['Date', 'Poids total (kg)', 'Volume total (L)', 'Lidl', 'Centre', 'Marie', 'Pâtes', 'EPI-01', 'unité', 'Paul']) {
      expect(contenu).toContain(texte)
    }
    // 3 × 500 g = 1,5 kg ; 2 × 750 ml = 1,5 L
    expect(feuille.match(/<v>1\.5<\/v>/g)).toHaveLength(2)
  })
})
