import { useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router'
import { ApiError } from '../../api/client'
import { Alert } from '../../components/Alert'
import { Button } from '../../components/Button'
import { TextField } from '../../components/TextField'
import { useAdminSession, useLogin } from './api'
import type { FieldErrors } from './errors'
import styles from './LoginPage.module.css'

export function LoginPage() {
  const location = useLocation()
  const session = useAdminSession()
  const login = useLogin()

  const [prenom, setPrenom] = useState('')
  const [motDePasse, setMotDePasse] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [error, setError] = useState<string | null>(null)

  if (session.data) {
    const from = (location.state as { from?: string } | null)?.from
    return <Navigate to={from?.startsWith('/admin') ? from : '/admin'} replace />
  }

  const submit = (event: FormEvent) => {
    event.preventDefault()
    setFieldErrors({})
    setError(null)
    login.mutate(
      { prenom, motDePasse },
      {
        onError: (e) => {
          if (e instanceof ApiError && e.status === 422) {
            setFieldErrors(e.fields)
          } else {
            setError(e.message)
            setMotDePasse('')
          }
        },
      },
    )
  }

  return (
    <main className={styles.page}>
      <form className={styles.card} onSubmit={submit} noValidate>
        <div>
          <h1 className={styles.title}>Espace responsable</h1>
          <p className={styles.subtitle}>Collector · collecte alimentaire</p>
        </div>

        {error && <Alert kind="error">{error}</Alert>}

        <TextField
          label="Prénom"
          value={prenom}
          onChange={(e) => setPrenom(e.target.value)}
          error={fieldErrors.prenom}
          autoComplete="given-name"
          maxLength={50}
          required
        />
        <TextField
          label="Mot de passe"
          type="password"
          value={motDePasse}
          onChange={(e) => setMotDePasse(e.target.value)}
          error={fieldErrors.motDePasse}
          autoComplete="current-password"
          required
        />
        <Button type="submit" size="lg" block loading={login.isPending}>
          Se connecter
        </Button>
      </form>
    </main>
  )
}
