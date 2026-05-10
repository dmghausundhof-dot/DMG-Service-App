'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Upload, Loader2, CheckCircle, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getOrCreateProfileId } from '@/lib/supabase/ensure-profile'

type ObjectRow = {
  id: string
  name: string
  city: string | null
  profiles?: { full_name: string | null } | { full_name: string | null }[] | null
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
  const supabase = createClient()

  const [allowed, setAllowed] = useState(false)
  const [objects, setObjects] = useState<ObjectRow[]>([])
  const [selectedObjectId, setSelectedObjectId] = useState('')
  const [documentType, setDocumentType] = useState<'offer' | 'invoice' | 'report' | 'other'>('invoice')
  const [title, setTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [fileName, setFileName] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)

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
        .select('id, name, city, profiles (full_name)')
        .order('created_at', { ascending: false })

      if (!error && data) setObjects(data as ObjectRow[])
    }
    gateAndLoad()
  }, [router, supabase])

  useEffect(() => {
    if (preObjectId && objects.some((o) => o.id === preObjectId)) {
      setSelectedObjectId(preObjectId)
    }
  }, [preObjectId, objects])

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
      <div className="max-w-3xl mx-auto py-20 text-center text-slate-400">
        <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4 text-emerald-500" />
        Zugriff wird geprüft…
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/dashboard/documents" className="flex items-center gap-2 text-slate-400 hover:text-white mb-8">
        <ArrowLeft className="w-4 h-4" /> Zurück zu Dokumenten
      </Link>

      <div className="mb-8">
        <h1 className="text-5xl font-semibold tracking-tighter mb-3">Beleg für Kunden</h1>
        <p className="text-xl text-slate-400">
          Nur für den Betrieb: Belege und weitere Dokumente dem passenden Objekt zuordnen.
        </p>
      </div>

      <div className="card p-8">
        <div className="space-y-8">
          <div>
            <label className="text-sm text-slate-300 block mb-2">Kunden-Objekt *</label>
            <select
              value={selectedObjectId}
              onChange={(e) => setSelectedObjectId(e.target.value)}
              className="input w-full text-lg"
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
                  className={`p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 ${
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
              className="input w-full text-lg"
              placeholder="z. B. Rechnung Nr. 2026-048 – Wartung"
              required
            />
          </div>

          <div>
            <label className="text-sm text-slate-300 block mb-2">Datei (PDF, JPG, PNG) *</label>
            {!file ? (
              <div
                onClick={() => document.getElementById('admin-file-upload')?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-emerald-500 rounded-3xl p-12 text-center cursor-pointer bg-slate-900/50 transition"
              >
                <Upload className="mx-auto w-12 h-12 text-emerald-500 mb-4" />
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

        <div className="mt-8 pt-6 border-t border-slate-800 flex gap-4">
          <button
            type="button"
            onClick={uploadDocument}
            disabled={isUploading || !selectedObjectId || !file || !title.trim()}
            className="btn-primary flex-1 py-4 text-lg flex items-center justify-center gap-3 disabled:opacity-50"
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
          <Link href="/dashboard/documents" className="btn-secondary px-8 py-4 text-lg">
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
