import { useEffect, useState } from 'react'

/** Événement non standard émis par Chrome / Android quand l'application peut être installée */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export interface InstallPrompt {
  /** L'application est déjà ouverte depuis l'écran d'accueil */
  installee: boolean
  /** Installation proposée directement par le navigateur (Android) */
  installer: (() => Promise<void>) | null
  /** iPhone / iPad : l'installation se fait par le menu Partager de Safari */
  ios: boolean
}

export function useInstallPrompt(): InstallPrompt {
  const [evenement, setEvenement] = useState<BeforeInstallPromptEvent | null>(null)
  const [installee, setInstallee] = useState(
    () =>
      window.matchMedia?.('(display-mode: standalone)').matches === true ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true,
  )

  useEffect(() => {
    const surProposition = (event: Event) => {
      event.preventDefault()
      setEvenement(event as BeforeInstallPromptEvent)
    }
    const surInstallation = () => {
      setInstallee(true)
      setEvenement(null)
    }
    window.addEventListener('beforeinstallprompt', surProposition)
    window.addEventListener('appinstalled', surInstallation)
    return () => {
      window.removeEventListener('beforeinstallprompt', surProposition)
      window.removeEventListener('appinstalled', surInstallation)
    }
  }, [])

  return {
    installee,
    installer: evenement
      ? async () => {
          await evenement.prompt()
          await evenement.userChoice
          setEvenement(null)
        }
      : null,
    ios: /iphone|ipad|ipod/i.test(navigator.userAgent),
  }
}
