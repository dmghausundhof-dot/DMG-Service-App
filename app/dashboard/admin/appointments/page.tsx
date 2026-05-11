'use client'

import { useState, useTransition, useEffect } from 'react'
import Link from 'next/link'
import {
  Calendar,
  Clock,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Loader2,
  ImageIcon,
  X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  completeAppointment,
  confirmAppointment,
  startAppointment,
  rejectAppointment,
  rejectReschedule,
  updateAdminNote,
} from './actions'
import {
  APPOINTMENT_TIME_SLOTS,
  parseStoredTimeWindow,
  timeToMinutes,
} from '@/lib/appointment-time-slots'
interface Appointment {
  id: string
  object_id: string
  service_type: string
  preferred_date: string | null
  time_window: string | null
  status: string
  description: string | null
  customer_notes: string | null
  admin_notes: string | null
  reschedule_reason: string | null
  proposed_preferred_date: string | null
  proposed_time_window: string | null
  reschedule_requested_at: string | null
  objects: {
    name: string
    city: string | null
  } | null
}

export default function AdminAppointmentsPage() {
  const [appointments, setAppointments] = useState<any[]>([])
  const [statusFilter, setStatusFilter] = useState<
    'all' | 'requested' | 'reschedule_requested' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'
  >('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [scheduleAppt, setScheduleAppt] = useState<Appointment | null>(null)
  const [scheduleDate, setScheduleDate] = useState('')
  const [scheduleTimeFrom, setScheduleTimeFrom] = useState('')
  const [scheduleTimeTo, setScheduleTimeTo] = useState('')
  const supabase = createClient()

  const scheduleEndSlots = scheduleTimeFrom
    ? APPOINTMENT_TIME_SLOTS.filter((s) => timeToMinutes(s) > timeToMinutes(scheduleTimeFrom))
    : []

  const openSchedule = (appt: Appointment) => {
    setScheduleAppt(appt)
    setScheduleDate(
      appt.proposed_preferred_date?.slice(0, 10) ||
        appt.preferred_date?.slice(0, 10) ||
        new Date().toISOString().split('T')[0],
    )
    const parsed = parseStoredTimeWindow(appt.proposed_time_window || appt.time_window || '')
    setScheduleTimeFrom(parsed.from)
    setScheduleTimeTo(parsed.to)
    setScheduleOpen(true)
  }

  const submitSchedule = () => {
    if (!scheduleAppt || !scheduleDate.trim()) {
      alert('Bitte ein Datum wählen.')
      return
    }
    const tf = scheduleTimeFrom.trim()
    const tt = scheduleTimeTo.trim()
    let time_window: string | null = null
    if (tf || tt) {
      if (!tf || !tt) {
        alert('Zeitfenster: „Von“ und „Bis“ vollständig wählen oder beides leer lassen.')
        return
      }
      if (timeToMinutes(tt) <= timeToMinutes(tf)) {
        alert('„Bis“ muss nach „Von“ liegen.')
        return
      }
      time_window = `${tf}-${tt}`
    }
    const id = scheduleAppt.id
    setPendingId(id)
    startTransition(async () => {
      try {
        const result = await confirmAppointment(id, {
          preferred_date: scheduleDate.trim(),
          time_window,
        })
        if (result?.success) {
          alert(result.message || 'Erfolgreich!')
          setScheduleOpen(false)
          setScheduleAppt(null)
          fetchAppointments()
        }
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : 'Ein Fehler ist aufgetreten')
      } finally {
        setPendingId(null)
      }
    })
  }

  const fetchAppointments = async () => {
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      setError('Bitte anmelden...')
      setLoading(false)
      return
    }

    const { data, error: fetchError } = await supabase
      .from('appointments')
      .select(`
        id, 
        object_id,
        service_type, 
        preferred_date, 
        time_window, 
        status, 
        description, 
        customer_notes,
        admin_notes,
        reschedule_reason,
        proposed_preferred_date,
        proposed_time_window,
        reschedule_requested_at,
        attachment_urls,
        asset_id,
        objects (name, city),
        assets (id, name, category, manufacturer, model)
      `)
      .order('created_at', { ascending: false })

    if (fetchError) {
      setError(`Fehler beim Laden der Termine: ${fetchError.message}`)
    } else {
      setAppointments(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchAppointments()
  }, [])

  const openRequests = appointments.filter(
    (a) => a.status === 'requested' || a.status === 'reschedule_requested',
  )
  const visibleAppointments =
    statusFilter === 'all'
      ? appointments
      : appointments.filter((a) => a.status === statusFilter)

  const statusBuckets = [
    { id: 'all', label: 'Alle' },
    { id: 'requested', label: 'Angefragt' },
    { id: 'reschedule_requested', label: 'Änderung angefragt' },
    { id: 'confirmed', label: 'Bestätigt' },
    { id: 'in_progress', label: 'In Bearbeitung' },
    { id: 'completed', label: 'Abgeschlossen' },
    { id: 'cancelled', label: 'Storniert' },
  ] as const

  const handleAction = async (action: () => Promise<any>, id: string) => {
    setPendingId(id)
    startTransition(async () => {
      try {
        const result = await action()
        if (result?.success) {
          alert(result.message || 'Erfolgreich!')
          fetchAppointments()
        }
      } catch (err: any) {
        alert(err.message || 'Ein Fehler ist aufgetreten')
      } finally {
        setPendingId(null)
      }
    })
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-12 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-500" />
        <p className="mt-3 text-sm text-slate-400">Lade offene Anfragen...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-10 text-center">
        <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-red-500" />
        <p className="text-sm text-red-400 sm:text-base">{error}</p>
        <button type="button" onClick={fetchAppointments} className="btn-secondary mt-4">
          Erneut versuchen
        </button>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 md:mb-8 md:flex-row md:items-center md:justify-between lg:mb-10">
        <div>
          <div className="mb-1.5 text-xs font-semibold tracking-[2px] text-emerald-500 sm:text-sm sm:mb-2">ADMIN BEREICH</div>
          <h1 className="text-3xl font-semibold tracking-tighter sm:text-4xl lg:text-5xl">Terminpipeline</h1>
          <p className="mt-2 text-base text-slate-400 sm:text-lg lg:text-xl">
            {openRequests.length} offene Anfragen • {appointments.length} Gesamt
          </p>
        </div>

        <Link href="/dashboard" className="btn-secondary flex w-full items-center justify-center gap-2 sm:w-fit">
          ← Zurück zum Dashboard
        </Link>
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {statusBuckets.map((bucket) => {
          const count =
            bucket.id === 'all'
              ? appointments.length
              : appointments.filter((a) => a.status === bucket.id).length
          const active = statusFilter === bucket.id
          return (
            <button
              key={bucket.id}
              type="button"
              onClick={() => setStatusFilter(bucket.id)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                active
                  ? 'border-emerald-500/60 bg-emerald-600/15 text-emerald-300'
                  : 'border-slate-700 bg-slate-900 text-slate-400 hover:border-slate-600 hover:text-slate-200'
              }`}
            >
              {bucket.label} ({count})
            </button>
          )
        })}
      </div>

      {visibleAppointments.length === 0 ? (
        <div className="card px-5 py-10 text-center sm:p-12 lg:p-16">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-600/10 sm:mb-6 sm:h-20 sm:w-20">
            <CheckCircle className="h-8 w-8 text-emerald-500 sm:h-10 sm:w-10" />
          </div>
          <h3 className="mb-3 text-2xl font-semibold sm:text-3xl">Keine Termine im gewählten Filter</h3>
          <p className="mx-auto max-w-md text-base text-slate-400 sm:text-lg">
            Bitte anderen Status wählen oder später erneut prüfen.
          </p>
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-6">
          {visibleAppointments.map((appt) => {
            const isReschedule = appt.status === 'reschedule_requested'

            return (
              <div key={appt.id} className="card p-5 transition-all group hover:border-emerald-500/30 sm:p-6 lg:p-8">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:gap-8">
                  {/* Main Info */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-semibold tracking-tight transition-colors group-hover:text-emerald-400 sm:text-2xl">
                            {appt.service_type}
                          </h3>
                          <div className={`px-3 py-1 rounded-full text-xs font-medium border ${
                            appt.status === 'completed'
                              ? 'bg-emerald-600/20 text-emerald-400 border-emerald-900/50'
                              : appt.status === 'in_progress'
                                ? 'bg-blue-600/20 text-blue-400 border-blue-900/50'
                                : appt.status === 'confirmed'
                                  ? 'bg-sky-600/20 text-sky-300 border-sky-900/50'
                                  : appt.status === 'cancelled'
                                    ? 'bg-red-600/20 text-red-400 border-red-900/50'
                                    : isReschedule
                                      ? 'bg-purple-600/20 text-purple-400 border-purple-900/50'
                                      : 'bg-amber-600/20 text-amber-400 border-amber-900/50'
                          }`}>
                            {appt.status === 'completed'
                              ? '✅ Abgeschlossen'
                              : appt.status === 'in_progress'
                                ? '🛠️ In Bearbeitung'
                                : appt.status === 'confirmed'
                                  ? '📅 Bestätigt'
                                  : appt.status === 'cancelled'
                                    ? '❌ Storniert'
                                    : isReschedule
                                      ? '🔄 Änderungswunsch'
                                      : '🆕 Neue Anfrage'}
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-400">
                          <Calendar className="w-4 h-4 shrink-0" />
                          {appt.preferred_date ? (
                            <>
                              {new Date(appt.preferred_date).toLocaleDateString('de-DE', {
                                weekday: 'long',
                                day: 'numeric',
                                month: 'long',
                              })}
                              {appt.time_window && (
                                <>
                                  <span className="mx-1">•</span>
                                  <Clock className="w-4 h-4" /> {appt.time_window}
                                </>
                              )}
                            </>
                          ) : (
                            <span className="text-amber-400/90">
                              Noch kein Termin gesetzt – beim Bestätigen Datum &amp; Zeit eintragen
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="text-sm mb-6">
                      <div className="text-xs text-slate-500 mb-1">OBJEKT</div>
                      <div className="font-medium">{appt.objects?.name} {appt.objects?.city && `• ${appt.objects.city}`}</div>
                    </div>

                    {(() => {
                      const la = appt.assets
                        ? Array.isArray(appt.assets)
                          ? appt.assets[0]
                          : appt.assets
                        : null
                      if (!la?.id) return null
                      return (
                        <div className="mb-6 rounded-2xl border border-slate-800 bg-slate-950/40 p-4 text-sm">
                          <div className="text-xs font-medium text-slate-500">VERKNÜPFTE ANLAGE</div>
                          <div className="mt-1 font-medium text-slate-200">
                            {la.name}
                            <span className="font-normal text-slate-500">
                              {' '}
                              ({[la.category, la.manufacturer, la.model].filter(Boolean).join(' · ')})
                            </span>
                          </div>
                          <Link
                            href={`/dashboard/assets/${la.id}`}
                            className="mt-2 inline-block text-xs text-emerald-400 hover:underline"
                          >
                            Anlage im System öffnen →
                          </Link>
                        </div>
                      )
                    })()}

                    {Array.isArray(appt.attachment_urls) && appt.attachment_urls.length > 0 && (
                      <div className="mb-3 inline-flex items-center gap-2 text-xs font-medium text-sky-400 bg-sky-950/40 border border-sky-900/50 px-3 py-1.5 rounded-full">
                        <ImageIcon className="w-3.5 h-3.5" />
                        {appt.attachment_urls.length} Foto(s) angehängt
                      </div>
                    )}

                    {appt.description && (
                      <div className="mb-4">
                        <div className="text-xs text-slate-500 mb-1">BESCHREIBUNG</div>
                        <p className="text-slate-300 text-sm line-clamp-2">{appt.description}</p>
                      </div>
                    )}

                    {isReschedule && appt.reschedule_reason && (
                      <div className="mb-4 p-4 bg-purple-950/30 border border-purple-900/50 rounded-2xl">
                        <div className="text-xs text-purple-400 mb-1">BEGRÜNDUNG FÜR ÄNDERUNG</div>
                        <p className="text-sm text-slate-300">{appt.reschedule_reason}</p>
                        {appt.proposed_preferred_date && (
                          <div className="mt-2 text-xs text-purple-400">
                            Gewünscht: {new Date(appt.proposed_preferred_date).toLocaleDateString('de-DE')}
                            {appt.proposed_time_window && ` • ${appt.proposed_time_window}`}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="lg:w-72 flex-shrink-0 space-y-3 pt-2">
                    <div className="text-xs text-slate-500 mb-2">AKTIONEN</div>
                    
                    {appt.status === 'requested' && (
                      <>
                        <button
                          type="button"
                          onClick={() => openSchedule(appt)}
                          disabled={pendingId === appt.id}
                          className="w-full btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {pendingId === appt.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                          Termin einplanen &amp; bestätigen
                        </button>
                        <button 
                          onClick={() => handleAction(() => rejectAppointment(appt.id), appt.id)}
                          disabled={pendingId === appt.id}
                          className="w-full px-6 py-3 border border-red-900/50 text-red-400 hover:bg-red-950/50 rounded-2xl transition flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                        >
                          {pendingId === appt.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />} 
                          Anfrage ablehnen
                        </button>
                      </>
                    )}

                    {isReschedule && (
                      <>
                        <button
                          type="button"
                          onClick={() => openSchedule(appt)}
                          disabled={pendingId === appt.id}
                          className="w-full btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {pendingId === appt.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                          Neuen Termin setzen &amp; abschließen
                        </button>
                        <button 
                          onClick={() => handleAction(() => rejectReschedule(appt.id), appt.id)}
                          disabled={pendingId === appt.id}
                          className="w-full px-6 py-3 border border-orange-900/50 text-orange-400 hover:bg-orange-950/50 rounded-2xl transition flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                        >
                          {pendingId === appt.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />} 
                          Änderung ablehnen
                        </button>
                      </>
                    )}

                    {(appt.status === 'confirmed' || appt.status === 'rescheduled') && (
                      <>
                        <button
                          type="button"
                          onClick={() => handleAction(() => startAppointment(appt.id), appt.id)}
                          disabled={pendingId === appt.id}
                          className="w-full rounded-2xl border border-blue-900/60 bg-blue-950/30 px-6 py-3 text-sm text-blue-300 transition hover:bg-blue-950/50 disabled:opacity-50"
                        >
                          {pendingId === appt.id ? (
                            <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Wird gestartet…</span>
                          ) : (
                            'Als in Bearbeitung starten'
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAction(() => completeAppointment(appt.id), appt.id)}
                          disabled={pendingId === appt.id}
                          className="w-full rounded-2xl border border-emerald-900/60 bg-emerald-950/30 px-6 py-3 text-sm text-emerald-300 transition hover:bg-emerald-950/50 disabled:opacity-50"
                        >
                          {pendingId === appt.id ? (
                            <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Wird abgeschlossen…</span>
                          ) : (
                            'Direkt abschließen'
                          )}
                        </button>
                      </>
                    )}

                    {appt.status === 'in_progress' && (
                      <button
                        type="button"
                        onClick={() => handleAction(() => completeAppointment(appt.id), appt.id)}
                        disabled={pendingId === appt.id}
                        className="w-full rounded-2xl border border-emerald-900/60 bg-emerald-950/30 px-6 py-3 text-sm text-emerald-300 transition hover:bg-emerald-950/50 disabled:opacity-50"
                      >
                        {pendingId === appt.id ? (
                          <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Wird abgeschlossen…</span>
                        ) : (
                          'Termin abschließen'
                        )}
                      </button>
                    )}

                    <Link 
                      href={`/dashboard/appointments/${appt.id}`}
                      className="w-full btn-secondary py-3 flex items-center justify-center gap-2 text-sm"
                    >
                      Details ansehen <ArrowRight className="w-4 h-4" />
                    </Link>
                    <Link
                      href={`/dashboard/admin/documents/new?object_id=${encodeURIComponent(appt.object_id)}&appointment_id=${encodeURIComponent(appt.id)}${appt.asset_id ? `&asset_id=${encodeURIComponent(appt.asset_id)}` : ''}`}
                      className="w-full rounded-2xl border border-emerald-900/60 bg-emerald-950/20 px-6 py-3 text-center text-sm text-emerald-300 transition hover:bg-emerald-950/40"
                    >
                      Servicebericht/Beleg verknüpfen
                    </Link>

                    {/* Quick admin note */}
                    <div className="pt-3 border-t border-slate-800">
                      <div className="text-xs text-slate-500 mb-1.5">INTERNE NOTIZ</div>
                      <textarea 
                        id={`admin-note-${appt.id}`}
                        placeholder="Notiz fürs Team..."
                        defaultValue={appt.admin_notes || ''}
                        className="input w-full text-xs min-h-[60px] resize-y"
                        onBlur={(e) => {
                          if (e.target.value !== (appt.admin_notes || '')) {
                            handleAction(() => updateAdminNote(appt.id, e.target.value), appt.id)
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {scheduleOpen && scheduleAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="card relative max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto border border-emerald-900/40 p-5 sm:p-8">
            <button
              type="button"
              onClick={() => {
                setScheduleOpen(false)
                setScheduleAppt(null)
              }}
              className="absolute right-3 top-3 text-slate-400 hover:text-white sm:right-4 sm:top-4"
              aria-label="Schließen"
            >
              <X className="h-5 w-5" />
            </button>
            <div className="mb-5 pr-8 sm:mb-6">
              <div className="mb-1 text-xs font-semibold tracking-widest text-emerald-500">TERMIN PLANEN</div>
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Datum &amp; Zeitfenster</h2>
              <p className="text-slate-400 mt-2 text-sm">
                {scheduleAppt.service_type} • {scheduleAppt.objects?.name}
                {scheduleAppt.objects?.city ? ` (${scheduleAppt.objects.city})` : ''}
              </p>
            </div>

            <div className="space-y-5">
              <div>
                <label className="text-sm text-slate-300 block mb-2">Datum *</label>
                <input
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="input w-full text-lg"
                  required
                />
              </div>
              <div>
                <label className="text-sm text-slate-300 block mb-2">Zeitfenster (optional)</label>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <span className="mb-1 block text-xs text-slate-500">Von</span>
                    <select
                      value={scheduleTimeFrom}
                      onChange={(e) => {
                        const v = e.target.value
                        setScheduleTimeFrom(v)
                        setScheduleTimeTo((prev) => {
                          if (v && prev && timeToMinutes(prev) <= timeToMinutes(v)) return ''
                          return prev
                        })
                      }}
                      className="input w-full text-sm py-3"
                    >
                      <option value="">—</option>
                      {APPOINTMENT_TIME_SLOTS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <span className="mb-1 block text-xs text-slate-500">Bis</span>
                    <select
                      value={scheduleTimeTo}
                      onChange={(e) => setScheduleTimeTo(e.target.value)}
                      disabled={!scheduleTimeFrom}
                      className="input w-full text-sm py-3 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">—</option>
                      {scheduleEndSlots.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button
                type="button"
                onClick={() => {
                  setScheduleOpen(false)
                  setScheduleAppt(null)
                }}
                className="btn-secondary flex-1 py-3.5"
                disabled={pendingId === scheduleAppt.id}
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={submitSchedule}
                disabled={!scheduleDate.trim() || pendingId === scheduleAppt.id}
                className="btn-primary flex-1 py-3.5 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {pendingId === scheduleAppt.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                Bestätigen
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-12 text-center text-xs text-slate-500">
        Tipp: Klicken Sie auf "Details ansehen" für die vollständige Terminansicht und weitere Optionen.
      </div>
    </div>
  )
}
