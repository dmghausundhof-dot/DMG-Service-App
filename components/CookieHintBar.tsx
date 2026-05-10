'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'

const STORAGE_KEY = 'dmg_dsgvo_cookie_hint_dismissed'

/**
 * Nur Hinweis: technisch notwendige Cookies/Speicher für Login & Portal.
 * Kein Marketing-Tracking – keine Einwilligungspflicht nach TTDSG für diesen Fall,
 * Transparenz bleibt sinnvoll.
 */
export default function CookieHintBar() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && !localStorage.getItem(STORAGE_KEY)) {
        setVisible(true)
      }
    } catch {
      setVisible(true)
    }
  }, [])

  const dismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, '1')
    } catch {
      /* ignore */
    }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      role="region"
      aria-label="Hinweis zu Cookies und Datenspeicherung"
      className="fixed bottom-0 left-0 right-0 z-[100] border-t border-slate-800 bg-slate-900/98 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] shadow-[0_-8px_32px_rgba(0,0,0,0.4)] backdrop-blur-md sm:px-6"
    >
      <div className="mx-auto flex max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <p className="text-xs leading-relaxed text-slate-300 sm:text-sm">
          Wir setzen für das Kundenportal <strong className="font-medium text-slate-200">technisch notwendige</strong>{' '}
          Cookies bzw. lokale Speicherung ein (z.&nbsp;B. Anmeldung, Sicherheit, PWA). Es findet{' '}
          <strong className="font-medium text-slate-200">kein</strong> werbliches Tracking ohne Ihre Einwilligung statt.
          Details in der{' '}
          <Link href="/datenschutz" className="text-emerald-400 underline decoration-emerald-500/50 underline-offset-2 hover:text-emerald-300">
            Datenschutzerklärung
          </Link>
          .
        </p>
        <div className="flex shrink-0 items-center justify-end gap-2 sm:justify-start">
          <button
            type="button"
            onClick={dismiss}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-500"
          >
            Verstanden
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-800 hover:text-white"
            aria-label="Hinweis schließen"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
