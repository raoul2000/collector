import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Button } from './Button'
import { ConfirmDialog } from './ConfirmDialog'
import { TextField } from './TextField'
import { toast, useToastStore } from './toast'
import { Toaster } from './Toaster'

describe('Button', () => {
  it('est désactivé et signalé occupé pendant un chargement', () => {
    render(<Button loading>Enregistrer</Button>)

    const button = screen.getByRole('button', { name: 'Enregistrer' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(button).toHaveAttribute('type', 'button')
  })
})

describe('TextField', () => {
  it('associe le libellé, l’aide et l’erreur au champ', () => {
    render(<TextField label="Nom" hint="Nom du magasin" error="Obligatoire." />)

    const input = screen.getByLabelText('Nom')
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription('Nom du magasin Obligatoire.')
  })
})

describe('ConfirmDialog', () => {
  it('n’affiche son contenu que lorsqu’elle est ouverte', () => {
    const { rerender } = render(
      <ConfirmDialog open={false} title="Supprimer ?" onConfirm={() => {}} onCancel={() => {}}>
        Action irréversible
      </ConfirmDialog>,
    )
    expect(screen.queryByText('Action irréversible')).not.toBeInTheDocument()

    rerender(
      <ConfirmDialog open title="Supprimer ?" onConfirm={() => {}} onCancel={() => {}}>
        Action irréversible
      </ConfirmDialog>,
    )
    expect(screen.getByRole('dialog', { name: 'Supprimer ?' })).toBeInTheDocument()
    expect(screen.getByText('Action irréversible')).toBeInTheDocument()
  })

  it('appelle onConfirm et onCancel', async () => {
    const user = userEvent.setup()
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    render(
      <ConfirmDialog open title="Supprimer ?" confirmLabel="Supprimer" danger onConfirm={onConfirm} onCancel={onCancel}>
        Action irréversible
      </ConfirmDialog>,
    )

    await user.click(screen.getByRole('button', { name: 'Supprimer' }))
    await user.click(screen.getByRole('button', { name: 'Annuler' }))
    await user.click(screen.getByRole('button', { name: 'Fermer' }))

    expect(onConfirm).toHaveBeenCalledTimes(1)
    expect(onCancel).toHaveBeenCalledTimes(2)
  })
})

describe('Toaster', () => {
  afterEach(() => {
    vi.useRealTimers()
    useToastStore.setState({ toasts: [] })
  })

  it('affiche un message puis le retire automatiquement', () => {
    vi.useFakeTimers()
    render(<Toaster />)

    act(() => toast.success('Magasin enregistré'))
    expect(screen.getByText('Magasin enregistré')).toBeInTheDocument()

    act(() => vi.advanceTimersByTime(4000))
    expect(screen.queryByText('Magasin enregistré')).not.toBeInTheDocument()
  })
})
