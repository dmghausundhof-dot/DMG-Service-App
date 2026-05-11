import Link from 'next/link'
import type { CustomerAppointment } from '@/lib/admin/queries'

type Props = {
  appointments: CustomerAppointment[]
}

const statusLabel: Record<string, string> = {
  requested: 'Angefragt',
  confirmed: 'Bestätigt',
  in_progress: 'In Bearbeitung',
  completed: 'Abgeschlossen',
  cancelled: 'Storniert',
  reschedule_requested: 'Änderung angefragt',
  rescheduled: 'Verschoben',
}

export function CustomerAppointmentsTable({ appointments }: Props) {
  return (
    <div className="card p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight">Anfragen & Termine</h2>
        <span className="text-xs text-slate-500">{appointments.length} Einträge</span>
      </div>

      {appointments.length === 0 ? (
        <p className="text-sm text-slate-500">Keine Termine vorhanden.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-3 py-2">Service</th>
                <th className="px-3 py-2">Objekt</th>
                <th className="px-3 py-2">Datum</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2 text-right">Aktion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {appointments.map((item) => (
                <tr key={item.id} className="hover:bg-slate-900/50">
                  <td className="px-3 py-3 text-slate-200">{item.service_type}</td>
                  <td className="px-3 py-3 text-slate-400">{item.objects?.name || '—'}</td>
                  <td className="px-3 py-3 text-slate-400">
                    {item.preferred_date ? new Date(item.preferred_date).toLocaleDateString('de-DE') : 'Offen'}
                  </td>
                  <td className="px-3 py-3">
                    <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-1 text-xs text-slate-300">
                      {statusLabel[item.status] || item.status}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right">
                    <Link
                      href={`/dashboard/appointments/${item.id}`}
                      className="text-xs font-medium text-emerald-400 hover:underline"
                    >
                      Öffnen
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
