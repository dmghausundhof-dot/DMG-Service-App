'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Upload, Loader2, CheckCircle, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

export default function NewDocumentPage() {
  const router = useRouter()
  const supabase = createClient()

  const [objects, setObjects] = useState<any[]>([])
  const [selectedObjectId, setSelectedObjectId] = useState('')
  const [documentType, setDocumentType] = useState<'offer' | 'invoice' | 'report'>('invoice')
  const [title, setTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [fileName, setFileName] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState(false)

  useEffect(() => {
    async function loadObjects() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: profile } = await supabase.from('profiles').select('id').eq('user_id', user.id).single()
      if (profile) {
        const { data } = await supabase.from('objects').select('id, name, city').eq('profile_id', profile.id).order('name')
        if (data) setObjects(data)
      }
    }
    loadObjects()
  }, [supabase])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (!selectedFile) return

    // Max 10MB
    if (selectedFile.size > 10 * 1024 * 1024) {
      alert('Datei ist zu groß. Maximal 10 MB erlaubt.')
      return
    }

    setFile(selectedFile)
    setFileName(selectedFile.name)
  }

  const uploadDocument = async () => {
    if (!selectedObjectId || !file || !title) {
      alert('Bitte Objekt, Titel und Datei auswählen.')
      return
    }

    setIsUploading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Nicht eingeloggt')

      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop()
      const filePath = `documents/${selectedObjectId}/${Date.now()}-${file.name}`

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        if (uploadError.message.includes('Bucket not found')) {
          throw new Error('Storage-Bucket "documents" existiert nicht. Bitte in Supabase anlegen.')
        }
        throw uploadError
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath)

      // Insert into database
      const { error: insertError } = await supabase
        .from('documents')
        .insert({
          object_id: selectedObjectId,
          type: documentType,
          title: title,
          file_url: publicUrl,
          file_name: file.name,
          file_size: file.size,
          uploaded_by: user.id
        })

      if (insertError) throw insertError

      setUploadSuccess(true)

      setTimeout(() => {
        router.push('/dashboard/documents')
      }, 1500)
    } catch (err: any) {
      console.error(err)
      alert('Fehler beim Hochladen: ' + (err.message || 'Unbekannt'))
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/dashboard/documents" className="flex items-center gap-2 text-slate-400 hover:text-white mb-8">
        <ArrowLeft className="w-4 h-4" /> Zurück zu Dokumenten
      </Link>

      <div className="mb-8">
        <h1 className="text-5xl font-semibold tracking-tighter mb-3">Dokument hochladen</h1>
        <p className="text-xl text-slate-400">Speichern Sie Angebote, Rechnungen oder Serviceberichte sicher in Ihrem Portal.</p>
      </div>

      <div className="card p-8">
        <div className="space-y-8">
          {/* Object Selection */}
          <div>
            <label className="text-sm text-slate-300 block mb-2">Zugehöriges Objekt *</label>
            <select 
              value={selectedObjectId} 
              onChange={(e) => setSelectedObjectId(e.target.value)}
              className="input w-full text-lg"
              required
            >
              <option value="">— Objekt auswählen —</option>
              {objects.map(obj => (
                <option key={obj.id} value={obj.id}>
                  {obj.name} {obj.city && `(${obj.city})`}
                </option>
              ))}
            </select>
            {objects.length === 0 && (
              <p className="text-xs text-amber-400 mt-1">Noch keine Objekte angelegt. Bitte zuerst ein Objekt erstellen.</p>
            )}
          </div>

          {/* Document Type */}
          <div>
            <label className="text-sm text-slate-300 block mb-2">Dokumententyp *</label>
            <div className="flex gap-3">
              {[
                { value: 'invoice', label: 'Rechnung', icon: '📄' },
                { value: 'offer', label: 'Angebot', icon: '📝' },
                { value: 'report', label: 'Servicebericht', icon: '📋' }
              ].map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setDocumentType(type.value as 'offer' | 'invoice' | 'report')}
                  className={`flex-1 p-4 rounded-2xl border transition-all flex flex-col items-center gap-2 ${
                    documentType === type.value 
                      ? 'border-emerald-500 bg-emerald-600/10 text-emerald-400' 
                      : 'border-slate-700 hover:border-slate-600 text-slate-400'
                  }`}
                >
                  <span className="text-2xl">{type.icon}</span>
                  <span className="font-medium">{type.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="text-sm text-slate-300 block mb-2">Titel / Beschreibung *</label>
            <input 
              type="text" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)}
              className="input w-full text-lg" 
              placeholder="z.B. Rechnung Nr. 2026-048 - Wartung Balkonkraftwerk"
              required
            />
          </div>

          {/* File Upload */}
          <div>
            <label className="text-sm text-slate-300 block mb-2">Datei (PDF, JPG, PNG) *</label>
            
            {!file ? (
              <div 
                onClick={() => document.getElementById('file-upload')?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-emerald-500 rounded-3xl p-12 text-center cursor-pointer bg-slate-900/50 transition"
              >
                <Upload className="mx-auto w-12 h-12 text-emerald-500 mb-4" />
                <p className="font-medium mb-1">Datei auswählen oder hierher ziehen</p>
                <p className="text-sm text-slate-500">PDF, JPG oder PNG • Maximal 10 MB</p>
                <input 
                  id="file-upload" 
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
                  onClick={() => { setFile(null); setFileName('') }}
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
            onClick={uploadDocument}
            disabled={isUploading || !selectedObjectId || !file || !title}
            className="btn-primary flex-1 py-4 text-lg flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Wird hochgeladen...
              </>
            ) : uploadSuccess ? (
              <>
                <CheckCircle className="w-5 h-5" />
                Erfolgreich hochgeladen!
              </>
            ) : (
              'Dokument hochladen'
            )}
          </button>

          <Link 
            href="/dashboard/documents" 
            className="btn-secondary px-8 py-4 text-lg"
          >
            Abbrechen
          </Link>
        </div>
      </div>

      <p className="text-center text-xs text-slate-500 mt-6">
        Dateien werden sicher in Ihrem Supabase Storage gespeichert und sind nur für Sie sichtbar.
      </p>
    </div>
  )
}
