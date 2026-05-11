import Link from 'next/link'
import { ArrowRight, Search, UserRound } from 'lucide-react'
import { requireAdmin } from '@/lib/admin/require-admin'
import { getCustomersList } from '@/lib/admin/queries'

export const dynamic = 'force-dynamic'

type PageProps = {
  searchParams?: Promise<{ q?: string }>
}

export default async function AdminCustomersPage({ searchParams }: PageProps) {
  await requireAdmin()
  const params = (await searchParams) ?? {}
  const q = params.q?.trim() || ''
  const customers = await getCustomersList({ search: q })

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-1 text-xs font-semibold tracking-[2px] text-emerald-500">ADMIN BEREICH</div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Kunden</h1>
          <p className="mt-2 text-sm text-slate-400 sm:text-base">
            {customers.length} Treffer{q ? ` für „${q}“` : ''}.
          </p>
        </div>
        <Link href="/dashboard/admin" className="btn-secondary w-full text-center sm:w-auto">
          Zurück zum Admin-Dashboard
        </Link>
      </div>

      <form className="mb-5 rounded-2xl border border-slate-800 bg-slate-900/40 p-3 sm:p-4">
        <label htmlFor="q" className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-500">
          Suche
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              id="q"
              name="q"
              defaultValue={q}
              placeholder="Name, E-Mail, Telefon oder Stadt"
              className="input-search w-full py-2.5 pl-9 text-sm"
            />
          </div>
          <button type="submit" className="btn-primary px-5 py-2.5 text-sm">
            Filtern
          </button>
        </div>
      </form>

      <div className="card overflow-hidden p-0">
        {customers.length === 0 ? (
          <div className="p-8 text-center">
            <UserRound className="mx-auto mb-3 h-10 w-10 text-slate-600" />
            <p className="text-sm text-slate-500">Keine Kunden gefunden.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-800 text-left text-xs uppercase tracking-wider text-slate-500">
                  <th className="px-4 py-3">Kunde</th>
                  <th className="px-4 py-3">Kontakt</th>
                  <th className="px-4 py-3 text-center">Objekte</th>
                  <th className="px-4 py-3 text-center">Anlagen</th>
                  <th className="px-4 py-3 text-center">Offene Anfragen</th>
                  <th className="px-4 py-3 text-center">Belege</th>
                  <th className="px-4 py-3">Städte</th>
                  <th className="px-4 py-3 text-right">Aktion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {customers.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-900/40">
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-100">{item.full_name}</div>
                      <div className="text-xs text-slate-500">
                        Erstellt: {item.created_at ? new Date(item.created_at).toLocaleDateString('de-DE') : '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      <div>{item.email || '—'}</div>
                      <div className="text-xs text-slate-500">{item.phone || '—'}</div>
                    </td>
                    <td className="px-4 py-3 text-center font-medium text-slate-200">{item.objectCount}</td>
                    <td className="px-4 py-3 text-center font-medium text-slate-200">{item.assetCount}</td>
                    <td className="px-4 py-3 text-center">
                      <span className="rounded-full bg-amber-600/15 px-2 py-1 text-xs font-medium text-amber-300">
                        {item.openRequestCount}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-medium text-slate-200">{item.documentCount}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {item.cityPreview.length ? item.cityPreview.join(' · ') : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/dashboard/admin/customers/${item.id}`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400 hover:underline"
                      >
                        Kundenakte <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
