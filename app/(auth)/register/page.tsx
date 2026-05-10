'use client'

import Link from 'next/link'
import { useState } from 'react'
import Image from 'next/image'
import { House, Eye, EyeOff, ArrowRight, Check } from 'lucide-react'
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
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <div className="w-20 h-20 bg-emerald-600/20 rounded-full flex items-center justify-center mx-auto mb-8">
            <Check className="w-10 h-10 text-emerald-500" />
          </div>
          <h1 className="text-4xl font-semibold tracking-tight mb-4">Fast geschafft!</h1>
          <p className="text-xl text-slate-400 mb-8">
            Wir haben Ihnen eine Bestätigungs-E-Mail an <span className="text-white">{email}</span> geschickt.<br />
            Bitte bestätigen Sie Ihr Konto, um fortzufahren.
          </p>
          <Link href="/login" className="btn-primary inline-flex items-center gap-2">
            Zum Login
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex justify-center mb-10">
          <Link href="/" className="flex items-center gap-3">
            <Image 
              src="/dmg-smart-house-logo.png" 
              alt="DMG Service Logo" 
              width={48} 
              height={48} 
              className="rounded-2xl" 
            />
            <div>
              <div className="font-semibold text-3xl tracking-tight">DMG Service</div>
              <div className="text-xs text-slate-500 -mt-1">KUNDENPORTAL</div>
            </div>
          </Link>
        </div>

        <div className="card p-10">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-semibold tracking-tight">Konto erstellen</h1>
            <p className="text-slate-400 mt-3">Starten Sie in weniger als 2 Minuten</p>
          </div>

          <form onSubmit={handleRegister} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Vollständiger Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-600 rounded-2xl px-5 py-3.5 text-lg placeholder:text-slate-500 outline-none transition"
                placeholder="Max Mustermann"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">E-Mail-Adresse</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-600 rounded-2xl px-5 py-3.5 text-lg placeholder:text-slate-500 outline-none transition"
                placeholder="max@mustermann.de"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Passwort</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-600 rounded-2xl px-5 py-3.5 text-lg placeholder:text-slate-500 outline-none transition pr-12"
                  placeholder="Mindestens 6 Zeichen"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-4 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <p className="text-xs text-slate-500 mt-1.5">Mindestens 6 Zeichen</p>
            </div>

            {error && (
              <div className="bg-red-950 border border-red-900 text-red-400 text-sm px-4 py-3 rounded-2xl">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-4 text-lg flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading ? 'Konto wird erstellt...' : 'Kostenlos registrieren'}
              {!loading && <ArrowRight className="w-5 h-5" />}
            </button>
          </form>

          <div className="text-center mt-8 text-sm text-slate-400">
            Bereits ein Konto?{' '}
            <Link href="/login" className="text-emerald-500 hover:underline font-medium">
              Anmelden
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-slate-500 mt-8 max-w-xs mx-auto">
          Mit der Registrierung stimmen Sie unseren Nutzungsbedingungen und der Datenschutzerklärung zu.
        </p>
      </div>
    </div>
  )
}
