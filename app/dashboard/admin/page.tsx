import Link from 'next/link'
import { ArrowRight, CalendarClock, FileText, ListChecks, Users } from 'lucide-react'
import { requireAdmin } from '@/lib/admin/require-admin'
import { getAdminKpis } from '@/lib/admin/queries'

type KpiCard = {
  label: string
  value: number
  helpText: string
}

export const dynamic = 'force-dynamic'

export default async function AdminLandingPage() {
  const [{ profile }, kpis] = await Promise.all([requireAdmin(), getAdminKpis()])

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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-5">
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
      </div>

      <div className="mt-8">
        <Link href="/dashboard" className="text-sm text-emerald-400 hover:underline inline-flex items-center gap-1">
          Zurueck zur Uebersicht <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  )
}
