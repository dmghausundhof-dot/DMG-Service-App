'use client'

import Link from 'next/link'
import { useState } from 'react'
import Image from 'next/image'
import { Eye, EyeOff, ArrowRight, Check } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const supabase = createClient()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data: authData, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    })

    if (error) {
      setError(error.message)
    } else if (authData.user) {
      // Automatically create profile + first object "Mein Haus"
      try {
        const response = await fetch('/api/create-profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: authData.user.id,
            fullName,
          }),
        })
        
        if (!response.ok) {
          console.warn('Profile creation may have issues, but account is created')
        }
      } catch (err) {
        console.warn('Profile auto-creation skipped (will be created on first login)')
      }
      
      setSuccess(true)
    }
    setLoading(false)
  }

  if (success) {
    return (
      <div className="flex min-h-[100dvh] min-h-screen items-center justify-center bg-slate-950 px-4 py-10 sm:p-6 sm:py-12">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-600/20 sm:mb-8 sm:h-20 sm:w-20">
            <Check className="h-8 w-8 text-emerald-500 sm:h-10 sm:w-10" />
          </div>
          <h1 className="mb-3 text-2xl font-semibold tracking-tight sm:mb-4 sm:text-3xl lg:text-4xl">Fast geschafft!</h1>
          <p className="mb-6 text-base text-slate-400 sm:mb-8 sm:text-lg">
            Wir haben Ihnen eine Bestätigungs-E-Mail an <span className="break-all text-white">{email}</span> geschickt.
            <span className="mt-2 block">Bitte bestätigen Sie Ihr Konto, um fortzufahren.</span>
          </p>
          <Link href="/login" className="btn-primary inline-flex items-center justify-center gap-2">
            Zum Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-[100dvh] min-h-screen flex-col items-center justify-center bg-slate-950 px-4 py-10 sm:px-6 sm:py-12">
      <div className="w-full max-w-md">
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
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl lg:text-4xl">Konto erstellen</h1>
            <p className="mt-2 text-sm text-slate-400 sm:mt-3 sm:text-base">Starten Sie in weniger als 2 Minuten</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-5 sm:space-y-6">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300 sm:mb-2">Vollständiger Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="input w-full text-base sm:text-lg"
                placeholder="Max Mustermann"
              />
            </div>

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
                  minLength={6}
                  className="input w-full pr-12 text-base sm:text-lg"
                  placeholder="Mindestens 6 Zeichen"
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
              <p className="mt-1.5 text-xs text-slate-500">Mindestens 6 Zeichen</p>
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
              {loading ? 'Konto wird erstellt...' : 'Kostenlos registrieren'}
              {!loading && <ArrowRight className="h-5 w-5 shrink-0" />}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-400 sm:mt-8">
            Bereits ein Konto?{' '}
            <Link href="/login" className="text-emerald-500 hover:underline font-medium">
              Anmelden
            </Link>
          </div>
        </div>

        <p className="mx-auto mt-6 max-w-xs text-center text-[11px] text-slate-500 sm:mt-8 sm:text-xs">
          Mit der Registrierung stimmen Sie unseren Nutzungsbedingungen und der Datenschutzerklärung zu.
        </p>
      </div>
    </div>
  )
}
