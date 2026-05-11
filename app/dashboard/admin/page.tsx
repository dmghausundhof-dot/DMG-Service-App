import Link from 'next/link'
import { ArrowRight, CalendarClock, Clock3, FileText, ListChecks, Users } from 'lucide-react'
import { requireAdmin } from '@/lib/admin/require-admin'
import { getAdminInboxItems, getAdminKpis, getAdminObservabilityKpis } from '@/lib/admin/queries'

type KpiCard = {
  label: string
  value: number
  helpText: string
}

export const dynamic = 'force-dynamic'

export default async function AdminLandingPage() {
  const [{ profile }, kpis, observability, inbox] = await Promise.all([
    requireAdmin(),
    getAdminKpis(),
    getAdminObservabilityKpis(),
    getAdminInboxItems(),
  ])

  const cards: KpiCard[] = [
    {
      label: 'Offene Anfragen',
      value: kpis.openRequests,
      helpText: 'Status requested/reschedule_requested',
    },
    {
      label: 'Bestaetigt diese Woche',
      value: kpis.confirmedThisWeek,
      helpText: 'Status confirmed im Wochenfenster',
    },
    {
      label: 'Ueberfaellige Rueckmeldungen',
      value: kpis.overdueFollowUps,
      helpText: 'Vergangene Termine in aktiven Status',
    },
    {
      label: 'Neue Belege (7 Tage)',
      value: kpis.newDocuments,
      helpText: 'Frisch hochgeladene Dokumente',
    },
  ]

  const topInbox = inbox.slice(0, 8)

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-col gap-4 md:mb-8 md:flex-row md:items-center md:justify-between lg:mb-10">
        <div>
          <div className="mb-1.5 text-xs font-semibold tracking-[2px] text-emerald-500 sm:text-sm sm:mb-2">
            ADMIN BEREICH
          </div>
          <h1 className="text-3xl font-semibold tracking-tighter sm:text-4xl lg:text-5xl">
            Admin Dashboard
          </h1>
          <p className="mt-2 text-base text-slate-400 sm:text-lg lg:text-xl">
            Willkommen {profile.full_name?.split(' ')[0] || profile.email || 'Admin'}.
          </p>
        </div>

        <Link
          href="/dashboard/admin/appointments"
          className="btn-primary flex w-full items-center justify-center gap-2 sm:w-fit"
        >
          <CalendarClock className="h-5 w-5" />
          Offene Vorgaenge bearbeiten
        </Link>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:mb-10 lg:grid-cols-4 lg:gap-6">
        {cards.map((card) => (
          <div key={card.label} className="card p-5 sm:p-6 lg:p-8">
            <div className="text-xs uppercase tracking-widest text-slate-500">{card.label}</div>
            <div className="mt-2 text-4xl font-semibold tracking-tight text-emerald-400">{card.value}</div>
            <div className="mt-2 text-xs text-slate-500">{card.helpText}</div>
          </div>
        ))}
      </div>

      <div className="mb-6 card p-5 sm:p-6 lg:mb-10 lg:p-8">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-semibold tracking-[2px] text-emerald-500">INBOX-FIRST</div>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">Jetzt bearbeiten</h2>
          </div>
          <Link href="/dashboard/admin/appointments" className="text-sm text-emerald-400 hover:underline">
            Ganze Pipeline öffnen
          </Link>
        </div>
        {topInbox.length === 0 ? (
          <p className="text-sm text-slate-500">Keine priorisierten Vorgänge vorhanden.</p>
        ) : (
          <div className="space-y-3">
            {topInbox.map((item) => (
              <div
                key={`${item.kind}-${item.appointmentId}`}
                className="flex flex-col gap-2 rounded-2xl border border-slate-800 bg-slate-900/40 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-200">
                    {item.serviceType} · {item.objectName || 'Objekt'}
                    {item.objectCity ? ` (${item.objectCity})` : ''}
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {item.kind === 'requested' && 'Neue Anfrage'}
                    {item.kind === 'reschedule_requested' && 'Änderungswunsch'}
                    {item.kind === 'confirmed_stale' && 'Bestätigt, aber ohne Fortschritt'}
                    {item.kind === 'completed_missing_report' && 'Abgeschlossen ohne Servicebericht'}
                    {' · '}
                    vor {item.ageDays} Tagen
                  </div>
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/dashboard/appointments/${item.appointmentId}`}
                    className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-600"
                  >
                    Öffnen
                  </Link>
                  <Link
                    href={`/dashboard/admin/documents/new?object_id=${encodeURIComponent(item.objectId)}&appointment_id=${encodeURIComponent(item.appointmentId)}`}
                    className="rounded-xl border border-emerald-900/60 bg-emerald-950/30 px-3 py-1.5 text-xs text-emerald-300 hover:bg-emerald-950/50"
                  >
                    Beleg
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:mb-10">
        <div className="card p-5 sm:p-6">
          <div className="mb-1 text-xs uppercase tracking-widest text-slate-500">Durchlaufzeit</div>
          <div className="text-sm text-slate-300">
            Requested → Confirmed:{' '}
            <span className="font-semibold text-emerald-300">
              {observability.medianRequestedToConfirmedHours != null
                ? `${observability.medianRequestedToConfirmedHours.toFixed(1)} h`
                : '—'}
            </span>
          </div>
          <div className="mt-1 text-sm text-slate-300">
            Confirmed → Completed:{' '}
            <span className="font-semibold text-emerald-300">
              {observability.medianConfirmedToCompletedHours != null
                ? `${observability.medianConfirmedToCompletedHours.toFixed(1)} h`
                : '—'}
            </span>
          </div>
        </div>
        <div className="card p-5 sm:p-6">
          <div className="mb-1 text-xs uppercase tracking-widest text-slate-500">Datenqualität</div>
          <div className="text-sm text-slate-300">
            Completed ohne Report:{' '}
            <span className="font-semibold text-amber-300">{observability.completedWithoutReportCount}</span>
          </div>
          <div className="mt-1 text-sm text-slate-300">
            Verknüpfte Dokumente:{' '}
            <span className="font-semibold text-emerald-300">
              {(observability.linkedDocumentsRatio * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4 md:gap-5">
        <Link
          href="/dashboard/admin/customers"
          className="card group flex items-center justify-between p-5 transition hover:border-emerald-500/50 sm:p-6"
        >
          <div>
            <div className="text-sm text-slate-400">Admin: Kunden</div>
            <div className="mt-1 text-xl font-semibold">Kundenverwaltung</div>
          </div>
          <Users className="h-6 w-6 text-emerald-400" />
        </Link>

        <Link
          href="/dashboard/admin/appointments"
          className="card group flex items-center justify-between p-5 transition hover:border-emerald-500/50 sm:p-6"
        >
          <div>
            <div className="text-sm text-slate-400">Admin: Anfragen</div>
            <div className="mt-1 text-xl font-semibold">Terminpipeline</div>
          </div>
          <ListChecks className="h-6 w-6 text-emerald-400" />
        </Link>

        <Link
          href="/dashboard/admin/documents/new"
          className="card group flex items-center justify-between p-5 transition hover:border-emerald-500/50 sm:p-6"
        >
          <div>
            <div className="text-sm text-slate-400">Admin: Belege</div>
            <div className="mt-1 text-xl font-semibold">Dokument hochladen</div>
          </div>
          <FileText className="h-6 w-6 text-emerald-400" />
        </Link>

        <Link
          href="/dashboard/admin/documents/quality"
          className="card group flex items-center justify-between p-5 transition hover:border-emerald-500/50 sm:p-6"
        >
          <div>
            <div className="text-sm text-slate-400">Admin: Qualität</div>
            <div className="mt-1 text-xl font-semibold">Dokument-Qualität</div>
          </div>
          <Clock3 className="h-6 w-6 text-emerald-400" />
        </Link>
      </div>

      <div className="mt-8">
        <Link href="/dashboard" className="text-sm text-emerald-400 hover:underline inline-flex items-center gap-1">
          Zurueck zur Uebersicht <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}
