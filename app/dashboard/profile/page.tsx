'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getOrCreateProfileId } from '@/lib/supabase/ensure-profile'
import { User, Save, ArrowLeft, Lock, FileUp, Trash2, Loader2 } from 'lucide-react'
import { DELETE_ACCOUNT_CONFIRM_PHRASE } from '@/lib/delete-account-constants'
import Link from 'next/link'

export default function ProfilePage() {
  const supabase = createClient()
  
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  // Password change states
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordMessage, setPasswordMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  const [deletePassword, setDeletePassword] = useState('')
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  useEffect(() => {
    async function loadProfile() {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        await getOrCreateProfileId(supabase, user)

        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, phone, email, notes, role')
          .eq('user_id', user.id)
          .maybeSingle()
        
        setIsAdmin(profile?.role === 'admin')

        if (profile) {
          setFullName(profile.full_name || '')
          setPhone(profile.phone || '')
          setEmail(profile.email || user.email || '')
          setNotes(profile.notes || '')
        }
      }
      setLoading(false)
    }
    loadProfile()
  }, [supabase])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setMessage(null)

    if (!phone.trim()) {
      setMessage({ type: 'error', text: 'Telefonnummer ist ein Pflichtfeld.' })
      setSaving(false)
      return
    }

    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      setMessage({ type: 'error', text: 'Nicht angemeldet.' })
      setSaving(false)
      return
    }

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: fullName,
        phone: phone.trim(),
        email: email || null,
        notes: notes || null,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', user.id)

    if (error) {
      setMessage({ type: 'error', text: 'Fehler beim Speichern: ' + error.message })
    } else {
      setMessage({ type: 'success', text: 'Profil erfolgreich aktualisiert!' })
      setTimeout(() => setMessage(null), 3000)
    }
    setSaving(false)
  }

  const handleDeleteAccount = async () => {
    setDeleteError(null)
    if (deleteConfirmText.trim() !== DELETE_ACCOUNT_CONFIRM_PHRASE) {
      setDeleteError('Bitte den Bestätigungstext exakt wie vorgegeben eingeben.')
      return
    }
    if (!deletePassword) {
      setDeleteError('Bitte Ihr aktuelles Passwort eingeben.')
      return
    }
    setDeleteLoading(true)
    try {
      const res = await fetch('/api/delete-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          password: deletePassword,
          confirmText: deleteConfirmText.trim(),
        }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) {
        setDeleteError(data.error || 'Löschung fehlgeschlagen.')
        setDeleteLoading(false)
        return
      }
      await supabase.auth.signOut()
      window.location.href = '/login?deleted=1'
    } catch {
      setDeleteError('Netzwerkfehler.')
      setDeleteLoading(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordMessage(null)

    if (!currentPassword || !newPassword || !confirmNewPassword) {
      setPasswordMessage({ type: 'error', text: 'Bitte alle Passwort-Felder ausfüllen.' })
      return
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordMessage({ type: 'error', text: 'Die neuen Passwörter stimmen nicht überein.' })
      return
    }
    if (newPassword.length < 6) {
      setPasswordMessage({ type: 'error', text: 'Das neue Passwort muss mindestens 6 Zeichen lang sein.' })
      return
    }

    setPasswordSaving(true)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !user.email) {
      setPasswordMessage({ type: 'error', text: 'Benutzer nicht gefunden.' })
      setPasswordSaving(false)
      return
    }

    // Verify current password by signing in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword
    })

    if (signInError) {
      setPasswordMessage({ type: 'error', text: 'Aktuelles Passwort ist falsch.' })
      setPasswordSaving(false)
      return
    }

    // Update to new password
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword
    })

    if (updateError) {
      setPasswordMessage({ type: 'error', text: 'Fehler beim Ändern des Passworts: ' + updateError.message })
    } else {
      setPasswordMessage({ type: 'success', text: 'Passwort erfolgreich geändert! Sie können sich zukünftig mit dem neuen Passwort anmelden.' })
      // Clear form
      setCurrentPassword('')
      setNewPassword('')
      setConfirmNewPassword('')
      // Optional: refresh the page or session, but updateUser keeps session valid
    }
    setPasswordSaving(false)
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 text-center">
        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
        <p className="text-sm text-slate-400">Profil wird geladen...</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 sm:mb-8">
        <Link href="/dashboard" className="mb-3 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white sm:mb-4">
          <ArrowLeft className="h-4 w-4 shrink-0" /> Zurück zur Übersicht
        </Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-600/10 sm:h-14 sm:w-14">
            <User className="h-6 w-6 text-emerald-500 sm:h-7 sm:w-7" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold tracking-[2px] text-emerald-500 sm:text-sm">PERSÖNLICHE DATEN</div>
            <h1 className="text-3xl font-semibold tracking-tighter sm:text-4xl lg:text-5xl">Mein Profil</h1>
            <p className="mt-1 text-base text-slate-400 sm:mt-2 sm:text-lg lg:text-xl">Kontaktdaten und Präferenzen verwalten</p>
          </div>
        </div>
      </div>

      {isAdmin && (
        <div className="card mb-6 border border-emerald-800/50 bg-emerald-950/20 p-4 sm:mb-8 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <div className="text-xs font-semibold text-emerald-500 tracking-[2px] mb-1">ADMIN</div>
              <p className="text-slate-200 font-medium">Kunden-Belege hier hochladen</p>
              <p className="text-sm text-slate-400 mt-1">
                Rechnungen, Angebote und Serviceberichte einem Kundenobjekt zuordnen – wie in der Sidebar unter „Admin: Belege“.
              </p>
            </div>
            <Link
              href="/dashboard/admin/documents/new"
              className="btn-primary inline-flex items-center justify-center gap-2 px-6 py-3 whitespace-nowrap shrink-0"
            >
              <FileUp className="w-5 h-5" />
              Beleg für Kunden
            </Link>
          </div>
        </div>
      )}

      <div className="card p-5 sm:p-6 lg:p-8">
        <form onSubmit={handleSave} className="space-y-5 sm:space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Vollständiger Name</label>
            <input 
              type="text" 
              value={fullName} 
              onChange={(e) => setFullName(e.target.value)}
              className="input w-full py-3 text-base"
              placeholder="Max Mustermann"
              required 
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Telefon *</label>
              <input 
                type="tel" 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)}
                className="input w-full py-3 text-base"
                placeholder="+49 176 12345678"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">E-Mail (Kontakt)</label>
              <input 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)}
                className="input w-full py-3 text-base"
                placeholder="max@mustermann.de"
              />
              <p className="text-xs text-slate-500 mt-1">Für Terminerinnerungen und Serviceberichte</p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Notizen / Präferenzen</label>
            <textarea 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)}
              className="input w-full py-3 text-base min-h-[120px]"
              placeholder="z. B. Ich bevorzuge Termine vormittags, habe einen Hund, Schlüssel in Blumenkübel..."
            />
            <p className="text-xs text-slate-500 mt-1">Diese Infos helfen uns, Sie besser zu betreuen (z. B. bei Terminen)</p>
          </div>

          {message && (
            <div className={`p-4 rounded-2xl text-sm ${message.type === 'success' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900' : 'bg-red-950 text-red-400 border border-red-900'}`}>
              {message.text}
            </div>
          )}

          <div className="flex flex-col gap-3 pt-4 sm:flex-row sm:gap-4">
            <button
              type="submit"
              disabled={saving}
              className="btn-primary order-1 flex flex-1 items-center justify-center gap-2 py-3.5 disabled:opacity-50 sm:order-none sm:py-4"
            >
              {saving ? (
                <>Wird gespeichert...</>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  Änderungen speichern
                </>
              )}
            </button>
            <Link href="/dashboard" className="btn-secondary order-2 flex flex-1 items-center justify-center py-3.5 sm:order-none sm:py-4">
              Abbrechen
            </Link>
          </div>
        </form>
      </div>

      {/* Passwort ändern Section */}
      <div className="mt-8 sm:mt-10">
        <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-600/10 sm:h-14 sm:w-14">
            <Lock className="h-6 w-6 text-emerald-500 sm:h-7 sm:w-7" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold tracking-[2px] text-emerald-500 sm:text-sm">SICHERHEIT</div>
            <h2 className="text-2xl font-semibold tracking-tighter sm:text-3xl lg:text-4xl">Passwort ändern</h2>
            <p className="mt-1 text-base text-slate-400 sm:text-lg">Schützen Sie Ihr Konto mit einem starken Passwort</p>
          </div>
        </div>

        <div className="card max-w-2xl p-5 sm:p-6 lg:p-8">
          <form onSubmit={handlePasswordChange} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Aktuelles Passwort</label>
              <input 
                type="password" 
                value={currentPassword} 
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="input w-full py-3 text-base"
                placeholder="••••••••"
                required 
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Neues Passwort</label>
                <input 
                  type="password" 
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input w-full py-3 text-base"
                  placeholder="••••••••"
                  required 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Neues Passwort bestätigen</label>
                <input 
                  type="password" 
                  value={confirmNewPassword} 
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="input w-full py-3 text-base"
                  placeholder="••••••••"
                  required 
                />
              </div>
            </div>

            {passwordMessage && (
              <div className={`p-4 rounded-2xl text-sm ${passwordMessage.type === 'success' ? 'bg-emerald-950 text-emerald-400 border border-emerald-900' : 'bg-red-950 text-red-400 border border-red-900'}`}>
                {passwordMessage.text}
              </div>
            )}

            <div className="pt-4">
              <button 
                type="submit" 
                disabled={passwordSaving}
                className="btn-primary w-full flex items-center justify-center gap-2 py-4 text-base disabled:opacity-50"
              >
                {passwordSaving ? (
                  <>Wird geändert...</>
                ) : (
                  <>
                    <Lock className="w-5 h-5" />
                    Passwort jetzt ändern
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Konto löschen (Art. 17 DSGVO) */}
      <div className="mt-10 sm:mt-12">
        <div className="mb-5 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-950/50 sm:h-14 sm:w-14">
            <Trash2 className="h-6 w-6 text-red-400 sm:h-7 sm:w-7" />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold tracking-[2px] text-red-400/90 sm:text-sm">KONTO</div>
            <h2 className="text-2xl font-semibold tracking-tighter sm:text-3xl lg:text-4xl">Konto und Daten löschen</h2>
            <p className="mt-1 text-base text-slate-400 sm:text-lg">
              Unwiderrufliche Löschung Ihres Zugangs, Profils, Objekte, Termine, Dokumente und zugehöriger Dateien.
            </p>
          </div>
        </div>

        <div className="card max-w-2xl border border-red-900/40 bg-red-950/10 p-5 sm:p-6 lg:p-8">
          {isAdmin ? (
            <p className="mb-4 rounded-xl border border-amber-900/50 bg-amber-950/30 p-3 text-sm text-amber-200">
              Hinweis: Ihr Konto hat Administratorrechte. Bei Löschung entfallen ggf. interne Zusatzfunktionen – nur
              fortfahren, wenn Sie sich sicher sind.
            </p>
          ) : null}
          <p className="mb-4 text-sm text-slate-400">
            Die Löschung kann nicht rückgängig gemacht werden. Es werden u. a. Ihr Login, Kontaktdaten, Einträge zu
            Objekten/Anlagen/Terminen und Dateien in unserem Speicher entfernt, soweit keine gesetzlichen
            Aufbewahrungspflichten entgegenstehen.
          </p>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">Aktuelles Passwort (zur Bestätigung)</label>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                autoComplete="current-password"
                className="input w-full py-3 text-base"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-slate-300">
                Bestätigung (exakt eingeben)
              </label>
              <input
                type="text"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                className="input w-full py-3 font-mono text-sm text-slate-200"
                placeholder={DELETE_ACCOUNT_CONFIRM_PHRASE}
                autoComplete="off"
              />
              <p className="mt-1 text-xs text-slate-500">
                Tippen Sie: <code className="rounded bg-slate-800 px-1 py-0.5">{DELETE_ACCOUNT_CONFIRM_PHRASE}</code>
              </p>
            </div>
          </div>
          {deleteError ? (
            <div className="mt-4 rounded-2xl border border-red-900/60 bg-red-950/50 p-3 text-sm text-red-300">
              {deleteError}
            </div>
          ) : null}
          <div className="mt-6">
            <button
              type="button"
              onClick={handleDeleteAccount}
              disabled={deleteLoading}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-800 bg-red-950/60 px-4 py-3.5 text-sm font-semibold text-red-100 transition hover:bg-red-900/70 disabled:opacity-50 sm:py-4 sm:text-base"
            >
              {deleteLoading ? (
                <>
                  <Loader2 className="h-5 w-5 shrink-0 animate-spin" /> Wird gelöscht…
                </>
              ) : (
                <>
                  <Trash2 className="h-5 w-5 shrink-0 text-red-300" /> Konto unwiderruflich löschen
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-8 text-center text-xs text-slate-500">
        E-Mail-Adresse und Passwort für den Login werden über Ihren Zugangsanbieter verwaltet.
      </div>
    </div>
  )
}
