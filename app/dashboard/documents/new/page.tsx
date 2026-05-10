'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Upload, Loader2, CheckCircle, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getOrCreateProfileId } from '@/lib/supabase/ensure-profile'

const ACCEPT = '.pdf,.jpg,.jpeg,.png,.webp,.heic,.gif'

function CustomerUploadForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preObjectId = searchParams.get('object_id')
  const supabase = createClient()

  const [objects, setObjects] = useState<{ id: string; name: string; city: string | null }[]>([])
  const [selectedObjectId, setSelectedObjectId] = useState('')
  const [title, setTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [fileName, setFileName] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)

  useEffect(() => {
    async function loadObjects() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const pid = await getOrCreateProfileId(supabase, user)
      if (pid) {
        const { data } = await supabase.from('objects').select('id, name, city').eq('profile_id', pid).order('name')
        if (data) setObjects(data)
      }
    }
    loadObjects()
  }, [supabase])

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
    if (!title.trim()) setTitle(selectedFile.name.replace(/\.[^.]+$/, ''))
  }

  const uploadDocument = async () => {
    if (!selectedObjectId || !file) {
      alert('Bitte Objekt und Datei auswählen.')
      return
    }

    setIsUploading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Nicht eingeloggt')

      const displayTitle = title.trim() || file.name

      const filePath = `documents/${selectedObjectId}/${Date.now()}-${file.name}`
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file, { cacheControl: '3600', upsert: false })

      if (uploadError) {
        if (uploadError.message.includes('Bucket not found')) {
          throw new Error('Storage-Bucket "documents" existiert nicht. Bitte in Supabase anlegen.')
        }
        throw uploadError
      }

      const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(filePath)

      const { error: insertError } = await supabase.from('documents').insert({
        object_id: selectedObjectId,
        type: 'customer_upload',
        title: displayTitle,
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

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/dashboard/documents" className="mb-5 flex items-center gap-2 text-slate-400 hover:text-white sm:mb-8">
        <ArrowLeft className="h-4 w-4 shrink-0" /> Zurück zu Dokumenten
      </Link>

      <div className="mb-6 sm:mb-8">
        <h1 className="mb-2 text-3xl font-semibold tracking-tighter sm:mb-3 sm:text-4xl lg:text-5xl">Datei hochladen</h1>
        <p className="text-base text-slate-400 sm:text-lg lg:text-xl">
          Bilder oder PDFs zu Ihrem Objekt – z. B. Fotos der Anlage, Verkabelung oder Herstellerdokumente.
        </p>
        <p className="mt-2 text-xs text-slate-500 sm:mt-3 sm:text-sm">
          Rechnungen, Angebote und Serviceberichte legt ausschließlich DMG Service im Admin-Bereich an.
        </p>
      </div>

      <div className="card p-5 sm:p-6 lg:p-8">
        <div className="space-y-6 sm:space-y-8">
          <div>
            <label className="text-sm text-slate-300 block mb-2">Objekt *</label>
            <select
              value={selectedObjectId}
              onChange={(e) => setSelectedObjectId(e.target.value)}
              className="input w-full text-base sm:text-lg"
              required
            >
              <option value="">— Objekt auswählen —</option>
              {objects.map((obj) => (
                <option key={obj.id} value={obj.id}>
                  {obj.name} {obj.city && `(${obj.city})`}
                </option>
              ))}
            </select>
            {objects.length === 0 && (
              <p className="text-xs text-amber-400 mt-1">Noch keine Objekte. Bitte zuerst ein Objekt anlegen.</p>
            )}
          </div>

          <div>
            <label className="text-sm text-slate-300 block mb-2">Kurzbeschriftung (optional)</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="input w-full text-base sm:text-lg"
              placeholder="z. B. Foto PV-Modul Dach Süd"
            />
          </div>

          <div>
            <label className="text-sm text-slate-300 block mb-2">Datei *</label>
            {!file ? (
              <div
                role="button"
                tabIndex={0}
                onClick={() => document.getElementById('customer-file-upload')?.click()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') document.getElementById('customer-file-upload')?.click()
                }}
                className="cursor-pointer rounded-3xl border-2 border-dashed border-slate-700 bg-slate-900/50 px-4 py-8 text-center transition hover:border-emerald-500 sm:p-10 lg:p-12"
              >
                <Upload className="mx-auto mb-3 h-10 w-10 text-emerald-500 sm:mb-4 sm:h-12 sm:w-12" />
                <p className="font-medium mb-1">Datei auswählen</p>
                <p className="text-sm text-slate-500">PDF oder Bild • max. 10 MB</p>
                <input
                  id="customer-file-upload"
                  type="file"
                  accept={ACCEPT}
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
            disabled={isUploading || !selectedObjectId || !file}
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
                Erfolgreich
              </>
            ) : (
              'Datei senden'
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

export default function CustomerUploadPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-3xl mx-auto py-24 text-center text-slate-400">Laden…</div>
      }
    >
      <CustomerUploadForm />
    </Suspense>
  )
}
