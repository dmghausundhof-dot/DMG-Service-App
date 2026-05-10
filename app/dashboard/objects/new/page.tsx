'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Home, Loader2, CheckCircle, Save } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

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

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!profile) throw new Error('Profil nicht gefunden')

      const { error } = await supabase
        .from('objects')
        .insert({
          profile_id: profile.id,
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
    <div className="max-w-3xl mx-auto">
      <Link href="/dashboard/objects" className="flex items-center gap-2 text-slate-400 hover:text-white mb-8">
        <ArrowLeft className="w-4 h-4" /> Zurück zu Meine Objekte
      </Link>

      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-emerald-600/10 rounded-3xl flex items-center justify-center">
            <Home className="w-8 h-8 text-emerald-500" />
          </div>
          <div>
            <h1 className="text-5xl font-semibold tracking-tighter">Neues Objekt anlegen</h1>
            <p className="text-xl text-slate-400 mt-2">Fügen Sie Ihr Haus, Ihre Wohnung oder Ferienimmobilie hinzu.</p>
          </div>
        </div>
      </div>

      <div className="card p-8">
        <div className="space-y-6">
          {/* Name */}
          <div>
            <label className="text-sm text-slate-300 block mb-2">Name des Objekts *</label>
            <input 
              type="text" 
              name="name" 
              value={formData.name} 
              onChange={handleInputChange}
              className="input w-full text-lg" 
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

        <div className="mt-8 pt-6 border-t border-slate-800 flex gap-4">
          <button 
            onClick={createObject}
            disabled={isSaving || !formData.name}
            className="btn-primary flex-1 py-4 text-lg flex items-center justify-center gap-3 disabled:opacity-50"
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

          <Link 
            href="/dashboard/objects" 
            className="btn-secondary px-8 py-4 text-lg"
          >
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
