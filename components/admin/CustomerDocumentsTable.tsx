import Link from 'next/link'
import type { CustomerDocument } from '@/lib/admin/queries'

type Props = {
  documents: CustomerDocument[]
}

const typeLabel: Record<string, string> = {
  invoice: 'Rechnung',
  offer: 'Angebot',
  report: 'Servicebericht',
  customer_upload: 'Kunden-Datei',
  other: 'Andere',
}

export function CustomerDocumentsTable({ documents }: Props) {
  return (
    <div className="card p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight">Belege</h2>
        <span className="text-xs text-slate-500">{documents.length} Einträge</span>
      </div>

      {documents.length === 0 ? (
        <p className="text-sm text-slate-500">Keine Belege vorhanden.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wider text-slate-500">
                <th className="px-3 py-2">Titel</th>
                <th className="px-3 py-2">Typ</th>
                <th className="px-3 py-2">Objekt</th>
                <th className="px-3 py-2">Datum</th>
                <th className="px-3 py-2 text-right">Aktion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {documents.map((item) => (
                <tr key={item.id} className="hover:bg-slate-900/50">
                  <td className="px-3 py-3 text-slate-200">{item.title}</td>
                  <td className="px-3 py-3 text-slate-400">{typeLabel[item.type] || item.type}</td>
                  <td className="px-3 py-3 text-slate-400">{item.objects?.name || '—'}</td>
                  <td className="px-3 py-3 text-slate-400">
                    {item.created_at ? new Date(item.created_at).toLocaleDateString('de-DE') : '—'}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <Link
                      href={item.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
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
