'use client'

import { Suspense, useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Loader2,
  CheckCircle,
  Camera,
  Images,
  Globe,
  Sparkles,
  PencilLine,
  Save,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getOrCreateProfileId } from '@/lib/supabase/ensure-profile'

const CATEGORIES = [
  'Balkonkraftwerk',
  'Wärmepumpe',
  'Entsalzungsanlage',
  'Wärmespeicher',
  'Filteranlage',
  'Wallbox',
  'Starlink',
  'Sonstiges',
] as const

type AnalysisFields = {
  category: string
  manufacturer?: string | null
  model?: string | null
  year_built?: number | null
  capacity?: string | null
  filter_type?: string | null
  confidence?: number
  web_sources?: string[]
  web_notes?: string | null
}

function applyMergedToForm(merged: AnalysisFields): {
  name: string
  category: string
  manufacturer: string
  model: string
  year_built: string
  capacity: string
  notes: string
} {
  const y = merged.year_built
  const yearStr =
    typeof y === 'number' && !Number.isNaN(y) ? String(y) : typeof y === 'string' ? y : ''

  const parts: string[] = []
  if (typeof merged.confidence === 'number') {
    parts.push(`Konfidenz: ${Math.round(merged.confidence * 100)}%`)
  }
  if (merged.web_notes) parts.push(merged.web_notes)
  if (merged.web_sources?.length) {
    parts.push(`Quellen: ${merged.web_sources.join(', ')}`)
  }

  const name = merged.model?.trim() || merged.manufacturer?.trim() || 'Neue Anlage'
  let category = merged.category?.trim() || 'Sonstiges'
  if (!CATEGORIES.includes(category as (typeof CATEGORIES)[number])) {
    category = 'Sonstiges'
  }

  return {
    name,
    category,
    manufacturer: merged.manufacturer?.trim() ?? '',
    model: merged.model?.trim() ?? '',
    year_built: yearStr,
    capacity: merged.capacity?.trim() ?? '',
    notes: parts.join('\n'),
  }
}

function NewAssetForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const [objects, setObjects] = useState<{ id: string; name: string; city: string | null }[]>([])
  const [selectedObjectId, setSelectedObjectId] = useState('')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [mimeType, setMimeType] = useState('image/jpeg')

  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [visionAnalysis, setVisionAnalysis] = useState<AnalysisFields | null>(null)
  const [webEnrichment, setWebEnrichment] = useState<AnalysisFields | null>(null)
  const [mergedAnalysis, setMergedAnalysis] = useState<AnalysisFields | null>(null)
  const [webSearchUsed, setWebSearchUsed] = useState(false)
  const [analysisMessage, setAnalysisMessage] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    category: 'Balkonkraftwerk',
    manufacturer: '',
    model: '',
    year_built: '',
    capacity: '',
    notes: '',
  })

  const [isSaving, setIsSaving] = useState(false)
  const [preferManualOnly, setPreferManualOnly] = useState(false)
  /** Kamera: Auto-Auswertung nach Aufnahme · Gallerie: nur Bild */
  const [lastCaptureSource, setLastCaptureSource] = useState<'camera' | 'gallery' | null>(null)

  const cameraInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)

  const analyzeWithData = useCallback(
    async (b64: string, mime: string) => {
      setIsAnalyzing(true)
      setAnalysisMessage(null)
      try {
        const res = await fetch('/api/analyze-asset', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: b64, mimeType: mime }),
        })
        const data = (await res.json()) as {
          success?: boolean
          merged?: AnalysisFields
          visionAnalysis?: AnalysisFields
          webEnrichment?: AnalysisFields | null
          webSearchUsed?: boolean
          message?: string
          error?: string
        }
        if (!data.success || !data.merged) {
          alert('Analyse fehlgeschlagen: ' + (data.error || 'Unbekannt'))
          return
        }
        setVisionAnalysis(data.visionAnalysis ?? null)
        setWebEnrichment(data.webEnrichment ?? null)
        setMergedAnalysis(data.merged)
        setWebSearchUsed(!!data.webSearchUsed)
        setAnalysisMessage(data.message ?? null)
        setFormData((prev) => ({
          ...prev,
          ...applyMergedToForm(data.merged!),
        }))
      } catch {
        alert('Netzwerkfehler bei der Analyse.')
      } finally {
        setIsAnalyzing(false)
      }
    },
    [],
  )

  const loadImageFromFile = useCallback(
    (file: File, source: 'camera' | 'gallery') => {
      if (!file.type.startsWith('image/')) {
        alert('Bitte ein Bild (Foto) wählen.')
        return
      }
      if (file.size > 15 * 1024 * 1024) {
        alert('Datei ist zu groß (max. 15 MB).')
        return
      }
      const mime = file.type || 'image/jpeg'
      setLastCaptureSource(source)
      setMimeType(mime)
      const reader = new FileReader()
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string
        const b64 = dataUrl.split(',')[1]
        setImagePreview(dataUrl)
        setImageBase64(b64)
        setVisionAnalysis(null)
        setWebEnrichment(null)
        setMergedAnalysis(null)
        setAnalysisMessage(null)
        setWebSearchUsed(false)
        setPreferManualOnly(false)
        if (source === 'camera') {
          queueMicrotask(() => {
            void analyzeWithData(b64, mime)
          })
        }
      }
      reader.readAsDataURL(file)
    },
    [analyzeWithData],
  )

  useEffect(() => {
    async function loadObjects() {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return
      const pid = await getOrCreateProfileId(supabase, user)
      if (!pid) return
      const { data } = await supabase
        .from('objects')
        .select('id, name, city')
        .eq('profile_id', pid)
      if (data && data.length > 0) {
        setObjects(data)
        const q = searchParams.get('object_id')
        const pick = q && data.some((o) => o.id === q) ? q : data[0].id
        setSelectedObjectId((prev) => (prev && data.some((o) => o.id === prev) ? prev : pick))
      }
    }
    loadObjects()
  }, [supabase, searchParams])

  const analyze = async () => {
    if (!imageBase64) return
    await analyzeWithData(imageBase64, mimeType)
  }

  const applySuggestionAgain = () => {
    if (mergedAnalysis) {
      setFormData((prev) => ({ ...prev, ...applyMergedToForm(mergedAnalysis) }))
    }
  }

  const save = async () => {
    if (!selectedObjectId || !imagePreview) {
      alert('Bitte Objekt wählen und ein Foto erfassen.')
      return
    }
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      alert('Nicht eingeloggt.')
      return
    }

    setIsSaving(true)
    try {
      const blob = await fetch(imagePreview).then((r) => r.blob())
      const ext = mimeType.includes('png')
        ? 'png'
        : mimeType.includes('webp')
          ? 'webp'
          : 'jpg'
      const storagePath = `${user.id}/${selectedObjectId}/${Date.now()}.${ext}`
      const { error: uploadError } = await supabase.storage.from('asset-images').upload(storagePath, blob, {
        cacheControl: '3600',
        upsert: false,
        contentType: mimeType || 'image/jpeg',
      })

      if (uploadError) {
        if (uploadError.message.includes('Bucket not found')) {
          alert('Speicher-Bucket „asset-images“ fehlt. Bitte Migration 010 ausführen / supabase db push.')
        } else {
          alert('Upload: ' + uploadError.message)
        }
        setIsSaving(false)
        return
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from('asset-images').getPublicUrl(storagePath)

      const y = parseInt(formData.year_built, 10)

      const { error: insertError } = await supabase.from('assets').insert({
        object_id: selectedObjectId,
        name: formData.name.trim() || 'Neue Anlage',
        category: formData.category,
        manufacturer: formData.manufacturer.trim() || null,
        model: formData.model.trim() || null,
        year_built: Number.isFinite(y) ? y : null,
        capacity: formData.capacity.trim() || null,
        filter_type:
          mergedAnalysis && typeof mergedAnalysis.filter_type === 'string'
            ? mergedAnalysis.filter_type
            : null,
        image_url: publicUrl,
        ai_analysis:
          mergedAnalysis != null ? { ...(mergedAnalysis as object) } : visionAnalysis ?? null,
        ai_suggested_fields:
          visionAnalysis || webEnrichment
            ? { vision: visionAnalysis, web: webEnrichment }
            : null,
        ai_confidence:
          typeof mergedAnalysis?.confidence === 'number'
            ? mergedAnalysis.confidence
            : typeof visionAnalysis?.confidence === 'number'
              ? visionAnalysis.confidence
              : null,
        user_confirmed: true,
        confirmed_at: new Date().toISOString(),
        notes: formData.notes.trim() || null,
      })

      if (insertError) {
        alert('Speichern fehlgeschlagen: ' + insertError.message)
        setIsSaving(false)
        return
      }

      router.push('/dashboard/assets')
    } catch (e) {
      console.error(e)
      alert('Unerwarteter Fehler beim Speichern.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl pb-8 sm:pb-12">
      <Link
        href="/dashboard/assets"
        className="mb-5 mt-1 flex items-center gap-2 text-sm text-slate-400 hover:text-white sm:mb-6 sm:mt-2"
      >
        <ArrowLeft className="h-4 w-4 shrink-0" /> Zurück
      </Link>

      <h1 className="mb-2 text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">Neue Anlage</h1>
      <p className="mb-6 text-base text-slate-400 sm:mb-8 sm:text-lg">
        Kamera mit Bild-Auswertung, Gallerie ohne.
      </p>

      {/* File inputs außerhalb von display:none-Kontext, damit Desktop & Mobil zuverlässig öffnen */}
      <div className="sr-only">
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          aria-hidden="true"
          tabIndex={-1}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) loadImageFromFile(f, 'camera')
            e.target.value = ''
          }}
        />
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          aria-hidden="true"
          tabIndex={-1}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) loadImageFromFile(f, 'gallery')
            e.target.value = ''
          }}
        />
      </div>

      {/* Zwei Zugänge: Kamera (mit Auto-KI) · Gallerie (Bild wie gewählt) */}
      <div className="mb-6 space-y-3 sm:mb-8">
        <p className="text-[10px] font-semibold tracking-widest text-slate-500 sm:text-xs">FOTO</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
          <button
            type="button"
            aria-label="Foto mit der Kamera aufnehmen"
            onClick={() => cameraInputRef.current?.click()}
            className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-800/60 bg-emerald-950/40 py-3.5 text-base font-medium text-emerald-100 transition hover:border-emerald-600 active:scale-[0.99] sm:gap-3 sm:rounded-3xl sm:py-4 sm:text-lg"
          >
            <Camera className="h-6 w-6 shrink-0 text-emerald-400 sm:h-7 sm:w-7" />
            Kamera
          </button>
          <button
            type="button"
            aria-label="Bild aus der Gallerie auswählen"
            onClick={() => galleryInputRef.current?.click()}
            className="flex items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/80 py-3.5 text-base font-medium text-slate-200 transition hover:border-slate-500 active:scale-[0.99] sm:gap-3 sm:rounded-3xl sm:py-4 sm:text-lg"
          >
            <Images className="h-6 w-6 shrink-0 text-slate-400 sm:h-7 sm:w-7" />
            Gallerie
          </button>
        </div>
      </div>

      <div className="card space-y-6 p-5 sm:space-y-8 sm:p-6 lg:p-8">

        {/* Vorschau (alle Bildschirmgrößen) */}
        {imagePreview ? (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-300">Ausgewähltes Foto</span>
              <button
                type="button"
                onClick={() => {
                  setImagePreview(null)
                  setImageBase64(null)
                  setLastCaptureSource(null)
                  setVisionAnalysis(null)
                  setWebEnrichment(null)
                  setMergedAnalysis(null)
                  setAnalysisMessage(null)
                  setWebSearchUsed(false)
                  setPreferManualOnly(false)
                }}
                className="text-xs text-red-400 hover:text-red-300"
              >
                Entfernen
              </button>
            </div>
            <img
              src={imagePreview}
              alt="Vorschau des ausgewählten Fotos"
              className="max-h-[min(42vh,380px)] w-full rounded-2xl bg-black object-contain sm:max-h-[min(52vh,420px)] sm:rounded-3xl"
            />
          </div>
        ) : null}

        {imagePreview && !mergedAnalysis && !preferManualOnly && (
          <div className="space-y-3">
            {lastCaptureSource === 'gallery' ? (
              <>
                <button
                  type="button"
                  onClick={analyze}
                  disabled={isAnalyzing}
                  className="btn-primary flex w-full items-center justify-center gap-2 py-3.5 sm:gap-3 sm:py-4 sm:text-lg"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-6 h-6 animate-spin" />
                      Auswertung…
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5" />
                      Aus Bild ausfüllen
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setPreferManualOnly(true)}
                  className="w-full text-sm text-slate-500 hover:text-slate-300 py-2"
                >
                  Nur manuell ausfüllen
                </button>
              </>
            ) : (
              <>
                {isAnalyzing ? (
                  <div className="rounded-2xl border border-emerald-900/50 bg-emerald-950/25 px-4 py-4 sm:px-5 sm:py-5">
                    <div className="flex items-start gap-3">
                      <Loader2 className="mt-0.5 h-6 w-6 shrink-0 animate-spin text-emerald-400" />
                      <div>
                        <p className="text-sm font-medium text-slate-200">KI wertet Ihr Foto aus…</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={analyze}
                    className="btn-secondary flex w-full items-center justify-center gap-2 py-3.5 sm:py-4"
                  >
                    <Sparkles className="w-5 h-5" />
                    Erneut auswerten
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setPreferManualOnly(true)}
                  className="w-full text-sm text-slate-500 hover:text-slate-300 py-2"
                >
                  Nur manuell ausfüllen
                </button>
              </>
            )}
          </div>
        )}

        {mergedAnalysis && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-emerald-900/70 bg-emerald-950/30 p-4 sm:rounded-3xl sm:p-6">
              <div className="text-emerald-400 font-semibold mb-4 flex flex-wrap items-center gap-2">
                <CheckCircle className="w-5 h-5 shrink-0" />
                Vorschlag (Bild + Web)
                {webSearchUsed ? (
                  <span className="inline-flex items-center gap-1 text-xs font-medium text-sky-300 bg-sky-950/60 px-2 py-1 rounded-full border border-sky-800/50">
                    <Globe className="w-3 h-3" /> Web ergänzt
                  </span>
                ) : null}
              </div>
              <div className="grid grid-cols-1 gap-x-4 gap-y-2 text-sm sm:grid-cols-2 sm:gap-y-3">
                <div>
                  <span className="text-slate-500">Kategorie:</span>{' '}
                  <span className="text-slate-100">{mergedAnalysis.category}</span>
                </div>
                <div>
                  <span className="text-slate-500">Konfidenz:</span>{' '}
                  <span className="text-slate-100">
                    {Math.round(((mergedAnalysis.confidence ?? 0) as number) * 100)}%
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Hersteller:</span>{' '}
                  <span className="text-slate-100">{mergedAnalysis.manufacturer || '—'}</span>
                </div>
                <div>
                  <span className="text-slate-500">Modell:</span>{' '}
                  <span className="text-slate-100">{mergedAnalysis.model || '—'}</span>
                </div>
                <div className="sm:col-span-2">
                  <span className="text-slate-500">Leistung:</span>{' '}
                  <span className="text-slate-100">{mergedAnalysis.capacity || '—'}</span>
                </div>
              </div>
              {analysisMessage ? <p className="text-xs text-slate-500 mt-4">{analysisMessage}</p> : null}
            </div>

            {(visionAnalysis || webEnrichment) && (
              <details className="rounded-2xl border border-slate-800 bg-slate-900/40 text-sm">
                <summary className="cursor-pointer px-4 py-3 font-medium text-slate-300">
                  Details: Bild vs. Web
                </summary>
                <div className="px-4 pb-4 pt-2 grid md:grid-cols-2 gap-4 border-t border-slate-800/80">
                  {visionAnalysis ? (
                    <div>
                      <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">Aus dem Bild</div>
                      <ul className="space-y-1 text-slate-400">
                        <li>H: {visionAnalysis.manufacturer || '—'}</li>
                        <li>M: {visionAnalysis.model || '—'}</li>
                        <li>kW/kWh: {visionAnalysis.capacity || '—'}</li>
                      </ul>
                    </div>
                  ) : null}
                  {webEnrichment ? (
                    <div>
                      <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">Aus dem Web</div>
                      <ul className="space-y-1 text-slate-400">
                        <li>H: {webEnrichment.manufacturer || '—'}</li>
                        <li>M: {webEnrichment.model || '—'}</li>
                        <li>kW/kWh: {webEnrichment.capacity || '—'}</li>
                        {webEnrichment.web_sources?.length ? (
                          <li className="text-xs text-slate-500 pt-2">
                            {webEnrichment.web_sources.join(' · ')}
                          </li>
                        ) : null}
                      </ul>
                    </div>
                  ) : (
                    <div className="text-slate-500 text-sm">Keine separate Web-Antwort (API/Modell).</div>
                  )}
                </div>
              </details>
            )}

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={applySuggestionAgain}
                className="btn-secondary flex-1 py-3 flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Vorschlag erneut ins Formular
              </button>
              <p className="text-xs text-slate-500 sm:w-48 sm:self-center">
                Du kannst alle Felder unten auch manuell anpassen, ohne die KI.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-6 pt-2 border-t border-slate-800">
          <div className="flex items-center gap-2 text-slate-300">
            <PencilLine className="w-5 h-5 text-slate-500" />
            <span className="font-medium">Daten prüfen & anpassen</span>
          </div>

          <div>
            <label className="text-sm text-slate-300 block mb-2">Objekt *</label>
            <select
              value={selectedObjectId}
              onChange={(e) => setSelectedObjectId(e.target.value)}
              className="input w-full text-base py-3"
            >
              <option value="">— Objekt wählen —</option>
              {objects.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} {o.city && `(${o.city})`}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="text-sm text-slate-300 block mb-2">Name der Anlage</label>
              <input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="input w-full py-3"
              />
            </div>
            <div>
              <label className="text-sm text-slate-300 block mb-2">Kategorie</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="input w-full py-3"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <label className="text-sm text-slate-300 block mb-2">Hersteller</label>
              <input
                value={formData.manufacturer}
                onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                className="input w-full py-3"
              />
            </div>
            <div>
              <label className="text-sm text-slate-300 block mb-2">Modell</label>
              <input
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                className="input w-full py-3"
              />
            </div>
            <div>
              <label className="text-sm text-slate-300 block mb-2">Baujahr</label>
              <input
                value={formData.year_built}
                onChange={(e) => setFormData({ ...formData, year_built: e.target.value })}
                className="input w-full py-3"
                inputMode="numeric"
              />
            </div>
          </div>

          <div>
            <label className="text-sm text-slate-300 block mb-2">Leistung / Kapazität</label>
            <input
              value={formData.capacity}
              onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
              className="input w-full py-3"
              placeholder="z. B. 5.2 kWp"
            />
          </div>

          <div>
            <label className="text-sm text-slate-300 block mb-2">Notizen</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="input w-full min-h-[100px] py-3"
            />
          </div>
        </div>

        <button
          type="button"
          onClick={save}
          disabled={
            isSaving || !selectedObjectId || !imagePreview || objects.length === 0
          }
          className="btn-primary flex w-full items-center justify-center gap-2 py-3.5 disabled:opacity-50 sm:gap-3 sm:py-4 sm:text-lg"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Speichern…
            </>
          ) : (
            <>
              <Save className="w-5 h-5" />
              Anlage speichern
            </>
          )}
        </button>
      </div>
    </div>
  )
}

export default function NewAssetPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-3xl px-4 py-16 text-center text-slate-400 sm:py-24">
          <Loader2 className="mx-auto mb-3 h-9 w-9 animate-spin sm:mb-4 sm:h-10 sm:w-10" />
          <p className="text-sm sm:text-base">Laden…</p>
        </div>
      }
    >
      <NewAssetForm />
    </Suspense>
  )
}
