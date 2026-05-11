import Link from 'next/link'
import { ArrowRight, Home } from 'lucide-react'
import type { CustomerObject } from '@/lib/admin/queries'

type Props = {
  objects: CustomerObject[]
}

export function CustomerObjectsList({ objects }: Props) {
  return (
    <div className="card p-5 sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold tracking-tight">Objekte</h2>
        <span className="text-xs text-slate-500">{objects.length} Einträge</span>
      </div>
      <div className="space-y-3">
        {objects.length === 0 ? (
          <p className="text-sm text-slate-500">Keine Objekte vorhanden.</p>
        ) : (
          objects.map((item) => (
            <Link
              key={item.id}
              href={`/dashboard/objects/${item.id}`}
              className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/40 p-3 transition hover:border-emerald-500/50"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-slate-200">
                  <Home className="h-4 w-4 text-emerald-500" />
                  <span className="truncate font-medium">{item.name}</span>
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {[item.street, item.postal_code, item.city].filter(Boolean).join(', ') || 'Adresse nicht hinterlegt'}
                </div>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-slate-500" />
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
