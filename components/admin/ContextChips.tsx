import Link from 'next/link'

type Props = {
  customerId?: string
  objectId?: string
  assetId?: string
  appointmentId?: string
}

export function ContextChips({ customerId, objectId, assetId, appointmentId }: Props) {
  const chips = [
    customerId
      ? { label: 'Kunde', href: `/dashboard/admin/customers/${encodeURIComponent(customerId)}` }
      : null,
    objectId ? { label: 'Objekt', href: `/dashboard/objects/${encodeURIComponent(objectId)}` } : null,
    assetId ? { label: 'Anlage', href: `/dashboard/assets/${encodeURIComponent(assetId)}` } : null,
    appointmentId
      ? { label: 'Termin', href: `/dashboard/appointments/${encodeURIComponent(appointmentId)}` }
      : null,
  ].filter(Boolean) as { label: string; href: string }[]

  if (chips.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <Link
          key={`${chip.label}-${chip.href}`}
          href={chip.href}
          className="rounded-full border border-slate-700 bg-slate-900 px-3 py-1 text-xs text-slate-300 transition hover:border-emerald-500/60 hover:text-emerald-300"
        >
          {chip.label}
        </Link>
      ))}
    </div>
  )
}
