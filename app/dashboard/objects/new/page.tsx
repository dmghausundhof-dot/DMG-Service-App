'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Home, Loader2, CheckCircle, Save } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getOrCreateProfileId } from '@/lib/supabase/ensure-profile'

export default function NewObjectPage() {
  const router = useRouter()
  const supabase = createClient()

  const [formData, setFormData] = useState({
    name: '',
    street: '',
    postal_code: '',
    city: '',
    notes: ''
  })
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const createObject = async () => {
    if (!formData.name) {
      alert('Bitte geben Sie einen Namen für das Objekt an.')
      return
    }

    setIsSaving(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Nicht eingeloggt')

      const pid = await getOrCreateProfileId(supabase, user)
      if (!pid) throw new Error('Profil konnte nicht angelegt oder geladen werden.')

      const { error } = await supabase
        .from('objects')
        .insert({
          profile_id: pid,
          name: formData.name,
          street: formData.street || null,
          postal_code: formData.postal_code || null,
          city: formData.city || null,
          notes: formData.notes || null
        })

      if (error) throw error

      setSaveSuccess(true)

      setTimeout(() => {
        router.push('/dashboard/objects')
      }, 1200)
    } catch (err: any) {
      console.error(err)
      alert('Fehler beim Anlegen des Objekts: ' + (err.message || 'Unbekannt'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/dashboard/objects" className="mb-5 flex items-center gap-2 text-slate-400 hover:text-white sm:mb-8">
        <ArrowLeft className="h-4 w-4 shrink-0" /> Zurück zu Meine Objekte
      </Link>

      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-emerald-600/10 sm:h-16 sm:w-16">
            <Home className="h-8 w-8 text-emerald-500" />
          </div>
          <div className="min-w-0">
            <h1 className="text-3xl font-semibold tracking-tighter sm:text-4xl lg:text-5xl">Neues Objekt anlegen</h1>
            <p className="mt-2 text-base text-slate-400 sm:text-lg lg:text-xl">Fügen Sie Ihr Haus, Ihre Wohnung oder Ferienimmobilie hinzu.</p>
          </div>
        </div>
      </div>

      <div className="card p-5 sm:p-6 lg:p-8">
        <div className="space-y-5 sm:space-y-6">
          {/* Name */}
          <div>
            <label className="text-sm text-slate-300 block mb-2">Name des Objekts *</label>
            <input 
              type="text" 
              name="name" 
              value={formData.name} 
              onChange={handleInputChange}
              className="input w-full text-base sm:text-lg"
              placeholder="z.B. Eigenheim Wiesloch oder Ferienwohnung Sylt"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Street */}
            <div>
              <label className="text-sm text-slate-300 block mb-2">Straße &amp; Hausnummer</label>
              <input 
                type="text" 
                name="street" 
                value={formData.street} 
                onChange={handleInputChange}
                className="input w-full" 
                placeholder="Sandbrunnenweg 39"
              />
            </div>

            {/* Postal Code */}
            <div>
              <label className="text-sm text-slate-300 block mb-2">PLZ</label>
              <input 
                type="text" 
                name="postal_code" 
                value={formData.postal_code} 
                onChange={handleInputChange}
                className="input w-full" 
                placeholder="69168"
              />
            </div>
          </div>

          {/* City */}
          <div>
            <label className="text-sm text-slate-300 block mb-2">Stadt / Ort</label>
            <input 
              type="text" 
              name="city" 
              value={formData.city} 
              onChange={handleInputChange}
              className="input w-full" 
              placeholder="Wiesloch"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-sm text-slate-300 block mb-2">Notizen / Besonderheiten</label>
            <textarea 
              name="notes" 
              value={formData.notes} 
              onChange={handleInputChange}
              className="input w-full min-h-[120px]" 
              placeholder="z.B. Zweifamilienhaus mit Garten, PV-Anlage seit 2023, Zugang über Hinterhof..."
            />
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-slate-800 pt-6 sm:mt-8 sm:flex-row sm:gap-4">
          <button
            type="button"
            onClick={createObject}
            disabled={isSaving || !formData.name}
            className="btn-primary order-1 flex flex-1 items-center justify-center gap-2 py-3.5 disabled:opacity-50 sm:order-none sm:gap-3 sm:py-4 sm:text-lg"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Wird angelegt...
              </>
            ) : saveSuccess ? (
              <>
                <CheckCircle className="w-5 h-5" />
                Erfolgreich angelegt!
              </>
            ) : (
              <>
                <Save className="w-5 h-5" />
                Objekt anlegen
              </>
            )}
          </button>

          <Link href="/dashboard/objects" className="btn-secondary order-2 flex flex-1 justify-center py-3.5 text-center sm:order-none sm:flex-initial sm:px-8 sm:py-4 sm:text-lg">
            Abbrechen
          </Link>
        </div>
      </div>

      <p className="text-center text-xs text-slate-500 mt-6">
        Nach dem Anlegen können Sie Anlagen, Termine und Dokumente für dieses Objekt hinzufügen.
      </p>
    </div>
  )
}
