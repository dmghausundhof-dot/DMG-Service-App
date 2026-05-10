'use client'

import Link from 'next/link'
import { useState } from 'react'
import Image from 'next/image'
import { Eye, EyeOff, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message === 'Invalid login credentials' 
        ? 'E-Mail oder Passwort ist falsch.' 
        : error.message)
    } else {
      window.location.href = '/dashboard'
    }
    setLoading(false)
  }

  return (
    <div className="flex min-h-[100dvh] min-h-screen flex-col items-center justify-center bg-slate-950 px-4 py-10 sm:px-6 sm:py-12">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-6 flex justify-center sm:mb-8">
          <Link href="/" className="flex max-w-full items-center gap-2 sm:gap-3">
            <Image
              src="/dmg-smart-house-logo.png"
              alt="DMG Service Logo"
              width={48}
              height={48}
              className="h-11 w-11 shrink-0 rounded-xl sm:h-12 sm:w-12 sm:rounded-2xl"
            />
            <div className="min-w-0 text-left">
              <div className="truncate text-xl font-semibold tracking-tight sm:text-2xl lg:text-3xl">DMG Service</div>
              <div className="-mt-0.5 text-[10px] text-slate-500 sm:text-xs">KUNDENPORTAL</div>
            </div>
          </Link>
        </div>

        <div className="card p-5 sm:p-8 lg:p-10">
          <div className="mb-6 text-center sm:mb-8">
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl lg:text-4xl">Willkommen zurück</h1>
            <p className="mt-2 text-sm text-slate-400 sm:mt-3 sm:text-base">Melden Sie sich in Ihrem Portal an</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5 sm:space-y-6">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300 sm:mb-2">E-Mail-Adresse</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input w-full text-base sm:text-lg"
                placeholder="max@mustermann.de"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300 sm:mb-2">Passwort</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="input w-full pr-12 text-base sm:text-lg"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  aria-label={showPassword ? 'Passwort verbergen' : 'Passwort anzeigen'}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-950 border border-red-900 text-red-400 text-sm px-4 py-3 rounded-2xl">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary flex w-full items-center justify-center gap-2 py-3.5 disabled:opacity-70 sm:py-4 sm:text-lg"
            >
              {loading ? 'Anmelden...' : 'Anmelden'}
              {!loading && <ArrowRight className="h-5 w-5 shrink-0" />}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-400 sm:mt-8">
            Noch kein Konto?{' '}
            <Link href="/register" className="text-emerald-500 hover:underline font-medium">
              Jetzt registrieren
            </Link>
          </div>
        </div>

        <div className="mt-6 space-y-2 text-center text-[11px] text-slate-500 sm:mt-8 sm:text-xs">
          <p>
            Probleme beim Anmelden?{' '}
            <a href="mailto:info@dmgservice.org" className="underline">
              Kontaktieren Sie uns
            </a>
          </p>
          <p className="text-slate-600">
            <Link href="/impressum" className="hover:text-slate-400 hover:underline">
              Impressum
            </Link>
            {' · '}
            <Link href="/datenschutz" className="hover:text-slate-400 hover:underline">
              Datenschutz
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
