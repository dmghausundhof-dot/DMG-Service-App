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
  Camera,
  Images,
  X,
  ImagePlus,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getOrCreateProfileId } from '@/lib/supabase/ensure-profile'
import {
  APPOINTMENT_TIME_SLOTS as TIME_SLOTS,
  timeToMinutes,
} from '@/lib/appointment-time-slots'

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
    time_from: '',
    time_to: '',
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

  const minDateYmd = (() => {
    const d = new Date()
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  })()

  const endTimeSlots = formData.time_from
    ? TIME_SLOTS.filter((s) => timeToMinutes(s) > timeToMinutes(formData.time_from))
    : []

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target
    if (name === 'time_from') {
      setFormData((prev) => {
        let to = prev.time_to
        if (value && to && timeToMinutes(to) <= timeToMinutes(value)) {
          to = ''
        }
        return { ...prev, time_from: value, time_to: to }
      })
      return
    }
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const createAppointment = async () => {
    if (!formData.object_id) {
      setError('Bitte wählen Sie ein Objekt aus.')
      return
    }

    const d = formData.preferred_date?.trim()
    const tf = formData.time_from?.trim()
    const tt = formData.time_to?.trim()
    const anyTime = Boolean(tf || tt)
    if (anyTime) {
      if (!tf || !tt) {
        setError('Zeitfenster: Bitte „Von“ und „Bis“ wählen oder beides leer lassen.')
        return
      }
      if (timeToMinutes(tt) <= timeToMinutes(tf)) {
        setError('„Bis“ muss nach „Von“ liegen.')
        return
      }
      if (!d) {
        setError('Bitte ein Wunschdatum angeben, wenn Sie ein Zeitfenster angeben.')
        return
      }
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
          preferred_date: d || null,
          time_window: tf && tt ? `${tf}-${tt}` : null,
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

  if (loadingObjects) {
    return (
      <div className="mx-auto flex max-w-3xl justify-center px-4 py-12">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
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
        <div className="card p-6 text-center sm:p-10 lg:p-12">
          <Calendar className="mx-auto mb-5 h-14 w-14 text-slate-600 sm:mb-6 sm:h-16 sm:w-16" />
          <h1 className="mb-3 text-2xl font-semibold tracking-tighter sm:mb-4 sm:text-3xl lg:text-4xl">Kein Objekt vorhanden</h1>
          <p className="mb-6 text-base text-slate-400 sm:mb-8 sm:text-lg">
            Sie benötigen mindestens ein Objekt, um einen Termin anzufordern.
          </p>
          <Link href="/dashboard/objects/new" className="btn-primary inline-flex items-center justify-center gap-2">
            Erstes Objekt anlegen
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl pb-6 sm:pb-8">
      <Link
        href="/dashboard/appointments"
        className="mb-5 flex items-center gap-2 text-slate-400 hover:text-white sm:mb-8"
      >
        <ArrowLeft className="h-4 w-4 shrink-0" /> Zurück zu Terminen
      </Link>

      <div className="mb-6 sm:mb-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-3xl bg-emerald-600/10 sm:h-16 sm:w-16">
            <Calendar className="h-8 w-8 text-emerald-500" />
          </div>
          <div className="min-w-0">
            <h1 className="text-3xl font-semibold tracking-tighter sm:text-4xl lg:text-5xl">Neuen Termin anfragen</h1>
            <p className="mt-2 text-base text-slate-400 sm:text-lg lg:text-xl">
              Wunschdatum, Zeitfenster und optional Fotos.
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

      <div className="card p-5 sm:p-6 lg:p-8">
        <div className="space-y-6 sm:space-y-8">
          <div>
            <label className="text-sm text-slate-300 block mb-2">Objekt *</label>
            <select
              name="object_id"
              value={formData.object_id}
              onChange={handleInputChange}
              className="input w-full text-base sm:text-lg"
              required
            >
              {objects.map((obj) => (
                <option key={obj.id} value={obj.id}>
                  {obj.name}
                  {obj.city ? ` • ${obj.city}` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:gap-6">
            <div>
              <label className="mb-2 block text-sm text-slate-300">Wunschdatum (optional)</label>
              <input
                type="date"
                name="preferred_date"
                value={formData.preferred_date}
                min={minDateYmd}
                onChange={handleInputChange}
                className="input w-full text-base sm:text-lg"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm text-slate-300">Zeitfenster (optional)</label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                <div>
                  <span className="mb-1 block text-xs text-slate-500">Von</span>
                  <select
                    name="time_from"
                    value={formData.time_from}
                    onChange={handleInputChange}
                    className="input w-full py-3 text-base"
                  >
                    <option value="">—</option>
                    {TIME_SLOTS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <span className="mb-1 block text-xs text-slate-500">Bis</span>
                  <select
                    name="time_to"
                    value={formData.time_to}
                    onChange={handleInputChange}
                    disabled={!formData.time_from}
                    className="input w-full py-3 text-base disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">—</option>
                    {endTimeSlots.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
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
            ) : null}
          </div>

          <div>
            <label className="text-sm text-slate-300 block mb-2">Art der Leistung *</label>
            <select
              name="service_type"
              value={formData.service_type}
              onChange={handleInputChange}
              className="input w-full text-base sm:text-lg"
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
            <label className="text-sm text-slate-300 block mb-2">Beschreibung / Problem (optional)</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              rows={4}
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
              className="input w-full resize-y"
            />
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-slate-800 pt-6 sm:mt-10 sm:flex-row sm:gap-4 sm:pt-8">
          <Link href="/dashboard/appointments" className="btn-secondary order-2 flex-1 py-3.5 text-center sm:order-1">
            Abbrechen
          </Link>
          <button
            type="button"
            onClick={createAppointment}
            disabled={isSaving || !formData.object_id}
            className="btn-primary order-1 flex flex-1 items-center justify-center gap-2 py-3.5 disabled:cursor-not-allowed disabled:opacity-50 sm:order-2"
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

      </div>
    </div>
  )
}

export default function NewAppointmentPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex max-w-3xl justify-center px-4 py-12">
          <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        </div>
      }
    >
      <NewAppointmentForm />
    </Suspense>
  )
}
