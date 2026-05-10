'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, Clock, AlertTriangle, CheckCircle, MapPin, Loader2, X, Edit2, ImageIcon, Shield, User, Wrench } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { getOrCreateProfileId } from '@/lib/supabase/ensure-profile'
import DeleteConfirmation from '@/components/DeleteConfirmation'
import { AppointmentCalendarExports } from '@/components/AppointmentCalendarExports'
import { isMaintenanceGuide } from '@/lib/maintenance-guide'

interface AttachmentMeta {
  url: string
  file_name?: string
  file_size?: number
}

type CustomerProfileEmbed = {
  full_name: string | null
  email: string | null
  phone: string | null
}

interface LinkedAsset {
  id: string
  name: string
  category: string
  manufacturer: string | null
  model: string | null
  ai_maintenance_guide: unknown | null
}

interface Appointment {
  id: string
  service_type: string
  preferred_date: string | null
  time_window: string | null
  status: string
  description: string | null
  customer_notes: string | null
  object_id: string
  asset_id?: string | null
  assets?: LinkedAsset | LinkedAsset[] | null
  attachment_urls?: AttachmentMeta[] | null
  objects: {
    name: string
    city: string | null
    profile_id?: string
    profiles?: CustomerProfileEmbed | CustomerProfileEmbed[] | null
  } | null
  proposed_preferred_date?: string | null
  proposed_time_window?: string | null
  reschedule_reason?: string | null
  reschedule_requested_at?: string | null
}

function parseAttachments(raw: unknown): AttachmentMeta[] {
  if (!raw || !Array.isArray(raw)) return []
  return raw.filter(
    (x): x is AttachmentMeta =>
      Boolean(x && typeof x === 'object' && typeof (x as AttachmentMeta).url === 'string'),
  )
}

function embeddedCustomerProfile(
  objects: Appointment['objects'],
): CustomerProfileEmbed | null {
  if (!objects?.profiles) return null
  const p = objects.profiles
  return Array.isArray(p) ? p[0] ?? null : p
}

const APPOINTMENT_DETAIL_SELECT = `
  *,
  objects (
    name,
    city,
    profile_id,
    profiles (full_name, email, phone)
  ),
  assets (
    id,
    name,
    category,
    manufacturer,
    model,
    ai_maintenance_guide
  )
`

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

export default function AppointmentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [appointment, setAppointment] = useState<Appointment | null>(null)
  const [viewerIsAdmin, setViewerIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  // Modals
  const [showRescheduleModal, setShowRescheduleModal] = useState(false)
  const [showCancelModal, setShowCancelModal] = useState(false)

  // Reschedule form
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

      await getOrCreateProfileId(supabase, user)

      const { data: profileRow } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('user_id', user.id)
        .maybeSingle()

      const pid = profileRow?.id ?? null
      const isAdmin = profileRow?.role === 'admin'

      if (!pid) {
        setError('Profil konnte nicht geladen werden')
        setLoading(false)
        return
      }

      const { data: apptData, error: fetchError } = await supabase
        .from('appointments')
        .select(APPOINTMENT_DETAIL_SELECT)
        .eq('id', id)
        .maybeSingle()

      if (fetchError || !apptData) {
        setError('Termin nicht gefunden oder Sie haben keine Berechtigung.')
        setLoading(false)
        return
      }

      const emb = apptData.objects as { profile_id?: string } | { profile_id?: string }[] | null
      const objRow = Array.isArray(emb) ? emb[0] : emb

      if (!isAdmin) {
        if (!objRow?.profile_id || objRow.profile_id !== pid) {
          setError('Termin nicht gefunden oder Sie haben keine Berechtigung.')
          setLoading(false)
          return
        }
      }

      setAppointment(apptData as Appointment)
      setViewerIsAdmin(isAdmin)
      setLoading(false)
    }

    fetchAppointment()
  }, [id, router, supabase])

  const handleReschedule = async () => {
    if (!appointment || !rescheduleReason.trim()) {
      alert('Bitte eine kurze Begründung angeben.')
      return
    }

    setIsSubmitting(true)

    try {
      const { error } = await supabase
        .from('appointments')
        .update({
          status: 'reschedule_requested',
          proposed_preferred_date: null,
          proposed_time_window: null,
          reschedule_reason: rescheduleReason.trim(),
          reschedule_requested_at: new Date().toISOString()
        })
        .eq('id', appointment.id)

      if (error) throw error

      alert('✅ Änderungswunsch wurde gesendet. DMG Service meldet sich mit einem Alternativtermin.')

      const { data: updated } = await supabase
        .from('appointments')
        .select(APPOINTMENT_DETAIL_SELECT)
        .eq('id', appointment.id)
        .single()

      if (updated) setAppointment(updated as Appointment)

      setShowRescheduleModal(false)
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
        .select(APPOINTMENT_DETAIL_SELECT)
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
        .select(APPOINTMENT_DETAIL_SELECT)
        .eq('id', appointment.id)
        .single()

      if (updated) setAppointment(updated as Appointment)
    } catch (err: any) {
      alert('Fehler beim Stornieren: ' + (err.message || 'Unbekannt'))
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-10 text-center">
        <Loader2 className="mx-auto h-8 w-8 animate-spin text-emerald-500" />
        <p className="mt-3 text-sm text-slate-400">Termin wird geladen...</p>
      </div>
    )
  }

  if (error || !appointment) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-4 sm:py-6">
        <Link href="/dashboard/appointments" className="mb-5 flex items-center gap-2 text-slate-400 hover:text-white sm:mb-6">
          <ArrowLeft className="h-4 w-4 shrink-0" /> Zurück zu Terminen
        </Link>
        <div className="card p-6 text-center sm:p-10 lg:p-12">
          <AlertTriangle className="mx-auto mb-5 h-14 w-14 text-red-500 sm:mb-6 sm:h-16 sm:w-16" />
          <h1 className="mb-3 text-2xl font-semibold sm:mb-4 sm:text-3xl">Termin nicht gefunden</h1>
          <p className="mb-6 text-sm text-slate-400 sm:mb-8 sm:text-base">
            {error || 'Der angeforderte Termin existiert nicht oder Sie haben keine Zugriffsberechtigung.'}
          </p>
          <Link href="/dashboard/appointments" className="btn-primary">
            Zurück zur Übersicht
          </Link>
        </div>
      </div>
    )
  }

  const statusInfo = getStatusBadge(appointment.status)
  const StatusIcon = statusInfo.icon
  const attachments = parseAttachments(appointment.attachment_urls)

  const isRescheduleRequested = appointment.status === 'reschedule_requested'
  const canModify = !['completed', 'cancelled'].includes(appointment.status)
  const canModifyClient = canModify && !viewerIsAdmin
  const customerProf = embeddedCustomerProfile(appointment.objects)
  const hasScheduledDate = Boolean(appointment.preferred_date?.trim())
  const canRequestReschedule =
    canModifyClient &&
    hasScheduledDate &&
    ['confirmed', 'rescheduled'].includes(appointment.status)

  return (
    <div className="mx-auto max-w-5xl">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-5 sm:mb-8 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <Link
            href={viewerIsAdmin ? '/dashboard/admin/appointments' : '/dashboard/appointments'}
            className="mb-2 flex items-center gap-2 text-sm text-slate-400 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4 shrink-0" />{' '}
            {viewerIsAdmin ? 'Zurück zu Admin-Anfragen' : 'Zurück zu Terminen'}
          </Link>
          <h1 className="flex flex-col items-start gap-3 text-3xl font-semibold tracking-tighter sm:flex-row sm:flex-wrap sm:items-center sm:gap-4 lg:text-4xl xl:text-5xl">
            <span className="min-w-0 break-words">{appointment.service_type}</span>
            <div className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium sm:px-4 sm:py-1.5 sm:text-sm ${statusInfo.bg}`}>
              <StatusIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              {statusInfo.label}
            </div>
          </h1>
          <p className="mt-2 flex items-start gap-2 text-base text-slate-400 sm:items-center sm:text-lg lg:text-xl">
            <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-slate-500 sm:mt-0" />
            <span className="min-w-0 break-words">
              {appointment.objects?.name} {appointment.objects?.city && `• ${appointment.objects.city}`}
            </span>
          </p>
        </div>

        {canModifyClient && (
          <div className="flex shrink-0 flex-col gap-2 sm:flex-row sm:flex-wrap">
            {canRequestReschedule ? (
              <button
                type="button"
                onClick={() => setShowRescheduleModal(true)}
                className="btn-secondary flex w-full items-center justify-center gap-2 sm:w-auto"
              >
                <Edit2 className="h-4 w-4 shrink-0" /> Termin ändern
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setShowCancelModal(true)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-900/50 px-4 py-2.5 text-sm text-red-400 transition hover:bg-red-950/50 hover:text-red-300 sm:w-auto sm:px-6 sm:py-3 sm:text-base"
            >
              <AlertTriangle className="h-4 w-4 shrink-0" /> Stornieren
            </button>
          </div>
        )}
      </div>

      {viewerIsAdmin && (
        <div className="card mb-6 flex flex-wrap items-start gap-3 border border-amber-900/40 bg-amber-950/25 p-4 sm:mb-8 sm:gap-4 sm:p-5">
          <Shield className="h-7 w-7 shrink-0 text-amber-400 sm:h-8 sm:w-8" />
          <div className="flex-1 min-w-[220px] space-y-2">
            <div className="font-semibold text-amber-100">Admin-Ansicht</div>
            <p className="text-sm text-slate-400 leading-relaxed">
              Sie sehen diese Terminanfrage mit Kundendaten. Änderungen durch den Kunden (Verschiebung / Storno) sind hier deaktiviert –
              bitte Aktionen unter <strong className="text-slate-300">Admin: Anfragen</strong> durchführen oder den Kunden kontaktieren.
            </p>
            <Link
              href="/dashboard/admin/appointments"
              className="inline-flex text-sm text-emerald-400 hover:text-emerald-300 hover:underline"
            >
              → Zu den offenen Admin-Anfragen
            </Link>
          </div>
        </div>
      )}

      {/* Reschedule Requested Banner */}
      {isRescheduleRequested && (
        <div className="card mb-6 border-purple-900/50 bg-purple-950/20 p-4 sm:mb-8 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-purple-600/10 rounded-2xl flex items-center justify-center flex-shrink-0">
              <Clock className="w-6 h-6 text-purple-400" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-lg text-purple-400 mb-1">Änderungsanfrage gesendet</h3>
              <p className="text-slate-400 mb-3">
                DMG Service prüft Ihren Wunsch und schlägt Ihnen einen neuen Termin vor. Sie müssen kein Datum selbst vorschlagen.
              </p>
              {appointment.reschedule_reason ? (
                <div className="text-sm bg-purple-950/50 p-3 rounded-xl mb-3">
                  <div>
                    <strong>Ihre Angabe:</strong> {appointment.reschedule_reason}
                  </div>
                </div>
              ) : null}
              {canModifyClient ? (
                <button 
                  type="button"
                  onClick={handleWithdrawReschedule}
                  className="text-sm text-purple-400 hover:text-purple-300 underline"
                >
                  Anfrage zurückziehen
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
        {/* Main Info */}
        <div className="space-y-6 lg:col-span-2 lg:space-y-8">
          <div className="card p-5 sm:p-6 lg:p-8">
            <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold sm:mb-6 sm:gap-3 sm:text-2xl">
              <Calendar className="h-5 w-5 shrink-0 text-emerald-500 sm:h-6 sm:w-6" /> Termin Details
            </h2>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6 lg:gap-8">
              <div>
                <div className="mb-1.5 text-xs text-slate-500">TERMIN</div>
                {hasScheduledDate ? (
                  <div className="text-xl font-semibold sm:text-2xl">
                    {new Date(appointment.preferred_date!).toLocaleDateString('de-DE', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </div>
                ) : (
                  <div className="text-lg text-amber-300/95 leading-snug">
                    Noch offen – DMG Service teilt Ihnen Datum und Uhrzeit mit, sobald die Anfrage bearbeitet wurde.
                  </div>
                )}
              </div>

              <div>
                <div className="mb-1.5 text-xs text-slate-500">ZEITFENSTER</div>
                <div className="flex items-center gap-2 text-xl font-semibold sm:text-2xl">
                  <Clock className="h-5 w-5 shrink-0 text-emerald-500 sm:h-6 sm:w-6" />
                  {hasScheduledDate
                    ? appointment.time_window || 'Nicht angegeben'
                    : '—'}
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
              <div className="mt-6 border-t border-slate-800 pt-6 sm:mt-8 sm:pt-8">
                <div className="text-xs text-slate-500 mb-1.5">BESCHREIBUNG / NOTIZEN</div>
                <p className="text-slate-300 whitespace-pre-wrap">{appointment.description}</p>
              </div>
            )}

            {appointment.customer_notes && (
              <div className="mt-6 border-t border-slate-800 pt-6 sm:mt-8 sm:pt-8">
                <div className="text-xs text-slate-500 mb-1.5">IHRE NOTIZ</div>
                <p className="text-slate-300 italic">"{appointment.customer_notes}"</p>
              </div>
            )}

            {hasScheduledDate &&
              ['confirmed', 'rescheduled', 'in_progress', 'completed'].includes(appointment.status) && (
                <div className="mt-6 border-t border-slate-800 pt-6 sm:mt-8 sm:pt-8">
                  <AppointmentCalendarExports
                    appointmentId={appointment.id}
                    serviceType={appointment.service_type}
                    preferredDate={appointment.preferred_date}
                    timeWindow={appointment.time_window}
                    locationLabel={
                      [appointment.objects?.name, appointment.objects?.city].filter(Boolean).join(', ') || null
                    }
                    description={[appointment.description, appointment.customer_notes].filter(Boolean).join('\n\n') || null}
                  />
                </div>
              )}

            {attachments.length > 0 && (
              <div className="mt-6 border-t border-slate-800 pt-6 sm:mt-8 sm:pt-8">
                <div className="text-xs text-slate-500 mb-3 flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" /> ANGEHÄNGTE FOTOS ({attachments.length})
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {attachments.map((a, i) => (
                    <a
                      key={`${a.url}-${i}`}
                      href={a.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group block rounded-2xl border border-slate-700 overflow-hidden bg-slate-900/50 hover:border-emerald-800 transition"
                    >
                      <img
                        src={a.url}
                        alt={a.file_name || `Anhang ${i + 1}`}
                        className="w-full h-28 object-cover"
                      />
                      <div className="px-2 py-1.5 text-[11px] text-slate-500 truncate group-hover:text-emerald-400/90">
                        {a.file_name || 'Foto öffnen'}
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4 sm:space-y-6">
          {viewerIsAdmin && customerProf ? (
            <div className="card border border-slate-700/80 p-5 sm:p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-sky-400" /> Kunde
              </h3>
              {customerProf.full_name ? (
                <div className="text-lg font-medium text-slate-100">{customerProf.full_name}</div>
              ) : (
                <div className="text-sm text-slate-500 italic">Kein Name im Profil</div>
              )}
              {customerProf.email ? (
                <a
                  href={`mailto:${customerProf.email}`}
                  className="text-sm text-emerald-400 hover:underline mt-2 block break-all"
                >
                  {customerProf.email}
                </a>
              ) : null}
              {customerProf.phone ? (
                <a
                  href={`tel:${customerProf.phone}`}
                  className="text-sm text-slate-400 hover:text-slate-200 mt-1 block"
                >
                  {customerProf.phone}
                </a>
              ) : null}
            </div>
          ) : null}

          <div className="card p-5 sm:p-6">
            <h3 className="mb-3 flex items-center gap-2 font-semibold sm:mb-4">
              <MapPin className="h-5 w-5 shrink-0 text-emerald-500" /> Objekt
            </h3>
            <div className="text-base font-medium sm:text-lg">{appointment.objects?.name}</div>
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

          {(() => {
            const la = appointment.assets
              ? Array.isArray(appointment.assets)
                ? appointment.assets[0]
                : appointment.assets
              : null
            if (!la) return null
            const g = la.ai_maintenance_guide
            const parsed = g && isMaintenanceGuide(g) ? g : null
            return (
              <div className="card border border-amber-900/40 bg-amber-950/15 p-5 sm:p-6">
                <h3 className="mb-3 flex items-center gap-2 font-semibold text-amber-200/95 sm:mb-4">
                  <Wrench className="h-5 w-5 shrink-0 text-amber-400" /> Anlage &amp; Pflege (KI)
                </h3>
                <div className="text-base font-medium text-slate-100">{la.name}</div>
                <div className="text-sm text-slate-500">
                  {[la.category, la.manufacturer, la.model].filter(Boolean).join(' · ')}
                </div>
                <Link
                  href={`/dashboard/assets/${la.id}`}
                  className="mt-2 inline-block text-sm text-emerald-400 hover:underline"
                >
                  Stammdaten der Anlage →
                </Link>
                {parsed ? (
                  <div className="mt-4 space-y-3 border-t border-slate-800 pt-4 text-sm">
                    <p className="leading-relaxed text-slate-300">{parsed.summary}</p>
                    {parsed.checklist.length ? (
                      <ul className="list-inside list-disc space-y-1 text-slate-400">
                        {parsed.checklist.slice(0, 8).map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    ) : null}
                    <p className="text-[11px] text-slate-600">
                      Unverbindliche KI-Recherche beim Kunden — Abgleich mit Herstellerunterlagen und Vor-Ort-Begehung durch
                      DMG.
                    </p>
                  </div>
                ) : viewerIsAdmin ? (
                  <p className="mt-3 text-xs text-slate-500">Keine strukturierten Pflegehinweise in der Anlage hinterlegt.</p>
                ) : null}
              </div>
            )
          })()}

          <div className="card p-5 text-sm text-slate-400 sm:p-6">
            <div className="font-medium text-white mb-2">Hinweis</div>
            {viewerIsAdmin ? (
              <p>
                Interne Bearbeitung: Status und Notizen im Bereich <strong className="text-slate-300">Admin: Anfragen</strong> pflegen.
              </p>
            ) : (
              <p>Terminwünsche können bis 48 Stunden vor dem Termin kostenfrei geändert oder storniert werden. Danach gelten unsere AGB.</p>
            )}
          </div>
        </div>
      </div>

      {/* Reschedule Modal */}
      {showRescheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="card relative max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto p-5 sm:p-8">
            <button 
              onClick={() => setShowRescheduleModal(false)}
              className="absolute right-3 top-3 text-slate-400 hover:text-white sm:right-4 sm:top-4"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-5 flex items-center gap-3 sm:mb-6 sm:gap-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-600/10 sm:h-12 sm:w-12">
                <Edit2 className="h-5 w-5 text-emerald-500 sm:h-6 sm:w-6" />
              </div>
              <div className="min-w-0 pr-8">
                <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">Termin ändern</h2>
                <p className="text-slate-400">Datum und Uhrzeit legt DMG nach Ihrem Hinweis neu fest</p>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-sm text-slate-300 block mb-2">Warum brauchen Sie einen anderen Termin? *</label>
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
                type="button"
                onClick={() => setShowRescheduleModal(false)}
                disabled={isSubmitting}
                className="btn-secondary flex-1 py-3.5"
              >
                Abbrechen
              </button>
              <button 
                type="button"
                onClick={handleReschedule}
                disabled={!rescheduleReason.trim() || isSubmitting}
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
              Sie schlagen kein neues Datum vor – das Team meldet sich mit einem konkreten Alternativtermin.
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
        itemName={`${appointment.service_type}${hasScheduledDate ? ` (${new Date(appointment.preferred_date!).toLocaleDateString('de-DE')})` : ''}`}
        itemType="Termin"
        confirmButtonText="Ja, Termin stornieren"
      />
    </div>
  )
}
