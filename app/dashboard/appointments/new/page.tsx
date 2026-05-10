'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, Loader2, CheckCircle, Save, MapPin } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getOrCreateProfileId } from '@/lib/supabase/ensure-profile'

interface ObjectOption {
  id: string
  name: string
  city: string | null
}

export default function NewAppointmentPage() {
  const router = useRouter()
  const supabase = createClient()

  const [objects, setObjects] = useState<ObjectOption[]>([])
  const [loadingObjects, setLoadingObjects] = useState(true)

  const [formData, setFormData] = useState({
    object_id: '',
    service_type: 'Wartung',
    preferred_date: '',
    time_window: '',
    urgency: 'normal',
    description: '',
    customer_notes: ''
  })
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [error, setError] = useState('')

  // Load user's objects
  useEffect(() => {
    async function loadObjects() {
      setLoadingObjects(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const pid = await getOrCreateProfileId(supabase, user)

      if (pid) {
        const { data: objectsData } = await supabase
          .from('objects')
          .select('id, name, city')
          .eq('profile_id', pid)
          .order('created_at', { ascending: false })

        if (objectsData && objectsData.length > 0) {
          setObjects(objectsData)
          setFormData(prev => ({ ...prev, object_id: objectsData[0].id }))
        }
      }
      setLoadingObjects(false)
    }
    loadObjects()
  }, [router, supabase])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const createAppointment = async () => {
    if (!formData.object_id) {
      setError('Bitte wählen Sie ein Objekt aus.')
      return
    }
    if (!formData.preferred_date) {
      setError('Bitte geben Sie ein Wunschdatum an.')
      return
    }

    setIsSaving(true)
    setError('')

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Nicht eingeloggt')

      const pid = await getOrCreateProfileId(supabase, user)

      if (!pid) throw new Error('Profil konnte nicht geladen werden.')

      const { error: insertError } = await supabase
        .from('appointments')
        .insert({
          object_id: formData.object_id,
          service_type: formData.service_type,
          preferred_date: formData.preferred_date,
          time_window: formData.time_window || null,
          urgency: formData.urgency,
          description: formData.description || null,
          customer_notes: formData.customer_notes || null,
          status: 'requested'
        })

      if (insertError) throw insertError

      setSaveSuccess(true)

      setTimeout(() => {
        router.push('/dashboard/appointments')
      }, 1500)
    } catch (err: any) {
      console.error(err)
      setError('Fehler beim Erstellen des Termins: ' + (err.message || 'Unbekannt'))
    } finally {
      setIsSaving(false)
    }
  }

  const serviceTypes = [
    'Wartung',
    'Filterwechsel',
    'Reparatur',
    'Montage',
    'Smart-Home-Einrichtung',
    'Sonstiges'
  ]

  const urgencyOptions = [
    { value: 'normal', label: 'Normal' },
    { value: 'high', label: 'Hoch' },
    { value: 'emergency', label: 'Notfall' }
  ]

  const timeWindowOptions = [
    'Vormittag (08:00-12:00)',
    'Nachmittag (13:00-17:00)',
    '14:00-16:00',
    '09:00-11:00',
    '16:00-18:00',
    'Anderes (bitte im Feld angeben)'
  ]

  if (loadingObjects) {
    return (
      <div className="max-w-3xl mx-auto p-8 flex justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
      </div>
    )
  }

  if (objects.length === 0) {
    return (
      <div className="max-w-3xl mx-auto">
        <Link href="/dashboard/appointments" className="flex items-center gap-2 text-slate-400 hover:text-white mb-8">
          <ArrowLeft className="w-4 h-4" /> Zurück zu Terminen
        </Link>
        <div className="card p-12 text-center">
          <Calendar className="w-16 h-16 text-slate-600 mx-auto mb-6" />
          <h1 className="text-4xl font-semibold tracking-tighter mb-4">Kein Objekt vorhanden</h1>
          <p className="text-xl text-slate-400 mb-8">Sie benötigen mindestens ein Objekt, um einen Termin anzufordern.</p>
          <Link href="/dashboard/objects/new" className="btn-primary inline-flex items-center gap-2">
            Erstes Objekt anlegen
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/dashboard/appointments" className="flex items-center gap-2 text-slate-400 hover:text-white mb-8">
        <ArrowLeft className="w-4 h-4" /> Zurück zu Terminen
      </Link>

      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-emerald-600/10 rounded-3xl flex items-center justify-center">
            <Calendar className="w-8 h-8 text-emerald-500" />
          </div>
          <div>
            <h1 className="text-5xl font-semibold tracking-tighter">Neuen Termin anfragen</h1>
            <p className="text-xl text-slate-400 mt-2">Wählen Sie Ihr Objekt und die gewünschte Leistung aus.</p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-950/50 border border-red-900/50 rounded-2xl text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="card p-8">
        <div className="space-y-8">
          {/* Objekt */}
          <div>
            <label className="text-sm text-slate-300 block mb-2">Objekt *</label>
            <select
              name="object_id"
              value={formData.object_id}
              onChange={handleInputChange}
              className="input w-full text-lg"
              required
            >
              {objects.map(obj => (
                <option key={obj.id} value={obj.id}>
                  {obj.name}{obj.city ? ` • ${obj.city}` : ''}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Wählen Sie das Objekt für den Service-Termin
            </p>
          </div>

          {/* Service-Typ */}
          <div>
            <label className="text-sm text-slate-300 block mb-2">Art der Leistung *</label>
            <select
              name="service_type"
              value={formData.service_type}
              onChange={handleInputChange}
              className="input w-full text-lg"
              required
            >
              {serviceTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          {/* Datum */}
          <div>
            <label className="text-sm text-slate-300 block mb-2">Wunschdatum *</label>
            <input
              type="date"
              name="preferred_date"
              value={formData.preferred_date}
              onChange={handleInputChange}
              min={new Date().toISOString().split('T')[0]}
              className="input w-full text-lg"
              required
            />
            <p className="text-xs text-slate-500 mt-1.5">Frühestmöglich: heute</p>
          </div>

          {/* Zeitfenster */}
          <div>
            <label className="text-sm text-slate-300 block mb-2">Gewünschtes Zeitfenster</label>
            <select
              name="time_window"
              value={formData.time_window}
              onChange={handleInputChange}
              className="input w-full text-lg mb-3"
            >
              <option value="">-- Bitte wählen (optional) --</option>
              {timeWindowOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            <input
              type="text"
              name="time_window"
              value={formData.time_window}
              onChange={handleInputChange}
              placeholder="Oder freies Zeitfenster eingeben (z.B. 14:00-16:00)"
              className="input w-full text-lg"
            />
            <p className="text-xs text-slate-500 mt-1.5">DMG Service passt sich gerne an – 2-Stunden-Fenster empfohlen</p>
          </div>

          {/* Dringlichkeit */}
          <div>
            <label className="text-sm text-slate-300 block mb-2">Dringlichkeit</label>
            <div className="flex gap-3">
              {urgencyOptions.map(opt => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="urgency"
                    value={opt.value}
                    checked={formData.urgency === opt.value}
                    onChange={handleInputChange}
                    className="accent-emerald-500"
                  />
                  <span className={`px-4 py-2 rounded-2xl text-sm font-medium border ${
                    formData.urgency === opt.value 
                      ? 'bg-emerald-600/20 text-emerald-400 border-emerald-900/50' 
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}>
                    {opt.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Beschreibung */}
          <div>
            <label className="text-sm text-slate-300 block mb-2">Beschreibung / Problem (optional)</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={4}
              placeholder="z.B. Heizung macht Geräusche, Filter muss gewechselt werden..."
              className="input w-full resize-y min-h-[100px]"
            />
          </div>

          {/* Interne Notizen / Kundenwünsche */}
          <div>
            <label className="text-sm text-slate-300 block mb-2">Ihre Notizen / Wünsche (optional)</label>
            <textarea
              name="customer_notes"
              value={formData.customer_notes}
              onChange={handleInputChange}
              rows={3}
              placeholder="z.B. Bitte nach 17 Uhr, Haustür ist offen..."
              className="input w-full resize-y"
            />
          </div>
        </div>

        <div className="mt-10 pt-8 border-t border-slate-800 flex gap-4">
          <Link 
            href="/dashboard/appointments" 
            className="btn-secondary flex-1 py-3.5 text-center"
          >
            Abbrechen
          </Link>
          <button 
            onClick={createAppointment}
            disabled={isSaving || !formData.object_id || !formData.preferred_date}
            className="btn-primary flex-1 py-3.5 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Wird gesendet...
              </>
            ) : saveSuccess ? (
              <>
                <CheckCircle className="w-5 h-5" /> Termin angefragt!
              </>
            ) : (
              <>
                <Save className="w-5 h-5" /> Termin jetzt anfragen
              </>
            )}
          </button>
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          DMG Service bestätigt Ihren Termin in der Regel innerhalb von 24 Stunden per E-Mail oder WhatsApp.
        </p>
      </div>
    </div>
  )
}
