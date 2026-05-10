'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Home, MapPin, Plus, Edit, Trash2, Calendar, Wrench, FileText, Save } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getOrCreateProfileId } from '@/lib/supabase/ensure-profile'

interface ObjectItem {
  id: string
  name: string
  street: string | null
  postal_code: string | null
  city: string | null
  notes: string | null
  created_at: string
  updated_at: string | null
}

interface Asset {
  id: string
  name: string
  category: string
  image_url: string | null
  next_maintenance_due: string | null
}

interface Appointment {
  id: string
  service_type: string
  preferred_date: string
  status: string
}

interface Document {
  id: string
  type: string
  title: string
  file_url: string
  created_at: string
}

export default function ObjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [object, setObject] = useState<ObjectItem | null>(null)
  const [assets, setAssets] = useState<Asset[]>([])
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    street: '',
    postal_code: '',
    city: '',
    notes: ''
  })

  useEffect(() => {
    async function fetchData() {
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

      // Fetch object
      const { data: objectData, error: objectError } = await supabase
        .from('objects')
        .select('*')
        .eq('id', id)
        .eq('profile_id', pid)
        .maybeSingle()

      if (objectError || !objectData) {
        setError('Objekt nicht gefunden oder keine Berechtigung')
        setLoading(false)
        return
      }

      setObject(objectData as ObjectItem)
      setEditForm({
        name: objectData.name || '',
        street: objectData.street || '',
        postal_code: objectData.postal_code || '',
        city: objectData.city || '',
        notes: objectData.notes || ''
      })

      // Fetch related assets
      const { data: assetsData } = await supabase
        .from('assets')
        .select('id, name, category, image_url, next_maintenance_due')
        .eq('object_id', id)
        .order('created_at', { ascending: false })
        .limit(6)

      setAssets((assetsData as Asset[]) || [])

      // Fetch related appointments
      const { data: appointmentsData } = await supabase
        .from('appointments')
        .select('id, service_type, preferred_date, status')
        .eq('object_id', id)
        .order('preferred_date', { ascending: true })
        .limit(5)

      setAppointments((appointmentsData as Appointment[]) || [])

      // Fetch related documents
      const { data: documentsData } = await supabase
        .from('documents')
        .select('id, type, title, file_url, created_at')
        .eq('object_id', id)
        .order('created_at', { ascending: false })
        .limit(5)

      setDocuments((documentsData as Document[]) || [])

      setLoading(false)
    }

    fetchData()
  }, [id, router, supabase])

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleCancelEdit = () => {
    if (object) {
      setEditForm({
        name: object.name || '',
        street: object.street || '',
        postal_code: object.postal_code || '',
        city: object.city || '',
        notes: object.notes || ''
      })
    }
    setIsEditing(false)
  }

  const handleSaveEdit = async () => {
    if (!object) return

    try {
      const { error } = await supabase
        .from('objects')
        .update({
          name: editForm.name,
          street: editForm.street || null,
          postal_code: editForm.postal_code || null,
          city: editForm.city || null,
          notes: editForm.notes || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', object.id)

      if (error) throw error

      // Refresh object
      const { data: updatedObject } = await supabase
        .from('objects')
        .select('*')
        .eq('id', object.id)
        .single()

      if (updatedObject) {
        setObject(updatedObject as ObjectItem)
      }

      setIsEditing(false)
      alert('✅ Objekt erfolgreich aktualisiert!')
    } catch (err: any) {
      console.error(err)
      alert('Fehler beim Speichern: ' + (err.message || 'Unbekannt'))
    }
  }

  const handleDelete = async () => {
    if (!object || !confirm('Möchten Sie dieses Objekt wirklich löschen? Alle verknüpften Anlagen, Termine und Dokumente bleiben erhalten, aber das Objekt wird entfernt.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('objects')
        .delete()
        .eq('id', object.id)

      if (error) throw error

      alert('✅ Objekt wurde gelöscht.')
      router.push('/dashboard/objects')
    } catch (err: any) {
      console.error(err)
      alert('Fehler beim Löschen: ' + (err.message || 'Unbekannt'))
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setEditForm(prev => ({ ...prev, [name]: value }))
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-12 text-center">
        <div className="mx-auto mb-3 h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent"></div>
        <p className="text-sm text-slate-400">Objekt wird geladen...</p>
      </div>
    )
  }

  if (error || !object) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-4 sm:py-6">
        <Link href="/dashboard/objects" className="mb-5 flex items-center gap-2 text-slate-400 hover:text-white sm:mb-6">
          <ArrowLeft className="h-4 w-4 shrink-0" /> Zurück zu Meine Objekte
        </Link>
        <div className="card p-6 text-center sm:p-10 lg:p-12">
          <Home className="mx-auto mb-5 h-14 w-14 text-red-500 sm:mb-6 sm:h-16 sm:w-16" />
          <h1 className="mb-3 text-2xl font-semibold sm:mb-4 sm:text-3xl">Objekt nicht gefunden</h1>
          <p className="mb-6 text-sm text-slate-400 sm:mb-8 sm:text-base">
            {error || 'Das angeforderte Objekt existiert nicht oder Sie haben keine Zugriffsberechtigung.'}
          </p>
          <Link href="/dashboard/objects" className="btn-primary">
            Zurück zur Übersicht
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-5 sm:mb-8 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <Link href="/dashboard/objects" className="mb-2 flex items-center gap-2 text-sm text-slate-400 hover:text-white">
            <ArrowLeft className="h-4 w-4 shrink-0" /> Zurück zu Meine Objekte
          </Link>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-600/10 sm:h-14 sm:w-14">
              <Home className="h-7 w-7 text-emerald-500 sm:h-8 sm:w-8" />
            </div>
            <div className="min-w-0">
              <h1 className="break-words text-3xl font-semibold tracking-tighter sm:text-4xl lg:text-5xl">{object.name}</h1>
              {(object.street || object.city) && (
                <div className="mt-1 flex items-start gap-2 text-base text-slate-400 sm:items-center sm:text-lg">
                  <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-slate-500 sm:mt-0" />
                  <span className="break-words">
                    {[object.street, object.postal_code, object.city].filter(Boolean).join(', ')}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap lg:shrink-0">
          {!isEditing && (
            <>
              <button
                type="button"
                onClick={handleEdit}
                className="btn-secondary flex w-full items-center justify-center gap-2 sm:w-auto"
              >
                <Edit className="h-4 w-4 shrink-0" /> Bearbeiten
              </button>
              <button
                type="button"
                onClick={handleDelete}
                className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-900/50 px-4 py-2.5 text-sm text-red-400 transition hover:bg-red-950/50 hover:text-red-300 sm:w-auto sm:py-3"
              >
                <Trash2 className="h-4 w-4 shrink-0" /> Löschen
              </button>
            </>
          )}
          {isEditing && (
            <>
              <button type="button" onClick={handleCancelEdit} className="btn-secondary w-full sm:w-auto">
                Abbrechen
              </button>
              <button type="button" onClick={handleSaveEdit} className="btn-primary flex w-full items-center justify-center gap-2 sm:w-auto">
                <Save className="h-4 w-4 shrink-0" /> Speichern
              </button>
            </>
          )}
        </div>
      </div>

      {/* Edit Form */}
      {isEditing && (
        <div className="card mb-6 p-5 sm:mb-8 sm:p-6 lg:p-8">
          <h2 className="mb-4 text-xl font-semibold sm:mb-6 sm:text-2xl">Objekt bearbeiten</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="text-sm text-slate-300 block mb-2">Name des Objekts *</label>
              <input 
                type="text" 
                name="name" 
                value={editForm.name} 
                onChange={handleInputChange}
                className="input w-full text-base sm:text-lg"
                placeholder="z.B. Eigenheim Wiesloch"
              />
            </div>
            <div>
              <label className="text-sm text-slate-300 block mb-2">Straße</label>
              <input 
                type="text" 
                name="street" 
                value={editForm.street} 
                onChange={handleInputChange}
                className="input w-full" 
                placeholder="Sandbrunnenweg 39" 
              />
            </div>
            <div>
              <label className="text-sm text-slate-300 block mb-2">PLZ</label>
              <input 
                type="text" 
                name="postal_code" 
                value={editForm.postal_code} 
                onChange={handleInputChange}
                className="input w-full" 
                placeholder="69168" 
              />
            </div>
            <div>
              <label className="text-sm text-slate-300 block mb-2">Stadt</label>
              <input 
                type="text" 
                name="city" 
                value={editForm.city} 
                onChange={handleInputChange}
                className="input w-full" 
                placeholder="Wiesloch" 
              />
            </div>
          </div>
          <div className="mt-6">
            <label className="text-sm text-slate-300 block mb-2">Notizen / Besonderheiten</label>
            <textarea 
              name="notes" 
              value={editForm.notes} 
              onChange={handleInputChange}
              className="input w-full min-h-[100px]" 
              placeholder="z.B. Zweifamilienhaus, Garten vorhanden, PV-Anlage seit 2023..." 
            />
          </div>
        </div>
      )}

      {/* Info Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6 lg:mb-10">
        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-emerald-600/10 rounded-xl flex items-center justify-center">
              <Home className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <div className="text-sm text-slate-400">Objekt-Typ</div>
              <div className="font-semibold">Immobilie</div>
            </div>
          </div>
          <div className="text-xs text-slate-500">Erstellt am {new Date(object.created_at).toLocaleDateString('de-DE')}</div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-emerald-600/10 rounded-xl flex items-center justify-center">
              <MapPin className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="flex-1">
              <div className="text-sm text-slate-400">Adresse</div>
              <div className="font-semibold text-sm leading-tight">
                {object.street ? `${object.street}, ` : ''}
                {object.postal_code} {object.city || '—'}
              </div>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-emerald-600/10 rounded-xl flex items-center justify-center">
              <Wrench className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <div className="text-sm text-slate-400">Verknüpfte Anlagen</div>
              <div className="font-semibold text-3xl tabular-nums">{assets.length}</div>
            </div>
          </div>
          <div className="text-xs text-emerald-400">Wartungsintensiv</div>
        </div>
      </div>

      {/* Related Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Anlagen */}
        <div className="lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <Wrench className="w-6 h-6 text-emerald-500" /> Anlagen
            </h2>
            <Link 
              href={`/dashboard/assets/new?object_id=${object.id}`}
              className="text-sm text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> Hinzufügen
            </Link>
          </div>

          {assets.length > 0 ? (
            <div className="space-y-3">
              {assets.map((asset) => (
                <Link 
                  key={asset.id} 
                  href={`/dashboard/assets/${asset.id}`}
                  className="card p-4 hover:border-emerald-500/50 transition-all flex gap-4 group block"
                >
                  <div className="flex-1">
                    <div className="font-semibold group-hover:text-emerald-400 transition-colors">{asset.name}</div>
                    <div className="text-sm text-slate-400">{asset.category}</div>
                    {asset.next_maintenance_due && (
                      <div className="text-xs text-amber-400 mt-1">
                        Nächste Wartung: {new Date(asset.next_maintenance_due).toLocaleDateString('de-DE')}
                      </div>
                    )}
                  </div>
                  {asset.image_url && (
                    <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
                      <img src={asset.image_url} alt={asset.name} className="w-full h-full object-cover" />
                    </div>
                  )}
                </Link>
              ))}
            </div>
          ) : (
            <div className="card p-6 text-center text-sm text-slate-400 sm:p-8 sm:text-base">
              <Wrench className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Noch keine Anlagen für dieses Objekt.</p>
              <Link href={`/dashboard/assets/new?object_id=${object.id}`} className="text-emerald-400 text-sm mt-2 inline-block">→ Erste Anlage hinzufügen</Link>
            </div>
          )}
        </div>

        {/* Termine */}
        <div className="lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <Calendar className="w-6 h-6 text-emerald-500" /> Termine
            </h2>
            <Link 
              href={`/dashboard/appointments/new?object_id=${object.id}`}
              className="text-sm text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> Anfragen
            </Link>
          </div>

          {appointments.length > 0 ? (
            <div className="space-y-3">
              {appointments.map((appt) => (
                <Link 
                  key={appt.id} 
                  href={`/dashboard/appointments/${appt.id}`}
                  className="card p-4 hover:border-emerald-500/50 transition-all block"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-semibold">{appt.service_type}</div>
                      <div className="text-sm text-slate-400">
                        {appt.preferred_date
                          ? new Date(appt.preferred_date).toLocaleDateString('de-DE')
                          : 'Termin noch offen'}
                      </div>
                    </div>
                    <div className={`px-2 py-0.5 rounded text-xs font-medium ${
                      appt.status === 'completed' ? 'bg-emerald-600/20 text-emerald-400' :
                      appt.status === 'confirmed' ? 'bg-blue-600/20 text-blue-400' :
                      'bg-amber-600/20 text-amber-400'
                    }`}>
                      {appt.status === 'completed' ? 'Erledigt' : 
                       appt.status === 'confirmed' ? 'Bestätigt' : 'Angefragt'}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="card p-6 text-center text-sm text-slate-400 sm:p-8 sm:text-base">
              <Calendar className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Keine Termine für dieses Objekt.</p>
              <Link href={`/dashboard/appointments/new?object_id=${object.id}`} className="text-emerald-400 text-sm mt-2 inline-block">→ Termin anfragen</Link>
            </div>
          )}
        </div>

        {/* Dokumente */}
        <div className="lg:col-span-1">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <FileText className="w-6 h-6 text-emerald-500" /> Dokumente
            </h2>
            <Link 
              href={`/dashboard/documents/new?object_id=${object.id}`}
              className="text-sm text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              <Plus className="w-4 h-4" /> Datei hochladen
            </Link>
          </div>

          {documents.length > 0 ? (
            <div className="space-y-3">
              {documents.map((doc) => (
                <a 
                  key={doc.id} 
                  href={doc.file_url} 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="card p-4 hover:border-emerald-500/50 transition-all flex items-center gap-3 group block"
                >
                  <div className="w-10 h-10 bg-emerald-600/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-emerald-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate group-hover:text-emerald-400 transition-colors">{doc.title}</div>
                    <div className="text-xs text-slate-400 flex items-center gap-1">
                      {doc.type === 'invoice'
                        ? 'Rechnung'
                        : doc.type === 'offer'
                          ? 'Angebot'
                          : doc.type === 'report'
                            ? 'Servicebericht'
                            : doc.type === 'customer_upload'
                              ? 'Kunden-Datei'
                              : doc.type === 'other'
                                ? 'Andere'
                              : doc.type}{' '}
                      • {new Date(doc.created_at).toLocaleDateString('de-DE')}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="card p-6 text-center text-sm text-slate-400 sm:p-8 sm:text-base">
              <FileText className="w-10 h-10 mx-auto mb-3 opacity-50" />
              <p className="text-sm">Keine Dokumente für dieses Objekt.</p>
              <Link href={`/dashboard/documents/new?object_id=${object.id}`} className="text-emerald-400 text-sm mt-2 inline-block">→ Eigene Datei hochladen</Link>
            </div>
          )}
        </div>
      </div>

      <div className="mt-12 text-center text-xs text-slate-500">
        Tipp: Über die Schnellzugriffe können Sie direkt neue Anlagen, Termine oder Dokumente für dieses Objekt anlegen.
      </div>
    </div>
  )
}
