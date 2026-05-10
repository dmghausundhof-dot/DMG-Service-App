'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, Clock, AlertTriangle, CheckCircle, MapPin, Loader2, Save, X, Edit2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import DeleteConfirmation from '@/components/DeleteConfirmation'

interface Appointment {
  id: string
  service_type: string
  preferred_date: string
  time_window: string | null
  urgency: string
  status: string
  description: string | null
  customer_notes: string | null
  object_id: string
  objects: {
    name: string
    city: string | null
  } | null
  proposed_preferred_date?: string | null
  proposed_time_window?: string | null
  reschedule_reason?: string | null
  reschedule_requested_at?: string | null
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'completed':
      return { label: 'Abgeschlossen', bg: 'bg-emerald-600/20 text-emerald-400 border-emerald-900/50', icon: CheckCircle }
    case 'in_progress':
      return { label: 'In Bearbeitung', bg: 'bg-blue-600/20 text-blue-400 border-blue-900/50', icon: Clock }
    case 'confirmed':
      return { label: 'Bestätigt', bg: 'bg-emerald-600/20 text-emerald-400 border-emerald-900/50', icon: CheckCircle }
    case 'cancelled':
      return { label: 'Storniert', bg: 'bg-red-600/20 text-red-400 border-red-900/50', icon: AlertTriangle }
    case 'reschedule_requested':
      return { label: 'Änderung angefragt', bg: 'bg-purple-600/20 text-purple-400 border-purple-900/50', icon: Clock }
    case 'rescheduled':
      return { label: 'Verschoben', bg: 'bg-blue-600/20 text-blue-400 border-blue-900/50', icon: Calendar }
    default:
      return { label: 'Angefragt', bg: 'bg-amber-600/20 text-amber-400 border-amber-900/50', icon: Calendar }
  }
}

function getUrgencyBadge(urgency: string) {
  switch (urgency) {
    case 'emergency':
      return { label: 'Notfall', bg: 'bg-red-600/20 text-red-400' }
    case 'high':
      return { label: 'Hoch', bg: 'bg-orange-600/20 text-orange-400' }
    default:
      return { label: 'Normal', bg: 'bg-slate-600/20 text-slate-400' }
  }
}

export default function AppointmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [appointment, setAppointment] = useState<Appointment | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Modals
  const [showRescheduleModal, setShowRescheduleModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)

  // Reschedule form
  const [newDate, setNewDate] = useState('')
  const [newTimeWindow, setNewTimeWindow] = useState('')
  const [rescheduleReason, setRescheduleReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    async function fetchAppointment() {
      if (!id) return
      setLoading(true)
      setError('')

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login')
        return
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (!profile) {
        setError('Profil nicht gefunden')
        setLoading(false)
        return
      }

      const { data: apptData, error: fetchError } = await supabase
        .from('appointments')
        .select(`
          *, 
          objects (name, city)
        `)
        .eq('id', id)
        .single()

      if (fetchError || !apptData) {
        setError('Termin nicht gefunden oder Sie haben keine Berechtigung.')
        setLoading(false)
        return
      }

      setAppointment(apptData as Appointment)
      setLoading(false)
    }

    fetchAppointment()
  }, [id, router, supabase])

  const handleReschedule = async () => {
    if (!appointment || !newDate || !rescheduleReason.trim()) {
      alert('Bitte Datum und Begründung angeben.')
      return
    }

    setIsSubmitting(true)

    try {
      const { error } = await supabase
        .from('appointments')
        .update({
          status: 'reschedule_requested',
          proposed_preferred_date: newDate,
          proposed_time_window: newTimeWindow || null,
          reschedule_reason: rescheduleReason.trim(),
          reschedule_requested_at: new Date().toISOString()
        })
        .eq('id', appointment.id)

      if (error) throw error

      alert('✅ Änderungsanfrage wurde erfolgreich gesendet! DMG Service wird sich bei Ihnen melden.')

      // Refresh data
      const { data: updated } = await supabase
        .from('appointments')
        .select(`*, objects (name, city)`)
        .eq('id', appointment.id)
        .single()

      if (updated) setAppointment(updated as Appointment)

      setShowRescheduleModal(false)
      setNewDate('')
      setNewTimeWindow('')
      setRescheduleReason('')
    } catch (err: any) {
      console.error(err)
      alert('Fehler beim Senden der Anfrage: ' + (err.message || 'Unbekannt'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleWithdrawReschedule = async () => {
    if (!appointment) return

    if (!confirm('Möchten Sie die Änderungsanfrage zurückziehen?')) return

    try {
      const { error } = await supabase
        .from('appointments')
        .update({
          status: 'confirmed', // Zurück zu bestätigt (angenommen es war bestätigt)
          proposed_preferred_date: null,
          proposed_time_window: null,
          reschedule_reason: null,
          reschedule_requested_at: null
        })
        .eq('id', appointment.id)

      if (error) throw error

      alert('✅ Änderungsanfrage wurde zurückgezogen.')

      const { data: updated } = await supabase
        .from('appointments')
        .select(`*, objects (name, city)`)
        .eq('id', appointment.id)
        .single()

      if (updated) setAppointment(updated as Appointment)
    } catch (err: any) {
      alert('Fehler: ' + (err.message || 'Unbekannt'))
    }
  }

  const handleCancel = async () => {
    if (!appointment) return

    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', appointment.id)

      if (error) throw error

      alert('✅ Termin wurde storniert.')

      const { data: updated } = await supabase
        .from('appointments')
        .select(`*, objects (name, city)`)
        .eq('id', appointment.id)
        .single()

      if (updated) setAppointment(updated as Appointment)
    } catch (err: any) {
      alert('Fehler beim Stornieren: ' + (err.message || 'Unbekannt'))
    }
  }

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto p-8 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-500" />
        <p className="mt-4 text-slate-400">Termin wird geladen...</p>
      </div>
    )
  }

  if (error || !appointment) {
    return (
      <div className="max-w-5xl mx-auto p-8">
        <Link href="/dashboard/appointments" className="flex items-center gap-2 text-slate-400 hover:text-white mb-6">
          <ArrowLeft className="w-4 h-4" /> Zurück zu Terminen
        </Link>
        <div className="card p-12 text-center">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-6" />
          <h1 className="text-3xl font-semibold mb-4">Termin nicht gefunden</h1>
          <p className="text-slate-400 mb-8">{error || 'Der angeforderte Termin existiert nicht oder Sie haben keine Zugriffsberechtigung.'}</p>
          <Link href="/dashboard/appointments" className="btn-primary">Zurück zur Übersicht</Link>
        </div>
      </div>
    )
  }

  const statusInfo = getStatusBadge(appointment.status)
  const StatusIcon = statusInfo.icon
  const urgencyInfo = getUrgencyBadge(appointment.urgency)

  const isRescheduleRequested = appointment.status === 'reschedule_requested'
  const canModify = !['completed', 'cancelled'].includes(appointment.status)

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <Link href="/dashboard/appointments" className="flex items-center gap-2 text-slate-400 hover:text-white mb-2">
            <ArrowLeft className="w-4 h-4" /> Zurück zu Terminen
          </Link>
          <h1 className="text-5xl font-semibold tracking-tighter flex items-center gap-4">
            {appointment.service_type}
            <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium border ${statusInfo.bg}`}>
              <StatusIcon className="w-4 h-4" />
              {statusInfo.label}
            </div>
          </h1>
          <p className="text-xl text-slate-400 mt-2 flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            {appointment.objects?.name} {appointment.objects?.city && `• ${appointment.objects.city}`}
          </p>
        </div>

        {canModify && (
          <div className="flex gap-3">
            <button 
              onClick={() => setShowRescheduleModal(true)}
              className="btn-secondary flex items-center gap-2 px-6 py-3"
            >
              <Edit2 className="w-4 h-4" /> Termin ändern
            </button>
            <button 
              onClick={() => setShowCancelModal(true)}
              className="px-6 py-3 border border-red-900/50 text-red-400 hover:bg-red-950/50 hover:text-red-300 rounded-2xl transition flex items-center gap-2"
            >
              <AlertTriangle className="w-4 h-4" /> Stornieren
            </button>
          </div>
        )}
      </div>

      {/* Reschedule Requested Banner */}
      {isRescheduleRequested && (
        <div className="card p-6 mb-8 border-purple-900/50 bg-purple-950/20">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-purple-600/10 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Clock className="w-6 h-6 text-purple-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg text-purple-400 mb-1">Änderungsanfrage gesendet</h3>
              <p className="text-slate-400 mb-3">
                Ihre Anfrage zur Terminverschiebung wurde an DMG Service übermittelt. Wir melden uns schnellstmöglich bei Ihnen.
              </p>
              {appointment.proposed_preferred_date && (
                <div className="text-sm bg-purple-950/50 p-3 rounded-xl mb-3">
                  <div><strong>Gewünschtes Datum:</strong> {new Date(appointment.proposed_preferred_date).toLocaleDateString('de-DE')}</div>
                  {appointment.proposed_time_window && <div><strong>Gewünschtes Zeitfenster:</strong> {appointment.proposed_time_window}</div>}
                  {appointment.reschedule_reason && <div className="mt-1"><strong>Begründung:</strong> {appointment.reschedule_reason}</div>}
                </div>
              )}
              <button 
                onClick={handleWithdrawReschedule}
                className="text-sm text-purple-400 hover:text-purple-300 underline"
              >
                Anfrage zurückziehen
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-8">
          <div className="card p-8">
            <h2 className="text-2xl font-semibold mb-6 flex items-center gap-3">
              <Calendar className="w-6 h-6 text-emerald-500" /> Termin Details
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <div className="text-xs text-slate-500 mb-1.5">GEWÜNSCHTES DATUM</div>
                <div className="text-2xl font-semibold">
                  {new Date(appointment.preferred_date).toLocaleDateString('de-DE', { 
                    weekday: 'long', 
                    day: 'numeric', 
                    month: 'long',
                    year: 'numeric'
                  })}
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-500 mb-1.5">ZEITFENSTER</div>
                <div className="text-2xl font-semibold flex items-center gap-2">
                  <Clock className="w-6 h-6 text-emerald-500" />
                  {appointment.time_window || 'Nicht angegeben'}
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-500 mb-1.5">DRINGLICHKEIT</div>
                <div className={`inline-flex px-4 py-1.5 rounded-full text-sm font-medium border ${urgencyInfo.bg}`}>
                  {urgencyInfo.label}
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-500 mb-1.5">STATUS</div>
                <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium border ${statusInfo.bg}`}>
                  <StatusIcon className="w-4 h-4" />
                  {statusInfo.label}
                </div>
              </div>
            </div>

            {appointment.description && (
              <div className="mt-8 pt-8 border-t border-slate-800">
                <div className="text-xs text-slate-500 mb-1.5">BESCHREIBUNG / NOTIZEN</div>
                <p className="text-slate-300 whitespace-pre-wrap">{appointment.description}</p>
              </div>
            )}

            {appointment.customer_notes && (
              <div className="mt-8 pt-8 border-t border-slate-800">
                <div className="text-xs text-slate-500 mb-1.5">IHRE NOTIZ</div>
                <p className="text-slate-300 italic">"{appointment.customer_notes}"</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="card p-6">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-emerald-500" /> Objekt
            </h3>
            <div className="text-lg font-medium">{appointment.objects?.name}</div>
            {appointment.objects?.city && (
              <div className="text-slate-400">{appointment.objects.city}</div>
            )}
            <Link 
              href={`/dashboard/objects/${appointment.object_id}`} 
              className="text-emerald-400 text-sm mt-3 inline-block hover:underline"
            >
              Objekt-Details ansehen →
            </Link>
          </div>

          <div className="card p-6 text-sm text-slate-400">
            <div className="font-medium text-white mb-2">Hinweis</div>
            <p>Terminwünsche können bis 48 Stunden vor dem Termin kostenfrei geändert oder storniert werden. Danach gelten unsere AGB.</p>
          </div>
        </div>
      </div>

      {/* Reschedule Modal */}
      {showRescheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="card w-full max-w-lg p-8 relative">
            <button 
              onClick={() => setShowRescheduleModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 bg-emerald-600/10 rounded-2xl flex items-center justify-center">
                <Edit2 className="w-6 h-6 text-emerald-500" />
              </div>
              <div>
                <h2 className="text-3xl font-semibold tracking-tight">Termin ändern</h2>
                <p className="text-slate-400">Neuen Wunschtermin angeben</p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-sm text-slate-300 block mb-2">Neues Datum *</label>
                <input 
                  type="date" 
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="input w-full text-lg"
                  required
                />
              </div>

              <div>
                <label className="text-sm text-slate-300 block mb-2">Neues Zeitfenster</label>
                <select 
                  value={newTimeWindow}
                  onChange={(e) => setNewTimeWindow(e.target.value)}
                  className="input w-full"
                >
                  <option value="">-- Bitte wählen --</option>
                  <option value="Vormittag (08:00-12:00)">Vormittag (08:00-12:00)</option>
                  <option value="Nachmittag (13:00-17:00)">Nachmittag (13:00-17:00)</option>
                  <option value="14:00-16:00">14:00-16:00</option>
                  <option value="09:00-11:00">09:00-11:00</option>
                  <option value="16:00-18:00">16:00-18:00</option>
                  <option value="Anderes">Anderes (bitte im Grund angeben)</option>
                </select>
                <p className="text-xs text-slate-500 mt-1">Optional – aktuelles: {appointment.time_window || 'nicht angegeben'}</p>
              </div>

              <div>
                <label className="text-sm text-slate-300 block mb-2">Begründung für die Änderung *</label>
                <textarea 
                  value={rescheduleReason}
                  onChange={(e) => setRescheduleReason(e.target.value)}
                  placeholder="z.B. Urlaub, Arzttermin, Familie..."
                  className="input w-full min-h-[100px]"
                  required
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button 
                onClick={() => setShowRescheduleModal(false)}
                disabled={isSubmitting}
                className="btn-secondary flex-1 py-3.5"
              >
                Abbrechen
              </button>
              <button 
                onClick={handleReschedule}
                disabled={!newDate || !rescheduleReason.trim() || isSubmitting}
                className="btn-primary flex-1 py-3.5 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Wird gesendet...
                  </>
                ) : (
                  'Änderung anfragen'
                )}
              </button>
            </div>

            <p className="text-xs text-center text-slate-500 mt-4">
              DMG Service bestätigt die neue Zeit in der Regel innerhalb von 24 Stunden.
            </p>
          </div>
        </div>
      )}

      {/* Cancel Confirmation */}
      <DeleteConfirmation
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleCancel}
        title="Termin stornieren?"
        message="Der Termin wird endgültig storniert. Eine erneute Buchung ist jederzeit möglich."
        itemName={`${appointment.service_type} am ${new Date(appointment.preferred_date).toLocaleDateString('de-DE')}`}
        itemType="Termin"
        confirmButtonText="Ja, Termin stornieren"
      />
    </div>
  )
}
