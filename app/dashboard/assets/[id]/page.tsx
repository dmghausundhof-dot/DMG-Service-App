'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Upload, Loader2, CheckCircle, Calendar, Save, AlertTriangle, Wrench, Edit, FileText, Trash2, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getOrCreateProfileId } from '@/lib/supabase/ensure-profile'

interface Asset {
  id: string
  name: string
  category: string
  manufacturer: string | null
  model: string | null
  serial_number: string | null
  year_built: number | null
  capacity: string | null
  filter_type: string | null
  last_maintenance: string | null
  maintenance_interval_months: number | null
  next_maintenance_due: string | null
  image_url: string | null
  notes: string | null
  ai_analysis: any | null
  ai_suggested_fields: any | null
  object_id: string
  objects: {
    name: string
    city: string | null
  } | null
}

interface MaintenanceHistoryItem {
  date: string
  description: string
  performed_by: string
  notes: string
}

function getAssetStatus(asset: {
  next_maintenance_due?: string | null
  last_maintenance?: string | null
}) {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  if (asset.next_maintenance_due) {
    const dueDate = new Date(asset.next_maintenance_due)
    if (dueDate < today) {
      return { 
        label: 'Wartung überfällig', 
        color: 'red', 
        bg: 'bg-red-600/20 text-red-400 border-red-900/50',
        icon: AlertTriangle 
      }
    }
    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 3600 * 24))
    if (diffDays <= 30) {
      return { 
        label: `Wartung in ${diffDays} Tagen`, 
        color: 'amber', 
        bg: 'bg-amber-600/20 text-amber-400 border-amber-900/50',
        icon: Calendar 
      }
    }
  }

  if (asset.last_maintenance) {
    return { 
      label: 'Aktiv', 
      color: 'emerald', 
      bg: 'bg-emerald-600/20 text-emerald-400 border-emerald-900/50',
      icon: CheckCircle 
    }
  }

  return { 
    label: 'Neu', 
    color: 'blue', 
    bg: 'bg-blue-600/20 text-blue-400 border-blue-900/50',
    icon: Wrench 
  }
}

export default function AssetDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [asset, setAsset] = useState<Asset | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [objects, setObjects] = useState<any[]>([])

  const [formData, setFormData] = useState({
    name: '',
    category: 'Balkonkraftwerk',
    manufacturer: '',
    model: '',
    serial_number: '',
    year_built: '',
    capacity: '',
    filter_type: '',
    maintenance_interval_months: '12',
    last_maintenance: '',
    next_maintenance_due: '',
    notes: '',
    object_id: ''
  })

  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [newImageBase64, setNewImageBase64] = useState<string | null>(null)
  const [mimeType, setMimeType] = useState('image/jpeg')

  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<any>(null)
  const [isSaving, setIsSaving] = useState(false)

  const [maintenanceHistory, setMaintenanceHistory] = useState<MaintenanceHistoryItem[]>([])
  const [appointments, setAppointments] = useState<any[]>([])

  // Load objects for selection
  useEffect(() => {
    async function loadObjects() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const pid = await getOrCreateProfileId(supabase, user)
      if (pid) {
        const { data } = await supabase.from('objects').select('id, name, city').eq('profile_id', pid)
        if (data) setObjects(data)
      }
    }
    loadObjects()
  }, [supabase])

  // Fetch asset
  useEffect(() => {
    async function fetchAsset() {
      if (!id) return
      setLoading(true)
      setError('')

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const pid = await getOrCreateProfileId(supabase, user)
      if (!pid) {
        setError('Profil konnte nicht geladen werden')
        setLoading(false)
        return
      }

      const { data: assetData, error: fetchError } = await supabase
        .from('assets')
        .select(`
          *, 
          objects (name, city, profile_id)
        `)
        .eq('id', id)
        .maybeSingle()

      if (fetchError || !assetData) {
        setError('Anlage nicht gefunden oder Sie haben keine Berechtigung.')
        setLoading(false)
        return
      }

      const embedded = assetData.objects as { profile_id?: string } | { profile_id?: string }[] | null
      const objRow = Array.isArray(embedded) ? embedded[0] : embedded
      if (!objRow?.profile_id || objRow.profile_id !== pid) {
        setError('Anlage nicht gefunden oder Sie haben keine Berechtigung.')
        setLoading(false)
        return
      }

      setAsset(assetData as Asset)

      // Prefill form
      setFormData({
        name: assetData.name || '',
        category: assetData.category || 'Balkonkraftwerk',
        manufacturer: assetData.manufacturer || '',
        model: assetData.model || '',
        serial_number: assetData.serial_number || '',
        year_built: assetData.year_built ? assetData.year_built.toString() : '',
        capacity: assetData.capacity || '',
        filter_type: assetData.filter_type || '',
        maintenance_interval_months: assetData.maintenance_interval_months ? assetData.maintenance_interval_months.toString() : '12',
        last_maintenance: assetData.last_maintenance || '',
        next_maintenance_due: assetData.next_maintenance_due || '',
        notes: assetData.notes || '',
        object_id: assetData.object_id || ''
      })

      setImagePreview(assetData.image_url || null)

      // Fetch real maintenance history
      const { data: historyData } = await supabase
        .from('maintenance_history')
        .select('*')
        .eq('asset_id', id)
        .order('maintenance_date', { ascending: false })
      if (historyData) {
        setMaintenanceHistory(historyData.map((h: any) => ({
          date: h.maintenance_date,
          description: h.description || 'Wartung',
          performed_by: h.performed_by || 'DMG Service',
          notes: h.notes || ''
        })))
      }

      // Fetch linked appointments for the object
      if (assetData.object_id) {
        const { data: apptData } = await supabase
          .from('appointments')
          .select(`
            id, 
            service_type, 
            preferred_date, 
            time_window, 
            status, 
            description
          `)
          .eq('object_id', assetData.object_id)
          .order('preferred_date', { ascending: true })
          .limit(10)
        if (apptData) setAppointments(apptData)
      }

      setLoading(false)
    }

    fetchAsset()
  }, [id, router, supabase])

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setMimeType(file.type)
    const reader = new FileReader()
    reader.onload = (ev) => {
      setImagePreview(ev.target?.result as string)
      setNewImageBase64((ev.target?.result as string).split(',')[1])
    }
    reader.readAsDataURL(file)
    setAnalysis(null)
  }

  const analyze = async () => {
    if (!newImageBase64 && !imagePreview) return
    setIsAnalyzing(true)
    const base64ToUse = newImageBase64 || (imagePreview ? imagePreview.split(',')[1] : null)
    if (!base64ToUse) return

    const res = await fetch('/api/analyze-asset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: base64ToUse, mimeType })
    })
    const data = await res.json()
    if (data.success && data.analysis) {
      setAnalysis(data.analysis)
      // Merge suggestions without overwriting everything
      setFormData(prev => ({
        ...prev,
        category: data.analysis.category || prev.category,
        manufacturer: data.analysis.manufacturer || prev.manufacturer,
        model: data.analysis.model || prev.model,
        year_built: data.analysis.year_built ? data.analysis.year_built.toString() : prev.year_built,
        capacity: data.analysis.capacity || prev.capacity,
        notes: prev.notes || `Konfidenz: ${Math.round((data.analysis.confidence || 0) * 100)}%`
      }))
    } else {
      alert('Analyse fehlgeschlagen: ' + (data.error || 'Unbekannt'))
    }
    setIsAnalyzing(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const calculateNextMaintenance = () => {
    if (!formData.last_maintenance || !formData.maintenance_interval_months) {
      alert('Bitte letztes Wartungsdatum und Intervall angeben.')
      return
    }
    const lastDate = new Date(formData.last_maintenance)
    const interval = parseInt(formData.maintenance_interval_months)
    const nextDate = new Date(lastDate)
    nextDate.setMonth(nextDate.getMonth() + interval)
    const nextDateStr = nextDate.toISOString().split('T')[0]
    setFormData(prev => ({ ...prev, next_maintenance_due: nextDateStr }))
  }

  const logMaintenance = async () => {
    const today = new Date().toISOString().split('T')[0]
    const interval = parseInt(formData.maintenance_interval_months) || 12
    const nextDate = new Date()
    nextDate.setMonth(nextDate.getMonth() + interval)
    const nextDateStr = nextDate.toISOString().split('T')[0]

    // Update form
    setFormData(prev => ({
      ...prev,
      last_maintenance: today,
      next_maintenance_due: nextDateStr
    }))

    // Insert into real maintenance_history table
    try {
      await supabase
        .from('maintenance_history')
        .insert({
          asset_id: id,
          maintenance_date: today,
          description: 'Wartung protokolliert',
          performed_by: 'Sie (Kunde)',
          notes: 'Manuell über Detail-Seite erfasst'
        })

      // Also update asset's last/next dates
      await supabase
        .from('assets')
        .update({
          last_maintenance: today,
          next_maintenance_due: nextDateStr
        })
        .eq('id', id)

      // Refresh history
      const { data: newHistory } = await supabase
        .from('maintenance_history')
        .select('*')
        .eq('asset_id', id)
        .order('maintenance_date', { ascending: false })
      if (newHistory) {
        setMaintenanceHistory(newHistory.map((h: any) => ({
          date: h.maintenance_date,
          description: h.description || 'Wartung',
          performed_by: h.performed_by || 'DMG Service',
          notes: h.notes || ''
        })))
      }

      alert('✅ Wartung protokolliert und nächste Wartung automatisch berechnet!')
    } catch (err: any) {
      console.error(err)
      alert('Fehler beim Protokollieren: ' + (err.message || 'Unbekannt'))
    }
  }

  const deleteAsset = async () => {
    if (!confirm('Möchten Sie diese Anlage wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) {
      return
    }
    try {
      const { error } = await supabase
        .from('assets')
        .delete()
        .eq('id', id)
      if (error) throw error
      alert('✅ Anlage wurde gelöscht.')
      router.push('/dashboard/assets')
    } catch (err: any) {
      console.error(err)
      alert('Fehler beim Löschen: ' + (err.message || 'Unbekannt'))
    }
  }

  const save = async () => {
    if (!formData.name || !formData.object_id) {
      alert('Name und Objekt sind Pflichtfelder.')
      return
    }
    setIsSaving(true)

    try {
      const updatePayload: any = {
        name: formData.name,
        category: formData.category,
        manufacturer: formData.manufacturer || null,
        model: formData.model || null,
        serial_number: formData.serial_number || null,
        year_built: formData.year_built ? parseInt(formData.year_built) : null,
        capacity: formData.capacity || null,
        filter_type: formData.filter_type || null,
        maintenance_interval_months: parseInt(formData.maintenance_interval_months) || 12,
        last_maintenance: formData.last_maintenance || null,
        next_maintenance_due: formData.next_maintenance_due || null,
        notes: formData.notes || null,
        object_id: formData.object_id
      }

      // If new image, in real app we would upload to storage here
      if (newImageBase64 && imagePreview) {
        // Demo: pretend upload
        updatePayload.image_url = imagePreview // would be real public URL after upload
        alert('Bild-Upload wird in der vollständigen Version zu Supabase Storage hochgeladen.')
      } else if (imagePreview) {
        updatePayload.image_url = imagePreview
      }

      const { error } = await supabase
        .from('assets')
        .update(updatePayload)
        .eq('id', id)

      if (error) throw error

      alert('✅ Anlage erfolgreich aktualisiert!')
      // Refresh asset data
      const { data: updatedAsset } = await supabase
        .from('assets')
        .select(`*, objects (name, city)`)
        .eq('id', id)
        .single()
      if (updatedAsset) setAsset(updatedAsset as Asset)

    } catch (err: any) {
      console.error(err)
      alert('Fehler beim Speichern: ' + (err.message || 'Unbekannt (Demo-Modus aktiv)'))
    } finally {
      setIsSaving(false)
      setNewImageBase64(null)
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-500" />
        <p className="mt-3 text-sm text-slate-400">Anlage wird geladen...</p>
      </div>
    )
  }

  if (error || !asset) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-4 sm:py-6">
        <Link href="/dashboard/assets" className="mb-5 flex items-center gap-2 text-slate-400 hover:text-white sm:mb-6">
          <ArrowLeft className="h-4 w-4 shrink-0" /> Zurück zu Meine Anlagen
        </Link>
        <div className="card p-6 text-center sm:p-10 lg:p-12">
          <AlertTriangle className="mx-auto mb-5 h-14 w-14 text-red-500 sm:mb-6 sm:h-16 sm:w-16" />
          <h1 className="mb-3 text-2xl font-semibold sm:mb-4 sm:text-3xl">Anlage nicht gefunden</h1>
          <p className="mb-6 text-sm text-slate-400 sm:mb-8 sm:text-base">
            {error || 'Die angeforderte Anlage existiert nicht oder Sie haben keine Zugriffsberechtigung.'}
          </p>
          <Link href="/dashboard/assets" className="btn-primary">
            Zurück zur Übersicht
          </Link>
        </div>
      </div>
    )
  }

  const currentStatus = getAssetStatus(formData)

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:mb-8 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
        <div className="min-w-0">
          <Link href="/dashboard/assets" className="mb-2 flex items-center gap-2 text-sm text-slate-400 hover:text-white">
            <ArrowLeft className="h-4 w-4 shrink-0" /> Zurück zu Meine Anlagen
          </Link>
          <h1 className="flex flex-col items-start gap-3 text-3xl font-semibold tracking-tighter sm:flex-row sm:flex-wrap sm:items-center sm:gap-4 lg:text-4xl xl:text-5xl">
            <span className="min-w-0 break-words">{formData.name}</span>
            <div className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium sm:px-4 sm:py-1.5 sm:text-sm ${currentStatus.bg}`}>
              <currentStatus.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              {currentStatus.label}
            </div>
          </h1>
          <p className="mt-2 text-base text-slate-400 sm:text-lg lg:text-xl">
            {asset.objects?.name} {asset.objects?.city && `• ${asset.objects.city}`}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap lg:shrink-0">
          <button type="button" onClick={logMaintenance} className="btn-secondary flex w-full items-center justify-center gap-2 sm:w-auto">
            <Calendar className="h-4 w-4 shrink-0" /> Wartung protokollieren
          </button>
          <button type="button" onClick={save} disabled={isSaving} className="btn-primary flex w-full items-center justify-center gap-2 px-6 py-3 sm:w-auto sm:text-lg">
            {isSaving ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" /> Speichert...
              </>
            ) : (
              <>
                <Save className="h-5 w-5 shrink-0" /> Speichern
              </>
            )}
          </button>
          <button
            type="button"
            onClick={deleteAsset}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-900/50 px-4 py-2.5 text-sm text-red-400 transition hover:bg-red-950/50 hover:text-red-300 sm:w-auto sm:py-3"
          >
            <Trash2 className="h-4 w-4 shrink-0" /> Löschen
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5 lg:gap-8">
        {/* Image Section */}
        <div className="lg:col-span-2">
          <div className="card sticky top-4 p-5 sm:top-6 sm:p-6">
            <label className="block text-sm font-medium text-slate-300 mb-3">Foto der Anlage</label>
            
            <div className="relative rounded-3xl overflow-hidden border border-slate-800 bg-slate-950">
              {imagePreview ? (
                <img 
                  src={imagePreview} 
                  alt={formData.name} 
                  className="w-full aspect-[16/10] object-contain bg-black" 
                />
              ) : (
                <div className="aspect-[16/10] flex items-center justify-center bg-slate-900">
                  <div className="text-center">
                    <Wrench className="w-12 h-12 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-500">Kein Foto hinterlegt</p>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-4 flex gap-3">
              <label className="flex-1 cursor-pointer">
                <div className="btn-secondary w-full flex items-center justify-center gap-2 py-3">
                  <Upload className="w-4 h-4" /> {imagePreview ? 'Foto ersetzen' : 'Foto hochladen'}
                </div>
                <input type="file" accept="image/*" className="hidden" onChange={handleImage} />
              </label>
              {imagePreview && (
                <button 
                  onClick={() => { setImagePreview(null); setNewImageBase64(null); setAnalysis(null) }} 
                  className="px-4 py-3 text-sm border border-red-900/50 text-red-400 hover:bg-red-950/50 rounded-2xl transition"
                >
                  Entfernen
                </button>
              )}
            </div>

            {imagePreview && !analysis && (
              <button 
                onClick={analyze} 
                disabled={isAnalyzing} 
                className="mt-3 w-full btn-primary py-3 flex items-center justify-center gap-2"
              >
                {isAnalyzing ? <><Loader2 className="w-4 h-4 animate-spin" /> Analysiert...</> : 'Aus Bild neu auswerten'}
              </button>
            )}

            {analysis && (
              <div className="mt-4 bg-emerald-950 border border-emerald-900 rounded-2xl p-5 text-sm">
                <div className="flex items-center gap-2 text-emerald-400 mb-3 font-medium">
                  <CheckCircle className="w-4 h-4" /> Auswertung übernommen
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-emerald-400/90">
                  <div>Kategorie: <span className="text-white">{analysis.category}</span></div>
                  <div>Hersteller: <span className="text-white">{analysis.manufacturer || '—'}</span></div>
                  <div>Modell: <span className="text-white">{analysis.model || '—'}</span></div>
                  <div>Leistung: <span className="text-white">{analysis.capacity || '—'}</span></div>
                </div>
              </div>
            )}

            {asset.ai_analysis && !analysis && (
              <div className="mt-4 bg-slate-900 border border-slate-800 rounded-2xl p-5 text-sm">
                <div className="text-emerald-500 text-xs font-semibold mb-2 tracking-widest">URSPRÜNGLICHE KI-ANALYSE</div>
                <div className="text-slate-300">
                  {asset.ai_analysis.category && <div>Kategorie: {asset.ai_analysis.category}</div>}
                  {asset.ai_suggested_fields?.manufacturer && <div>Hersteller: {asset.ai_suggested_fields.manufacturer}</div>}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Edit Form */}
        <div className="lg:col-span-3">
          <div className="card p-5 sm:p-6 lg:p-8">
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3">
              <Edit className="w-6 h-6 text-emerald-500" /> Anlage bearbeiten
            </h2>

            <div className="space-y-8">
              {/* Object & Basic */}
              <div>
                <label className="text-sm text-slate-300 block mb-2">Zugehöriges Objekt</label>
                <select 
                  name="object_id" 
                  value={formData.object_id} 
                  onChange={handleInputChange} 
                  className="input w-full"
                >
                  <option value="">— Objekt wählen —</option>
                  {objects.map(o => (
                    <option key={o.id} value={o.id}>{o.name} {o.city && `(${o.city})`}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm text-slate-300 block mb-2">Name der Anlage *</label>
                  <input 
                    name="name" 
                    value={formData.name} 
                    onChange={handleInputChange} 
                    className="input w-full text-lg font-medium" 
                    placeholder="z.B. Balkonkraftwerk Südseite" 
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-300 block mb-2">Kategorie</label>
                  <select 
                    name="category" 
                    value={formData.category} 
                    onChange={handleInputChange} 
                    className="input w-full"
                  >
                    <option value="Balkonkraftwerk">Balkonkraftwerk</option>
                    <option value="Wärmepumpe">Wärmepumpe</option>
                    <option value="Entsalzungsanlage">Entsalzungsanlage</option>
                    <option value="Wärmespeicher">Wärmespeicher</option>
                    <option value="Filteranlage">Filteranlage</option>
                    <option value="Wallbox">Wallbox</option>
                    <option value="Starlink">Starlink</option>
                    <option value="Sonstiges">Sonstiges</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <label className="text-sm text-slate-300 block mb-2">Hersteller</label>
                  <input name="manufacturer" value={formData.manufacturer} onChange={handleInputChange} className="input w-full" placeholder="Anker, Viessmann..." />
                </div>
                <div>
                  <label className="text-sm text-slate-300 block mb-2">Modell</label>
                  <input name="model" value={formData.model} onChange={handleInputChange} className="input w-full" placeholder="Solarbank 2 E1600" />
                </div>
                <div>
                  <label className="text-sm text-slate-300 block mb-2">Seriennummer</label>
                  <input name="serial_number" value={formData.serial_number} onChange={handleInputChange} className="input w-full" placeholder="SN-2024-78421" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div>
                  <label className="text-sm text-slate-300 block mb-2">Baujahr</label>
                  <input type="number" name="year_built" value={formData.year_built} onChange={handleInputChange} className="input w-full" placeholder="2024" />
                </div>
                <div>
                  <label className="text-sm text-slate-300 block mb-2">Leistung / Kapazität</label>
                  <input name="capacity" value={formData.capacity} onChange={handleInputChange} className="input w-full" placeholder="5.2 kWp / 300 L" />
                </div>
                <div>
                  <label className="text-sm text-slate-300 block mb-2">Filtertyp</label>
                  <input name="filter_type" value={formData.filter_type} onChange={handleInputChange} className="input w-full" placeholder="Sediment 10µm" />
                </div>
                <div>
                  <label className="text-sm text-slate-300 block mb-2">Wartungsintervall (Monate)</label>
                  <div className="flex gap-2">
                    <input 
                      type="number" 
                      name="maintenance_interval_months" 
                      value={formData.maintenance_interval_months} 
                      onChange={handleInputChange} 
                      className="input w-full" 
                    />
                    <button 
                      type="button" 
                      onClick={calculateNextMaintenance} 
                      className="px-4 text-xs border border-emerald-900/50 text-emerald-400 hover:bg-emerald-950 rounded-2xl whitespace-nowrap"
                    >
                      Nächste berechnen
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="text-sm text-slate-300 block mb-2">Letzte Wartung</label>
                  <input 
                    type="date" 
                    name="last_maintenance" 
                    value={formData.last_maintenance} 
                    onChange={handleInputChange} 
                    className="input w-full" 
                  />
                </div>
                <div>
                  <label className="text-sm text-slate-300 block mb-2">Nächste Wartung fällig</label>
                  <input 
                    type="date" 
                    name="next_maintenance_due" 
                    value={formData.next_maintenance_due} 
                    onChange={handleInputChange} 
                    className="input w-full" 
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-slate-300 block mb-2">Notizen &amp; Besonderheiten</label>
                <textarea 
                  name="notes" 
                  value={formData.notes} 
                  onChange={handleInputChange} 
                  className="input w-full min-h-[120px]" 
                  placeholder="z.B. Standort: Südseite Dach, 2. Stock • Besonderheit: Smart-Monitoring installiert" 
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Maintenance History */}
      <div className="mt-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-semibold tracking-tight flex items-center gap-3">
            <Calendar className="w-8 h-8 text-emerald-500" /> Wartungshistorie
          </h2>
          <button 
            onClick={logMaintenance} 
            className="btn-secondary flex items-center gap-2 px-5 py-2 text-sm"
          >
            + Wartung heute protokollieren
          </button>
        </div>

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800 text-left text-sm text-slate-400">
                  <th className="px-6 py-4 font-normal">Datum</th>
                  <th className="px-6 py-4 font-normal">Beschreibung</th>
                  <th className="px-6 py-4 font-normal">Durchgeführt von</th>
                  <th className="px-6 py-4 font-normal">Notizen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-sm">
                {maintenanceHistory.length > 0 ? (
                  maintenanceHistory.map((entry, index) => (
                    <tr key={index} className="hover:bg-slate-900/50 transition">
                      <td className="px-6 py-4 font-medium text-emerald-400">{new Date(entry.date).toLocaleDateString('de-DE')}</td>
                      <td className="px-6 py-4 text-white">{entry.description}</td>
                      <td className="px-6 py-4 text-slate-400">{entry.performed_by}</td>
                      <td className="px-6 py-4 text-slate-400 max-w-xs truncate">{entry.notes}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                      Noch keine Wartungshistorie vorhanden.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        <p className="text-xs text-slate-500 mt-3 text-center">Wartungen werden in der Datenbank protokolliert und sind hier dauerhaft gespeichert.</p>
      </div>

      {/* Verknüpfte Termine (echte Liste) */}
      <div className="mt-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-semibold tracking-tight flex items-center gap-3">
            <Calendar className="w-8 h-8 text-emerald-500" /> Verknüpfte Termine
          </h2>
          <Link href="/dashboard/appointments/new" className="btn-secondary text-sm px-5 py-2 flex items-center gap-2">
            <Plus className="w-4 h-4" /> Neuen Termin anfragen
          </Link>
        </div>

        {appointments.length > 0 ? (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-left text-slate-400">
                    <th className="px-6 py-4 font-normal">Service</th>
                    <th className="px-6 py-4 font-normal">Datum</th>
                    <th className="px-6 py-4 font-normal">Uhrzeit</th>
                    <th className="px-6 py-4 font-normal">Status</th>
                    <th className="px-6 py-4 font-normal text-right">Aktion</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {appointments.map((appt: any) => {
                    const statusInfo = appt.status === 'completed' 
                      ? { label: 'Abgeschlossen', bg: 'bg-emerald-600/20 text-emerald-400' }
                      : appt.status === 'confirmed' 
                        ? { label: 'Bestätigt', bg: 'bg-emerald-600/20 text-emerald-400' }
                        : { label: 'Angefragt', bg: 'bg-amber-600/20 text-amber-400' }
                    return (
                      <tr key={appt.id} className="hover:bg-slate-900/50">
                        <td className="px-6 py-4 font-medium text-white">{appt.service_type}</td>
                        <td className="px-6 py-4 text-slate-400">
                          {appt.preferred_date
                            ? new Date(appt.preferred_date).toLocaleDateString('de-DE')
                            : 'Noch offen'}
                        </td>
                        <td className="px-6 py-4 text-slate-400">{appt.time_window || '—'}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusInfo.bg}`}>
                            {statusInfo.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <Link href={`/dashboard/appointments/${appt.id}`} className="text-emerald-400 hover:underline text-xs">
                            Details →
                          </Link>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="card p-6 text-center text-sm text-slate-400 sm:p-8 sm:text-base">
            Keine Termine für dieses Objekt vorhanden.
            <div className="mt-4">
              <Link href="/dashboard/appointments/new" className="text-emerald-400 hover:underline">→ Neuen Termin anfragen</Link>
            </div>
          </div>
        )}
      </div>

      {/* Dokumente & Berichte (Platzhalter) */}
      <div className="mt-10 grid md:grid-cols-2 gap-8">
        <div className="card p-6">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-500" /> Dokumente &amp; Berichte
          </h3>
          <p className="text-sm text-slate-400">Angebote, Rechnungen und Serviceberichte zu dieser Anlage.</p>
          <div className="mt-4">
            <Link href="/dashboard/documents" className="text-emerald-400 hover:underline text-sm">→ Alle Dokumente ansehen</Link>
          </div>
        </div>
        <div className="card p-6">
          <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-emerald-500" /> Weitere Aktionen
          </h3>
          <div className="text-sm text-slate-400 space-y-2">
            <div>• Wartungsintervall anpassen</div>
            <div>• Aus Bild erneut auswerten</div>
            <div>• Bild aktualisieren</div>
          </div>
        </div>
      </div>

      <div className="h-20"></div>
    </div>
  )
}
