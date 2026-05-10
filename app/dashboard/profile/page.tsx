'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getOrCreateProfileId } from '@/lib/supabase/ensure-profile'
import { User, Save, ArrowLeft, Lock, Bell, Mail, MessageCircle, FileUp } from 'lucide-react'
import Link from 'next/link'

export default function ProfilePage() {
  const supabase = createClient()
  
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [notes, setNotes] = useState('')
  const [reminderEmail, setReminderEmail] = useState(true)
  const [reminderWhatsapp, setReminderWhatsapp] = useState(false)
  const [reminderDays, setReminderDays] = useState(7)
  const [whatsappPhone, setWhatsappPhone] = useState('')
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

  useEffect(() => {
    async function loadProfile() {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        await getOrCreateProfileId(supabase, user)

        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, phone, email, notes, reminder_email, reminder_whatsapp, reminder_days_before, whatsapp_phone, role')
          .eq('user_id', user.id)
          .maybeSingle()
        
        setIsAdmin(profile?.role === 'admin')

        if (profile) {
          setFullName(profile.full_name || '')
          setPhone(profile.phone || '')
          setEmail(profile.email || user.email || '')
          setNotes(profile.notes || '')
          setReminderEmail(profile.reminder_email ?? true)
          setReminderWhatsapp(profile.reminder_whatsapp ?? false)
          setReminderDays(profile.reminder_days_before ?? 7)
          setWhatsappPhone(profile.whatsapp_phone || '')
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
        phone: phone || null,
        email: email || null,
        notes: notes || null,
        reminder_email: reminderEmail,
        reminder_whatsapp: reminderWhatsapp,
        reminder_days_before: reminderDays,
        whatsapp_phone: whatsappPhone || null,
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
      <div className="max-w-2xl mx-auto p-8 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-slate-400">Profil wird geladen...</p>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white mb-4">
          <ArrowLeft className="w-4 h-4" /> Zurück zur Übersicht
        </Link>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-emerald-600/10 rounded-2xl flex items-center justify-center">
            <User className="w-7 h-7 text-emerald-500" />
          </div>
          <div>
            <div className="text-emerald-500 text-sm font-semibold tracking-[2px]">PERSÖNLICHE DATEN</div>
            <h1 className="text-5xl font-semibold tracking-tighter">Mein Profil</h1>
            <p className="text-xl text-slate-400 mt-2">Kontaktdaten und Präferenzen verwalten</p>
          </div>
        </div>
      </div>

      {isAdmin && (
        <div className="mb-8 card p-6 border border-emerald-800/50 bg-emerald-950/20">
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

      <div className="card p-8">
        <form onSubmit={handleSave} className="space-y-6">
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
              <label className="block text-sm font-medium text-slate-300 mb-2">Telefon</label>
              <input 
                type="tel" 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)}
                className="input w-full py-3 text-base"
                placeholder="+49 176 12345678"
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

          <div className="pt-4 flex gap-4">
            <button 
              type="submit" 
              disabled={saving}
              className="btn-primary flex-1 flex items-center justify-center gap-2 py-4 text-base disabled:opacity-50"
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
            <Link 
              href="/dashboard" 
              className="btn-secondary flex-1 flex items-center justify-center py-4 text-base"
            >
              Abbrechen
            </Link>
          </div>
        </form>
      </div>

      {/* Passwort ändern Section */}
      <div className="mt-10">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 bg-emerald-600/10 rounded-2xl flex items-center justify-center">
            <Lock className="w-7 h-7 text-emerald-500" />
          </div>
          <div>
            <div className="text-emerald-500 text-sm font-semibold tracking-[2px]">SICHERHEIT</div>
            <h2 className="text-4xl font-semibold tracking-tighter">Passwort ändern</h2>
            <p className="text-xl text-slate-400 mt-1">Schützen Sie Ihr Konto mit einem starken Passwort</p>
          </div>
        </div>

        <div className="card p-8 max-w-2xl">
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

      {/* Wartungserinnerungen Section */}
      <div className="mt-10">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-14 h-14 bg-emerald-600/10 rounded-2xl flex items-center justify-center">
            <Bell className="w-7 h-7 text-emerald-500" />
          </div>
          <div>
            <div className="text-emerald-500 text-sm font-semibold tracking-[2px]">ERINNERUNGEN</div>
            <h2 className="text-4xl font-semibold tracking-tighter">Wartungserinnerungen</h2>
            <p className="text-xl text-slate-400 mt-1">Lassen Sie sich automatisch an bevorstehende Wartungen erinnern</p>
          </div>
        </div>

        <div className="card p-8 max-w-2xl">
          <div className="space-y-6">
            <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-2xl">
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-emerald-500" />
                <div>
                  <div className="font-medium">E-Mail-Erinnerungen</div>
                  <div className="text-sm text-slate-400">Erhalten Sie Terminerinnerungen per E-Mail</div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={reminderEmail} 
                  onChange={(e) => setReminderEmail(e.target.checked)}
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-2xl">
              <div className="flex items-center gap-3">
                <MessageCircle className="w-5 h-5 text-emerald-500" />
                <div>
                  <div className="font-medium">WhatsApp-Erinnerungen</div>
                  <div className="text-sm text-slate-400">Erhalten Sie Terminerinnerungen per WhatsApp (benötigt verifizierte Nummer)</div>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={reminderWhatsapp} 
                  onChange={(e) => setReminderWhatsapp(e.target.checked)}
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Erinnerung vorab (Tage)</label>
              <select 
                value={reminderDays} 
                onChange={(e) => setReminderDays(parseInt(e.target.value))}
                className="input w-full py-3 text-base"
              >
                <option value={1}>1 Tag vorher</option>
                <option value={3}>3 Tage vorher</option>
                <option value={7}>7 Tage vorher (empfohlen)</option>
                <option value={14}>14 Tage vorher</option>
                <option value={30}>30 Tage vorher</option>
              </select>
              <p className="text-xs text-slate-500 mt-1">Wann sollen wir Sie vor der nächsten Wartung erinnern?</p>
            </div>

            {reminderWhatsapp && (
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">WhatsApp-Nummer (falls abweichend von Telefon)</label>
                <input 
                  type="tel" 
                  value={whatsappPhone} 
                  onChange={(e) => setWhatsappPhone(e.target.value)}
                  className="input w-full py-3 text-base"
                  placeholder="+49 176 12345678"
                />
                <p className="text-xs text-slate-500 mt-1">Nur notwendig, wenn Ihre WhatsApp-Nummer von der Telefonnummer abweicht</p>
              </div>
            )}

            <div className="pt-4">
              <button 
                type="button" 
                onClick={handleSave}
                disabled={saving}
                className="btn-primary w-full flex items-center justify-center gap-2 py-4 text-base disabled:opacity-50"
              >
                {saving ? (
                  <>Wird gespeichert...</>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Erinnerungseinstellungen speichern
                  </>
                )}
              </button>
            </div>

            <div className="text-xs text-slate-500 bg-slate-800/50 p-4 rounded-2xl">
              <strong>Hinweis zur Implementierung:</strong> Die automatischen Erinnerungen werden über Supabase Edge Functions und einen externen Service wie Resend (für E-Mail) oder Twilio/WhatsApp Business API gesendet. 
              Ein geplanter Job (z.B. via pg_cron oder Supabase Cron) prüft täglich Assets mit fälliger Wartung und sendet Benachrichtigungen basierend auf Ihren Einstellungen. 
              Kontaktieren Sie uns für die vollständige Backend-Integration.
            </div>
          </div>
        </div>
      </div>

      <div className="mt-8 text-center text-xs text-slate-500">
        Hinweis: Ihr Login-E-Mail kann nur über Supabase Auth geändert werden. Für Passwort-Reset nutzen Sie die Login-Seite. Passwort-Änderung erfordert Verifizierung des aktuellen Passworts.
      </div>
    </div>
  )
}
