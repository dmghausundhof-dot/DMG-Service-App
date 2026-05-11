import Link from 'next/link'
import { AlertTriangle, ArrowLeft, FileWarning } from 'lucide-react'
import { requireAdmin } from '@/lib/admin/require-admin'
import { getDocumentQualityRows } from '@/lib/admin/queries'

export const dynamic = 'force-dynamic'

export default async function AdminDocumentsQualityPage() {
  await requireAdmin()
  const { unlinkedBusinessDocs, completedWithoutReport } = await getDocumentQualityRows()

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-1 text-xs font-semibold tracking-[2px] text-emerald-500">ADMIN QUALITÄT</div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Dokument-Qualität</h1>
          <p className="mt-2 text-sm text-slate-400 sm:text-base">
            Prüft fehlende Verknüpfungen und abgeschlossene Termine ohne Servicebericht.
          </p>
        </div>
        <Link href="/dashboard/admin" className="btn-secondary inline-flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" /> Admin Dashboard
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="card p-5 sm:p-6">
          <div className="text-xs uppercase tracking-widest text-slate-500">Unverknüpfte Business-Belege</div>
          <div className="mt-2 text-4xl font-semibold text-amber-300">{unlinkedBusinessDocs.length}</div>
        </div>
        <div className="card p-5 sm:p-6">
          <div className="text-xs uppercase tracking-widest text-slate-500">Completed ohne Report</div>
          <div className="mt-2 text-4xl font-semibold text-amber-300">{completedWithoutReport.length}</div>
        </div>
      </div>

      <div className="card p-5 sm:p-6">
        <div className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <FileWarning className="h-5 w-5 text-amber-400" /> Unverknüpfte Belege
        </div>
        {unlinkedBusinessDocs.length === 0 ? (
          <p className="text-sm text-slate-500">Keine offenen Qualitätsprobleme in den Beleg-Verknüpfungen.</p>
        ) : (
          <div className="space-y-2">
            {unlinkedBusinessDocs.slice(0, 80).map((doc) => (
              <div
                key={doc.id}
                className="flex flex-col gap-2 rounded-2xl border border-slate-800 bg-slate-900/40 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-slate-200">{doc.title}</div>
                  <div className="text-xs text-slate-500">
                    {doc.type} · {doc.objects?.name || 'Objekt'}{doc.objects?.city ? ` (${doc.objects.city})` : ''}
                  </div>
                </div>
                <Link
                  href={`/dashboard/admin/documents/new?object_id=${encodeURIComponent(doc.object_id)}`}
                  className="text-xs text-emerald-400 hover:underline"
                >
                  Neu zuordnen →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card p-5 sm:p-6">
        <div className="mb-3 flex items-center gap-2 text-lg font-semibold">
          <AlertTriangle className="h-5 w-5 text-amber-400" /> Abgeschlossene Termine ohne Servicebericht
        </div>
        {completedWithoutReport.length === 0 ? (
          <p className="text-sm text-slate-500">Alle abgeschlossenen Termine sind mit Report verknüpft.</p>
        ) : (
          <div className="space-y-2">
            {completedWithoutReport.slice(0, 80).map((appt) => (
              <div
                key={appt.id}
                className="flex flex-col gap-2 rounded-2xl border border-slate-800 bg-slate-900/40 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium text-slate-200">{appt.service_type}</div>
                  <div className="text-xs text-slate-500">
                    {appt.preferred_date ? new Date(appt.preferred_date).toLocaleDateString('de-DE') : 'ohne Datum'}
                  </div>
                </div>
                <Link
                  href={`/dashboard/admin/documents/new?object_id=${encodeURIComponent(appt.object_id)}&appointment_id=${encodeURIComponent(appt.id)}`}
                  className="text-xs text-emerald-400 hover:underline"
                >
                  Report anlegen →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
