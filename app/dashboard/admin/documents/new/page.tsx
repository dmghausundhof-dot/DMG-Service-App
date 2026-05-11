'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Upload, Loader2, CheckCircle, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getOrCreateProfileId } from '@/lib/supabase/ensure-profile'

type ObjectRow = {
  id: string
  profile_id: string
  name: string
  city: string | null
  profiles?: { full_name: string | null } | { full_name: string | null }[] | null
}

type AppointmentRow = {
  id: string
  object_id: string
  asset_id: string | null
  service_type: string
  preferred_date: string | null
  status: string
}

function customerName(row: ObjectRow): string {
  const p = row.profiles
  if (!p) return ''
  const entry = Array.isArray(p) ? p[0] : p
  return entry?.full_name?.trim() || ''
}

function AdminBusinessDocumentForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preObjectId = searchParams.get('object_id')
  const preAppointmentId = searchParams.get('appointment_id')
  const preAssetId = searchParams.get('asset_id')
  const preProfileId = searchParams.get('profile_id')
  const supabase = createClient()

  const [allowed, setAllowed] = useState(false)
  const [objects, setObjects] = useState<ObjectRow[]>([])
  const [selectedObjectId, setSelectedObjectId] = useState('')
  const [selectedAppointmentId, setSelectedAppointmentId] = useState('')
  const [selectedAssetId, setSelectedAssetId] = useState('')
  const [documentType, setDocumentType] = useState<'offer' | 'invoice' | 'report' | 'other'>('invoice')
  const [title, setTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [fileName, setFileName] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)
  const [appointments, setAppointments] = useState<AppointmentRow[]>([])

  useEffect(() => {
    async function gateAndLoad() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.replace('/login')
        return
      }
      await getOrCreateProfileId(supabase, user)
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle()

      if (profile?.role !== 'admin') {
        router.replace('/dashboard/documents')
        return
      }

      setAllowed(true)

      const { data, error } = await supabase
        .from('objects')
        .select('id, profile_id, name, city, profiles (full_name)')
        .order('created_at', { ascending: false })

      if (!error && data) {
        const rows = data as ObjectRow[]
        setObjects(
          preProfileId
            ? rows.filter((row) => row.profile_id === preProfileId)
            : rows,
        )
      }
    }
    gateAndLoad()
  }, [router, supabase, preProfileId])

  useEffect(() => {
    if (preObjectId && objects.some((o) => o.id === preObjectId)) {
      setSelectedObjectId(preObjectId)
    }
  }, [preObjectId, objects])

  useEffect(() => {
    if (!preAppointmentId || preObjectId || selectedObjectId) return
    async function hydrateFromAppointment() {
      const { data } = await supabase
        .from('appointments')
        .select('id, object_id, asset_id')
        .eq('id', preAppointmentId)
        .maybeSingle()
      if (!data) return
      setSelectedObjectId((data.object_id as string) || '')
      if (data.asset_id) setSelectedAssetId(String(data.asset_id))
    }
    void hydrateFromAppointment()
  }, [preAppointmentId, preObjectId, selectedObjectId, supabase])

  useEffect(() => {
    if (!selectedObjectId) {
      setAppointments([])
      setSelectedAppointmentId('')
      if (!preAssetId) setSelectedAssetId('')
      return
    }

    async function loadAppointmentsForObject() {
      const { data, error } = await supabase
        .from('appointments')
        .select('id, object_id, asset_id, service_type, preferred_date, status')
        .eq('object_id', selectedObjectId)
        .order('created_at', { ascending: false })
        .limit(50)
      if (!error && data) {
        const rows = data as AppointmentRow[]
        setAppointments(rows)
        if (preAppointmentId && rows.some((r) => r.id === preAppointmentId)) {
          setSelectedAppointmentId(preAppointmentId)
          const match = rows.find((r) => r.id === preAppointmentId)
          if (match?.asset_id) setSelectedAssetId(match.asset_id)
        }
      }
    }
    void loadAppointmentsForObject()
  }, [selectedObjectId, preAppointmentId, preAssetId, supabase])

  useEffect(() => {
    if (preAssetId) setSelectedAssetId(preAssetId)
  }, [preAssetId])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return
    if (selectedFile.size > 10 * 1024 * 1024) {
      alert('Datei ist zu groß. Maximal 10 MB erlaubt.')
      return
    }
    setFile(selectedFile)
    setFileName(selectedFile.name)
  }

  const uploadDocument = async () => {
    if (!selectedObjectId || !file || !title.trim()) {
      alert('Bitte Kunden-Objekt, Titel und Datei auswählen.')
      return
    }
    if (documentType === 'report' && !selectedAppointmentId) {
      alert('Für Serviceberichte ist ein Terminbezug erforderlich.')
      return
    }
    if ((documentType === 'invoice' || documentType === 'offer') && !selectedAppointmentId && !selectedAssetId) {
      alert('Für Rechnung/Angebot bitte mindestens Termin- oder Anlagenbezug setzen.')
      return
    }

    setIsUploading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Nicht eingeloggt')

      const filePath = `documents/${selectedObjectId}/${Date.now()}-${file.name}`
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file, { cacheControl: '3600', upsert: false })

      if (uploadError) {
        if (uploadError.message.includes('Bucket not found')) {
          throw new Error('Storage-Bucket "documents" existiert nicht.')
        }
        throw uploadError
      }

      const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(filePath)

      const { error: insertError } = await supabase.from('documents').insert({
        object_id: selectedObjectId,
        appointment_id: selectedAppointmentId || null,
        asset_id: selectedAssetId || null,
        type: documentType,
        title: title.trim(),
        file_url: publicUrl,
        file_name: file.name,
        file_size: file.size,
        uploaded_by: user.id,
      })

      if (insertError) throw insertError

      setUploadSuccess(true)
      setTimeout(() => router.push('/dashboard/documents'), 1200)
    } catch (err: unknown) {
      console.error(err)
      const msg = err instanceof Error ? err.message : 'Unbekannt'
      alert('Fehler beim Hochladen: ' + msg)
    } finally {
      setIsUploading(false)
    }
  }

  if (!allowed) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-sm text-slate-400 sm:text-base">
        <Loader2 className="mx-auto mb-3 h-9 w-9 animate-spin text-emerald-500 sm:mb-4 sm:h-10 sm:w-10" />
        Zugriff wird geprüft…
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/dashboard/documents" className="mb-5 flex items-center gap-2 text-slate-400 hover:text-white sm:mb-8">
        <ArrowLeft className="h-4 w-4 shrink-0" /> Zurück zu Dokumenten
      </Link>

      <div className="mb-6 sm:mb-8">
        <h1 className="mb-2 text-3xl font-semibold tracking-tighter sm:mb-3 sm:text-4xl lg:text-5xl">Beleg für Kunden</h1>
        <p className="text-base text-slate-400 sm:text-lg lg:text-xl">
          Nur für den Betrieb: Belege und weitere Dokumente dem passenden Objekt zuordnen.
        </p>
        {(preAppointmentId || preAssetId) && (
          <p className="mt-2 text-xs text-emerald-300">
            Kontext erkannt: {preAppointmentId ? `Termin ${preAppointmentId.slice(0, 8)}…` : ''}{' '}
            {preAssetId ? `• Anlage ${preAssetId.slice(0, 8)}…` : ''}
          </p>
        )}
      </div>

      <div className="card p-5 sm:p-6 lg:p-8">
        <div className="space-y-6 sm:space-y-8">
          <div>
            <label className="text-sm text-slate-300 block mb-2">Kunden-Objekt *</label>
            <select
              value={selectedObjectId}
              onChange={(e) => setSelectedObjectId(e.target.value)}
              className="input w-full text-base sm:text-lg"
              required
            >
              <option value="">— Objekt auswählen —</option>
              {objects.map((obj) => {
                const cn = customerName(obj)
                return (
                  <option key={obj.id} value={obj.id}>
                    {obj.name}
                    {obj.city ? ` (${obj.city})` : ''}
                    {cn ? ` – ${cn}` : ''}
                  </option>
                )
              })}
            </select>
          </div>

          <div>
            <label className="text-sm text-slate-300 block mb-2">Terminbezug (optional)</label>
            <select
              value={selectedAppointmentId}
              onChange={(e) => {
                const id = e.target.value
                setSelectedAppointmentId(id)
                const match = appointments.find((a) => a.id === id)
                if (match?.asset_id) setSelectedAssetId(match.asset_id)
              }}
              className="input w-full text-base"
            >
              <option value="">— Kein Terminbezug —</option>
              {appointments.map((appt) => (
                <option key={appt.id} value={appt.id}>
                  {appt.service_type} · {appt.preferred_date ? new Date(appt.preferred_date).toLocaleDateString('de-DE') : 'ohne Datum'} · {appt.status}
                </option>
              ))}
            </select>
            {documentType === 'report' && !selectedAppointmentId && (
              <p className="mt-2 text-xs text-amber-300">Servicebericht benötigt einen Terminbezug.</p>
            )}
          </div>

          <div>
            <label className="text-sm text-slate-300 block mb-2">Anlagenbezug (optional UUID)</label>
            <input
              type="text"
              value={selectedAssetId}
              onChange={(e) => setSelectedAssetId(e.target.value.trim())}
              className="input w-full text-base"
              placeholder="asset_id (optional)"
            />
            {(documentType === 'invoice' || documentType === 'offer') && !selectedAppointmentId && !selectedAssetId && (
              <p className="mt-2 text-xs text-amber-300">Für Rechnung/Angebot wird ein Termin- oder Anlagenbezug erwartet.</p>
            )}
          </div>

          <div>
            <label className="text-sm text-slate-300 block mb-2">Dokumententyp *</label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { value: 'invoice' as const, label: 'Rechnung', icon: '📄' },
                { value: 'offer' as const, label: 'Angebot', icon: '📝' },
                { value: 'report' as const, label: 'Servicebericht', icon: '📋' },
                { value: 'other' as const, label: 'Andere', icon: '📎' },
              ].map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setDocumentType(type.value)}
                  className={`flex flex-col items-center gap-1.5 rounded-2xl border p-3 transition-all sm:gap-2 sm:p-4 ${
                    documentType === type.value
                      ? 'border-emerald-500 bg-emerald-600/10 text-emerald-400'
                      : 'border-slate-700 hover:border-slate-600 text-slate-400'
                  }`}
                >
                  <span className="text-2xl">{type.icon}</span>
                  <span className="font-medium text-center text-sm">{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm text-slate-300 block mb-2">Titel / Bezug *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input w-full text-base sm:text-lg"
              placeholder="z. B. Rechnung Nr. 2026-048 – Wartung"
              required
            />
          </div>

          <div>
            <label className="text-sm text-slate-300 block mb-2">Datei (PDF, JPG, PNG) *</label>
            {!file ? (
              <div
                onClick={() => document.getElementById('admin-file-upload')?.click()}
                className="cursor-pointer rounded-3xl border-2 border-dashed border-slate-700 bg-slate-900/50 px-4 py-8 text-center transition hover:border-emerald-500 sm:p-10 lg:p-12"
              >
                <Upload className="mx-auto mb-3 h-10 w-10 text-emerald-500 sm:mb-4 sm:h-12 sm:w-12" />
                <p className="font-medium mb-1">Datei auswählen</p>
                <p className="text-sm text-slate-500">PDF, JPG oder PNG • max. 10 MB</p>
                <input
                  id="admin-file-upload"
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={handleFileSelect}
                />
              </div>
            ) : (
              <div className="border border-emerald-900/50 bg-emerald-950/30 rounded-3xl p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-emerald-600/20 rounded-2xl flex items-center justify-center">
                    <FileText className="w-6 h-6 text-emerald-500" />
                  </div>
                  <div>
                    <div className="font-medium">{fileName}</div>
                    <div className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB</div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFile(null)
                    setFileName('')
                  }}
                  className="text-red-400 hover:text-red-300 text-sm"
                >
                  Entfernen
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 border-t border-slate-800 pt-6 sm:mt-8 sm:flex-row sm:gap-4">
          <button
            type="button"
            onClick={uploadDocument}
            disabled={isUploading || !selectedObjectId || !file || !title.trim()}
            className="btn-primary order-1 flex flex-1 items-center justify-center gap-2 py-3.5 disabled:opacity-50 sm:gap-3 sm:py-4 sm:text-lg"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Wird hochgeladen…
              </>
            ) : uploadSuccess ? (
              <>
                <CheckCircle className="w-5 h-5" />
                Gespeichert
              </>
            ) : (
              'Beleg speichern'
            )}
          </button>
          <Link href="/dashboard/documents" className="btn-secondary order-2 flex flex-1 justify-center py-3.5 text-center sm:flex-initial sm:px-8 sm:py-4 sm:text-lg">
            Abbrechen
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function AdminBusinessDocumentPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-3xl mx-auto py-24 text-center text-slate-400">Laden…</div>
      }
    >
      <AdminBusinessDocumentForm />
    </Suspense>
  )
}
