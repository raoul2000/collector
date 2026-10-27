import { useState, type FormEvent } from 'react'
import type { MagasinRef } from '../../api/types'
import { Alert } from '../../components/Alert'
import { Button } from '../../components/Button'
import { TextField } from '../../components/TextField'
import { useBenevoleStore } from '../../stores/benevole'
import { demanderSynchro } from '../../sync/engine'
import styles from './benevole.module.css'
import { MagasinPicker } from './MagasinPicker'

export interface BienvenueProps {
  magasins: MagasinRef[]
}

/**
 * Premier lancement (ou magasin à choisir de nouveau) : prénom et magasin de collecte.
 */
export function Bienvenue({ magasins }: BienvenueProps) {
  const store = useBenevoleStore()
  const [prenom, setPrenom] = useState(store.prenom ?? '')
  const [magasinId, setMagasinId] = useState<number | null>(
    magasins.some((m) => m.id === store.magasinId) ? store.magasinId : null,
  )
  const [erreurs, setErreurs] = useState<{ prenom?: string; magasin?: string }>({})

  const valider = (event: FormEvent) => {
    event.preventDefault()
    const nouvellesErreurs = {
      prenom: prenom.trim() === '' ? 'Indiquez votre prénom.' : undefined,
      magasin: magasinId === null ? 'Choisissez votre magasin.' : undefined,
    }
    setErreurs(nouvellesErreurs)
    if (nouvellesErreurs.prenom || nouvellesErreurs.magasin) {
      return
    }

    store.setPrenom(prenom)
    store.setMagasin(magasinId)
    // Demande au navigateur de ne pas effacer les données locales (saisies pas encore envoyées)
    void navigator.storage?.persist?.()
    demanderSynchro()
  }

  return (
    <form className={styles.stack} onSubmit={valider} noValidate>
      <div>
        <h1 className={styles.title}>Bienvenue !</h1>
        <p className={styles.lead}>Merci de participer à la collecte. Deux informations pour commencer :</p>
      </div>

      <TextField
        label="Votre prénom"
        value={prenom}
        onChange={(e) => setPrenom(e.target.value)}
        error={erreurs.prenom}
        autoComplete="given-name"
        autoCapitalize="words"
        maxLength={50}
      />

      <div className={styles.field}>
        <span className={styles.label}>Votre magasin</span>
        {magasins.length === 0 ? (
          <Alert kind="warning">Aucun magasin n'est encore ouvert pour cette collecte.</Alert>
        ) : (
          <MagasinPicker magasins={magasins} value={magasinId} onChange={setMagasinId} label="Votre magasin" />
        )}
        {erreurs.magasin && <span className={styles.error}>{erreurs.magasin}</span>}
      </div>

      <Button type="submit" size="lg" block>
        Commencer la saisie
      </Button>
    </form>
  )
}
