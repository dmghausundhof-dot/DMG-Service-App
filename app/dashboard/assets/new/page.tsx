'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Upload, Loader2, CheckCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getOrCreateProfileId } from '@/lib/supabase/ensure-profile'

export default function NewAssetPage() {
  const router = useRouter()
  const supabase = createClient()

  const [objects, setObjects] = useState<any[]>([])
  const [selectedObjectId, setSelectedObjectId] = useState('')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [imageBase64, setImageBase64] = useState<string | null>(null)
  const [mimeType, setMimeType] = useState('image/jpeg')

  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<any>(null)

  const [formData, setFormData] = useState({
    name: '',
    category: 'Balkonkraftwerk',
    manufacturer: '',
    model: '',
    year_built: '',
    capacity: '',
    notes: ''
  })

  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    async function loadObjects() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const pid = await getOrCreateProfileId(supabase, user)
      if (pid) {
        const { data } = await supabase.from('objects').select('id, name, city').eq('profile_id', pid)
        if (data) {
          setObjects(data)
          if (data.length > 0) setSelectedObjectId(data[0].id)
        }
      }
    }
    loadObjects()
  }, [supabase])

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setMimeType(file.type)
    const reader = new FileReader()
    reader.onload = (ev) => {
      setImagePreview(ev.target?.result as string)
      setImageBase64((ev.target?.result as string).split(',')[1])
    }
    reader.readAsDataURL(file)
    setAnalysis(null)
  }

  const analyze = async () => {
    if (!imageBase64) return
    setIsAnalyzing(true)
    const res = await fetch('/api/analyze-asset', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({imageBase64, mimeType})
    })
    const data = await res.json()
    if (data.success && data.analysis) {
      setAnalysis(data.analysis)
      setFormData({
        name: data.analysis.model || 'Neue Anlage',
        category: data.analysis.category || 'Sonstiges',
        manufacturer: data.analysis.manufacturer || '',
        model: data.analysis.model || '',
        year_built: data.analysis.year_built || '',
        capacity: data.analysis.capacity || '',
        notes: `Grok Confidence: ${Math.round((data.analysis.confidence||0)*100)}%`
      })
    } else {
      alert('Analyse fehlgeschlagen: ' + (data.error || 'Unbekannt'))
    }
    setIsAnalyzing(false)
  }

  const save = async () => {
    if (!selectedObjectId || !imagePreview) {
      alert('Objekt und Bild erforderlich')
      return
    }
    setIsSaving(true)
    try {
      // For demo: just show success (full upload + insert would require storage bucket + more code)
      alert('✅ Anlage würde jetzt gespeichert werden (Demo-Modus).\n\nIn der vollständigen Version wird das Bild zu Supabase Storage hochgeladen und der Datensatz in der assets-Tabelle angelegt.')
      setTimeout(() => router.push('/dashboard/assets'), 1200)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Link href="/dashboard/assets" className="flex items-center gap-2 text-slate-400 mb-8 hover:text-white">
        <ArrowLeft className="w-4 h-4" /> Zurück
      </Link>

      <h1 className="text-4xl font-semibold tracking-tight mb-2">Neue Anlage hinzufügen</h1>
      <p className="text-xl text-slate-400 mb-10">Foto hochladen → Grok analysiert → Daten bestätigen</p>

      <div className="card p-8 space-y-8">
        {/* Image Upload */}
        <div>
          <label className="block text-sm font-medium mb-3 text-slate-300">Foto der Anlage (z.B. Balkonkraftwerk, Wärmepumpe)</label>
          {!imagePreview ? (
            <div 
              onClick={() => document.getElementById('img')?.click()}
              className="border-2 border-dashed border-slate-700 hover:border-emerald-500 rounded-3xl p-16 text-center cursor-pointer bg-slate-900/50 transition"
            >
              <Upload className="mx-auto w-10 h-10 text-emerald-500 mb-4" />
              <p className="font-medium">Klicken oder Bild hierher ziehen</p>
              <input id="img" type="file" accept="image/*" className="hidden" onChange={handleImage} />
            </div>
          ) : (
            <div className="relative">
              <img src={imagePreview} className="rounded-3xl w-full max-h-[420px] object-contain bg-black" />
              <button onClick={() => {setImagePreview(null); setAnalysis(null)}} className="absolute top-4 right-4 bg-black/70 px-4 py-1 rounded-full text-sm">Entfernen</button>
            </div>
          )}
        </div>

        {imagePreview && !analysis && (
          <button onClick={analyze} disabled={isAnalyzing} className="btn-primary w-full py-4 text-lg">
            {isAnalyzing ? <><Loader2 className="inline animate-spin mr-2" /> Grok analysiert...</> : '🔍 Mit Grok analysieren'}
          </button>
        )}

        {analysis && (
          <div className="bg-emerald-950 border border-emerald-900 rounded-2xl p-6">
            <div className="text-emerald-400 font-medium mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5" /> Grok hat folgendes erkannt:
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-slate-400">Kategorie:</span> {analysis.category}</div>
              <div><span className="text-slate-400">Hersteller:</span> {analysis.manufacturer || '—'}</div>
              <div><span className="text-slate-400">Modell:</span> {analysis.model || '—'}</div>
              <div><span className="text-slate-400">Leistung:</span> {analysis.capacity || '—'}</div>
            </div>
          </div>
        )}

        {/* Form */}
        <div className="space-y-6 pt-4">
          <div>
            <label className="text-sm text-slate-300 block mb-2">Objekt *</label>
            <select value={selectedObjectId} onChange={e => setSelectedObjectId(e.target.value)} className="input w-full">
              <option value="">— Objekt wählen —</option>
              {objects.map(o => <option key={o.id} value={o.id}>{o.name} {o.city && `(${o.city})`}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="text-sm text-slate-300 block mb-2">Name der Anlage</label>
              <input name="name" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="input w-full" />
            </div>
            <div>
              <label className="text-sm text-slate-300 block mb-2">Kategorie</label>
              <select name="category" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="input w-full">
                <option>Balkonkraftwerk</option>
                <option>Wärmepumpe</option>
                <option>Entsalzungsanlage</option>
                <option>Filteranlage</option>
                <option>Sonstiges</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-6">
            <div><label className="text-sm text-slate-300 block mb-2">Hersteller</label><input value={formData.manufacturer} onChange={e => setFormData({...formData, manufacturer: e.target.value})} className="input w-full" /></div>
            <div><label className="text-sm text-slate-300 block mb-2">Modell</label><input value={formData.model} onChange={e => setFormData({...formData, model: e.target.value})} className="input w-full" /></div>
            <div><label className="text-sm text-slate-300 block mb-2">Baujahr</label><input value={formData.year_built} onChange={e => setFormData({...formData, year_built: e.target.value})} className="input w-full" /></div>
          </div>

          <div>
            <label className="text-sm text-slate-300 block mb-2">Leistung / Kapazität</label>
            <input value={formData.capacity} onChange={e => setFormData({...formData, capacity: e.target.value})} className="input w-full" placeholder="5.2 kWp" />
          </div>

          <div>
            <label className="text-sm text-slate-300 block mb-2">Notizen</label>
            <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} className="input w-full h-24" />
          </div>
        </div>

        <button onClick={save} disabled={isSaving || !selectedObjectId || !imagePreview} className="btn-primary w-full py-4 text-lg mt-4">
          {isSaving ? 'Speichert...' : 'Anlage speichern'}
        </button>
      </div>

      <p className="text-center text-xs text-slate-500 mt-8">Demo-Version • Volle Speicherung + Upload in Produktion</p>
    </div>
  )
}
