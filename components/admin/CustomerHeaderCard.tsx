import { Mail, Phone, User } from 'lucide-react'
import type { CustomerProfile } from '@/lib/admin/queries'

type Props = {
  customer: CustomerProfile
}

export function CustomerHeaderCard({ customer }: Props) {
  return (
    <div className="card p-5 sm:p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600/10">
          <User className="h-5 w-5 text-emerald-500" />
        </div>
        <div>
          <div className="text-xs font-semibold tracking-[2px] text-emerald-500">KUNDENAKTE</div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{customer.full_name}</h1>
        </div>
      </div>

      <div className="grid gap-3 text-sm sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-3">
          <div className="mb-1 text-xs uppercase tracking-widest text-slate-500">E-Mail</div>
          <div className="flex items-center gap-2 text-slate-200">
            <Mail className="h-4 w-4 text-slate-500" />
            <span className="truncate">{customer.email || '—'}</span>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-3">
          <div className="mb-1 text-xs uppercase tracking-widest text-slate-500">Telefon</div>
          <div className="flex items-center gap-2 text-slate-200">
            <Phone className="h-4 w-4 text-slate-500" />
            <span>{customer.phone || '—'}</span>
          </div>
        </div>
      </div>

      {customer.notes ? (
        <div className="mt-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-3">
          <div className="mb-1 text-xs uppercase tracking-widest text-slate-500">Notizen</div>
          <p className="text-sm whitespace-pre-wrap text-slate-300">{customer.notes}</p>
        </div>
      ) : null}
    </div>
  )
}
