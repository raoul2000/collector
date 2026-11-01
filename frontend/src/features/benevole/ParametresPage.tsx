import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { Button } from '../../components/Button'
import { Card } from '../../components/Card'
import { TextField } from '../../components/TextField'
import { Tile } from '../../components/Tile'
import { toast } from '../../components/toast'
import { useBenevoleStore } from '../../stores/benevole'
import { demanderSynchro, synchroniser } from '../../sync/engine'
import { useSyncStore } from '../../sync/syncStore'
import styles from './benevole.module.css'
import { useBenevole } from './context'
import { MagasinPicker } from './MagasinPicker'
import { useInstallPrompt } from './useInstallPrompt'

/**
 * Réglages du bénévole : prénom, magasin, installation de l'application, synchronisation.
 */
export function ParametresPage() {
  const { referentiel, magasin, prenom } = useBenevole()
  const { appareilId, setPrenom, setMagasin, theme, setTheme } = useBenevoleStore()
  const { derniereSynchro, enCours } = useSyncStore()
  const install = useInstallPrompt()

  const [nouveauPrenom, setNouveauPrenom] = useState(prenom)
  const [erreurPrenom, setErreurPrenom] = useState<string>()

  const enregistrerPrenom = (event: FormEvent) => {
    event.preventDefault()
    if (nouveauPrenom.trim() === '') {
      setErreurPrenom('Indiquez votre prénom.')
      return
    }
    setErreurPrenom(undefined)
    setPrenom(nouveauPrenom)
    demanderSynchro()
    toast.success('Prénom enregistré.')
  }

  const changerMagasin = (id: number) => {
    setMagasin(id)
    const choisi = referentiel.magasins.find((m) => m.id === id)
    toast.success(`Magasin : ${choisi?.nom ?? ''}`)
  }

  return (
    <div className={styles.stack}>
      <h1 className={styles.title}>Réglages</h1>

      <Card title="Mon magasin">
        <p className={styles.muted}>Les nouvelles saisies seront enregistrées pour le magasin choisi.</p>
        <div className={styles.section}>
          <MagasinPicker magasins={referentiel.magasins} value={magasin.id} onChange={changerMagasin} label="Mon magasin" />
        </div>
      </Card>

      <Card title="Mon prénom">
        <form className={styles.section} onSubmit={enregistrerPrenom} noValidate>
          <TextField
            label="Prénom"
            value={nouveauPrenom}
            onChange={(e) => setNouveauPrenom(e.target.value)}
            error={erreurPrenom}
            autoComplete="given-name"
            maxLength={50}
          />
          <Button type="submit" variant="secondary" disabled={nouveauPrenom.trim() === prenom}>
            Enregistrer
          </Button>
        </form>
      </Card>

      <Card title="Thème">
        <div className={styles.section}>
          <div className={styles.themes}>
            <Tile selected={theme === 'standard'} detail="Le plus lisible en plein jour" onClick={() => setTheme('standard')}>
              Standard
            </Tile>
            <Tile selected={theme === 'sombre'} detail="Moins éblouissant en intérieur" onClick={() => setTheme('sombre')}>
              Sombre
            </Tile>
          </div>
        </div>
      </Card>

      {!install.installee && (
        <Card title="Installer l'application">
          <div className={styles.section}>
            <p>Ajoutez Collector à l'écran d'accueil pour l'ouvrir comme une application, même sans réseau.</p>
            {install.installer ? (
              <Button onClick={() => void install.installer?.()}>Installer</Button>
            ) : install.ios ? (
              <p className={styles.muted}>
                Dans Safari, touchez le bouton <strong>Partager</strong> puis <strong>Sur l'écran d'accueil</strong>.
              </p>
            ) : (
              <p className={styles.muted}>
                Ouvrez le menu du navigateur puis choisissez <strong>Ajouter à l'écran d'accueil</strong> ou{' '}
                <strong>Installer l'application</strong>.
              </p>
            )}
          </div>
        </Card>
      )}

      <Card title="Synchronisation">
        <div className={styles.section}>
          <p>
            {derniereSynchro
              ? `Dernière synchronisation : ${new Date(derniereSynchro).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}`
              : 'Aucune synchronisation pour l\'instant.'}
          </p>
          <Button variant="secondary" loading={enCours} onClick={() => void synchroniser()}>
            Synchroniser maintenant
          </Button>
          <p className={styles.muted}>
            Collecte : {referentiel.campagne?.nom ?? 'aucune en cours'} · Appareil {appareilId.slice(0, 8)}
          </p>
        </div>
      </Card>

      <p className={styles.muted}>
        <Link to="/admin">Espace responsable</Link>
      </p>
    </div>
  )
}
