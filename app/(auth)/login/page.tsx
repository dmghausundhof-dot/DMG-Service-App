'use client'

import Link from 'next/link'
import { useState } from 'react'
import Image from 'next/image'
import { House, Eye, EyeOff, ArrowRight } from 'lucide-react'
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
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
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
            <h1 className="text-4xl font-semibold tracking-tight">Willkommen zurück</h1>
            <p className="text-slate-400 mt-3">Melden Sie sich in Ihrem Portal an</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
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
                  className="w-full bg-slate-900 border border-slate-700 focus:border-emerald-600 rounded-2xl px-5 py-3.5 text-lg placeholder:text-slate-500 outline-none transition pr-12"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-4 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
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
              className="btn-primary w-full py-4 text-lg flex items-center justify-center gap-2 disabled:opacity-70"
            >
              {loading ? 'Anmelden...' : 'Anmelden'}
              {!loading && <ArrowRight className="w-5 h-5" />}
            </button>
          </form>

          <div className="text-center mt-8 text-sm text-slate-400">
            Noch kein Konto?{' '}
            <Link href="/register" className="text-emerald-500 hover:underline font-medium">
              Jetzt registrieren
            </Link>
          </div>
        </div>

        <p className="text-center text-xs text-slate-500 mt-8">
          Probleme beim Anmelden? <a href="mailto:info@dmgservice.org" className="underline">Kontaktieren Sie uns</a>
        </p>
      </div>
    </div>
  )
}
