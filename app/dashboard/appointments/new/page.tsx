'use client'

import { Suspense, useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Calendar,
  Loader2,
  CheckCircle,
  Save,
  MapPin,
  Camera,
  Images,
  X,
  ImagePlus,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getOrCreateProfileId } from '@/lib/supabase/ensure-profile'

interface ObjectOption {
  id: string
  name: string
  city: string | null
}

const MAX_IMAGES = 8
const MAX_BYTES = 10 * 1024 * 1024

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 180) || 'bild.jpg'
}

function NewAppointmentForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
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
    customer_notes: '',
  })
  const [isSaving, setIsSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [error, setError] = useState('')

  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  type PendingPhoto = { file: File; preview: string }
  const [photos, setPhotos] = useState<PendingPhoto[]>([])

  const addPhotos = useCallback((files: FileList | File[]) => {
    const arr = [...files].filter((f) => f.type.startsWith('image/'))
    if (arr.length === 0) {
      alert('Bitte Bilddateien wählen (JPG, PNG, …).')
      return
    }
    let hitLimit = false
    setPhotos((prev) => {
      let next = [...prev]
      for (const file of arr) {
        if (next.length >= MAX_IMAGES) {
          hitLimit = true
          break
        }
        if (file.size > MAX_BYTES) {
          alert(`${file.name} ist zu groß (max. 10 MB).`)
          continue
        }
        next = [...next, { file, preview: URL.createObjectURL(file) }]
      }
      return next
    })
    if (hitLimit) alert(`Maximal ${MAX_IMAGES} Fotos möglich.`)
  }, [])

  const removePhoto = (index: number) => {
    setPhotos((prev) => {
      const copy = [...prev]
      const [removed] = copy.splice(index, 1)
      if (removed) URL.revokeObjectURL(removed.preview)
      return copy
    })
  }

  useEffect(() => {
    async function loadObjects() {
      setLoadingObjects(true)
      const {
        data: { user },
      } = await supabase.auth.getUser()
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
          const q = searchParams.get('object_id')
          const pick =
            q && objectsData.some((o) => o.id === q) ? q : objectsData[0].id
          setFormData((prev) => ({
            ...prev,
            object_id: prev.object_id && objectsData.some((o) => o.id === prev.object_id)
              ? prev.object_id
              : pick,
          }))
        }
      }
      setLoadingObjects(false)
    }
    loadObjects()
  }, [router, supabase, searchParams])

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
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
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) throw new Error('Nicht eingeloggt')

      const pid = await getOrCreateProfileId(supabase, user)

      if (!pid) throw new Error('Profil konnte nicht geladen werden.')

      const { data: created, error: insertError } = await supabase
        .from('appointments')
        .insert({
          object_id: formData.object_id,
          service_type: formData.service_type,
          preferred_date: formData.preferred_date,
          time_window: formData.time_window || null,
          urgency: formData.urgency,
          description: formData.description || null,
          customer_notes: formData.customer_notes || null,
          status: 'requested',
          attachment_urls: [],
        })
        .select('id')
        .single()

      if (insertError) throw insertError
      if (!created?.id) throw new Error('Termin-ID fehlt')

      const appointmentId = created.id
      const metas: { url: string; file_name: string; file_size: number }[] = []

      for (const { file } of photos) {
        const path = `appointments/${user.id}/${appointmentId}/${Date.now()}-${sanitizeFileName(file.name)}`
        const { error: uploadError } = await supabase.storage
          .from('asset-images')
          .upload(path, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type || 'image/jpeg',
          })
        if (uploadError) {
          console.error('Termin-Foto-Upload:', uploadError)
          continue
        }
        const {
          data: { publicUrl },
        } = supabase.storage.from('asset-images').getPublicUrl(path)
        metas.push({
          url: publicUrl,
          file_name: file.name,
          file_size: file.size,
        })
      }

      if (photos.length > 0 && metas.length === 0) {
        setError(
          'Termin wurde angelegt, aber keine Fotos konnten hochgeladen werden (Bucket „asset-images“ / Migration 010 prüfen).',
        )
        setSaveSuccess(true)
        setTimeout(() => router.push('/dashboard/appointments'), 2800)
        return
      }

      if (metas.length > 0) {
        const { error: updateError } = await supabase
          .from('appointments')
          .update({ attachment_urls: metas })
          .eq('id', appointmentId)
        if (updateError) {
          console.error('attachment_urls update:', updateError)
          setError(
            'Termin wurde angelegt, einige Fotos konnten nicht verknüpft werden: ' +
              updateError.message,
          )
          setSaveSuccess(true)
          setTimeout(() => router.push('/dashboard/appointments'), 2400)
          return
        }
      }

      setSaveSuccess(true)
      setTimeout(() => router.push('/dashboard/appointments'), 1500)
    } catch (err: unknown) {
      console.error(err)
      setError(
        'Fehler beim Erstellen des Termins: ' +
          (err instanceof Error ? err.message : 'Unbekannt'),
      )
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
    'Sonstiges',
  ]

  const urgencyOptions = [
    { value: 'normal', label: 'Normal' },
    { value: 'high', label: 'Hoch' },
    { value: 'emergency', label: 'Notfall' },
  ]

  const timeWindowOptions = [
    'Vormittag (08:00-12:00)',
    'Nachmittag (13:00-17:00)',
    '14:00-16:00',
    '09:00-11:00',
    '16:00-18:00',
    'Anderes (bitte im Feld angeben)',
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
        <Link
          href="/dashboard/appointments"
          className="flex items-center gap-2 text-slate-400 hover:text-white mb-8"
        >
          <ArrowLeft className="w-4 h-4" /> Zurück zu Terminen
        </Link>
        <div className="card p-12 text-center">
          <Calendar className="w-16 h-16 text-slate-600 mx-auto mb-6" />
          <h1 className="text-4xl font-semibold tracking-tighter mb-4">Kein Objekt vorhanden</h1>
          <p className="text-xl text-slate-400 mb-8">
            Sie benötigen mindestens ein Objekt, um einen Termin anzufordern.
          </p>
          <Link href="/dashboard/objects/new" className="btn-primary inline-flex items-center gap-2">
            Erstes Objekt anlegen
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 pb-8">
      <Link
        href="/dashboard/appointments"
        className="flex items-center gap-2 text-slate-400 hover:text-white mb-8"
      >
        <ArrowLeft className="w-4 h-4" /> Zurück zu Terminen
      </Link>

      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-emerald-600/10 rounded-3xl flex items-center justify-center">
            <Calendar className="w-8 h-8 text-emerald-500" />
          </div>
          <div>
            <h1 className="text-4xl sm:text-5xl font-semibold tracking-tighter">Neuen Termin anfragen</h1>
            <p className="text-lg sm:text-xl text-slate-400 mt-2">
              Optional Fotos anhängen (z. B. Anlage, Fehlerbild, Aufstellort).
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-950/50 border border-red-900/50 rounded-2xl text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="sr-only">
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          tabIndex={-1}
          aria-hidden
          onChange={(e) => {
            const list = e.target.files
            if (list?.length) addPhotos(list)
            e.target.value = ''
          }}
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          multiple
          tabIndex={-1}
          aria-hidden
          onChange={(e) => {
            const list = e.target.files
            if (list?.length) addPhotos(list)
            e.target.value = ''
          }}
        />
      </div>

      <div className="card p-6 sm:p-8">
        <div className="space-y-8">
          <div>
            <label className="text-sm text-slate-300 block mb-2">Objekt *</label>
            <select
              name="object_id"
              value={formData.object_id}
              onChange={handleInputChange}
              className="input w-full text-lg"
              required
            >
              {objects.map((obj) => (
                <option key={obj.id} value={obj.id}>
                  {obj.name}
                  {obj.city ? ` • ${obj.city}` : ''}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1.5 flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Wählen Sie das Objekt für den Service-Termin
            </p>
          </div>

          <div>
            <label className="text-sm text-slate-300 block mb-3 flex items-center gap-2">
              <ImagePlus className="w-4 h-4 text-emerald-500" />
              Fotos anhängen (optional, max. {MAX_IMAGES}, je max. 10 MB)
            </label>

            <div className="md:hidden flex flex-col gap-3 mb-4">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                disabled={photos.length >= MAX_IMAGES}
                className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-800/50 bg-emerald-950/30 py-4 font-medium text-emerald-100 disabled:opacity-40"
              >
                <Camera className="w-5 h-5" />
                Foto aufnehmen
              </button>
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                disabled={photos.length >= MAX_IMAGES}
                className="flex items-center justify-center gap-2 rounded-2xl border border-slate-700 py-4 font-medium text-slate-200 disabled:opacity-40"
              >
                <Images className="w-5 h-5" />
                Aus Galerie wählen
              </button>
            </div>

            <div className="hidden md:flex flex-wrap gap-3 mb-4">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                disabled={photos.length >= MAX_IMAGES}
                className="btn-secondary px-5 py-2.5 flex items-center gap-2 disabled:opacity-40"
              >
                <Camera className="w-4 h-4" />
                Kamera / Webcam
              </button>
              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                disabled={photos.length >= MAX_IMAGES}
                className="btn-secondary px-5 py-2.5 flex items-center gap-2 disabled:opacity-40"
              >
                <Images className="w-4 h-4" />
                Bilder wählen
              </button>
            </div>

            {photos.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {photos.map((p, i) => (
                  <div key={`${p.preview}-${i}`} className="relative group rounded-2xl overflow-hidden border border-slate-700 bg-black">
                    <img src={p.preview} alt="" className="w-full h-28 object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(i)}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-black/70 text-white opacity-90 hover:bg-red-600/90"
                      aria-label="Foto entfernen"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <div className="text-[10px] text-slate-500 truncate px-2 py-1 bg-slate-900/90">
                      {p.file.name}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                Ohne Fotos fortfahren ist möglich – Bilder helfen dem Service bei der Vorbereitung.
              </p>
            )}
          </div>

          <div>
            <label className="text-sm text-slate-300 block mb-2">Art der Leistung *</label>
            <select
              name="service_type"
              value={formData.service_type}
              onChange={handleInputChange}
              className="input w-full text-lg"
              required
            >
              {serviceTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

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

          <div>
            <label className="text-sm text-slate-300 block mb-2">Gewünschtes Zeitfenster</label>
            <select
              name="time_window"
              value={formData.time_window}
              onChange={handleInputChange}
              className="input w-full text-lg mb-3"
            >
              <option value="">-- Bitte wählen (optional) --</option>
              {timeWindowOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
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
            <p className="text-xs text-slate-500 mt-1.5">
              DMG Service passt sich gerne an – 2-Stunden-Fenster empfohlen
            </p>
          </div>

          <div>
            <label className="text-sm text-slate-300 block mb-2">Dringlichkeit</label>
            <div className="flex flex-wrap gap-3">
              {urgencyOptions.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="urgency"
                    value={opt.value}
                    checked={formData.urgency === opt.value}
                    onChange={handleInputChange}
                    className="accent-emerald-500"
                  />
                  <span
                    className={`px-4 py-2 rounded-2xl text-sm font-medium border ${
                      formData.urgency === opt.value
                        ? 'bg-emerald-600/20 text-emerald-400 border-emerald-900/50'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {opt.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

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
          <Link href="/dashboard/appointments" className="btn-secondary flex-1 py-3.5 text-center">
            Abbrechen
          </Link>
          <button
            type="button"
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

export default function NewAppointmentPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-3xl mx-auto p-8 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
        </div>
      }
    >
      <NewAppointmentForm />
    </Suspense>
  )
}
