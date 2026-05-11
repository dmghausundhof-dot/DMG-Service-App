import Link from 'next/link'
import { ArrowLeft, CalendarPlus, FilePlus2 } from 'lucide-react'
import { requireAdmin } from '@/lib/admin/require-admin'
import {
  getCustomerAppointments,
  getCustomerAssets,
  getCustomerDetail,
  getCustomerDocuments,
  getCustomerObjects,
} from '@/lib/admin/queries'
import { CustomerHeaderCard } from '@/components/admin/CustomerHeaderCard'
import { CustomerObjectsList } from '@/components/admin/CustomerObjectsList'
import { CustomerAssetsList } from '@/components/admin/CustomerAssetsList'
import { CustomerAppointmentsTable } from '@/components/admin/CustomerAppointmentsTable'
import { CustomerDocumentsTable } from '@/components/admin/CustomerDocumentsTable'
import { ContextChips } from '@/components/admin/ContextChips'

export const dynamic = 'force-dynamic'

type PageProps = {
  params: Promise<{ profileId: string }>
}

export default async function AdminCustomerDetailPage({ params }: PageProps) {
  await requireAdmin()
  const { profileId } = await params

  const [customer, objects, assets, appointments, documents] = await Promise.all([
    getCustomerDetail(profileId),
    getCustomerObjects(profileId),
    getCustomerAssets(profileId),
    getCustomerAppointments(profileId),
    getCustomerDocuments(profileId),
  ])

  if (!customer) {
    return (
      <div className="mx-auto max-w-5xl">
        <Link href="/dashboard/admin/customers" className="mb-4 inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Zurück zur Kundenliste
        </Link>
        <div className="card p-8 text-center">
          <h1 className="text-2xl font-semibold">Kunde nicht gefunden</h1>
          <p className="mt-2 text-sm text-slate-500">Es konnte kein Kundenprofil mit dieser ID geladen werden.</p>
        </div>
      </div>
    )
  }

  const objectsById = new Map(objects.map((item) => [item.id, item] as const))
  const preferredObjectId =
    objects[0]?.id ?? appointments[0]?.object_id ?? documents[0]?.object_id ?? assets[0]?.object_id ?? ''

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="sticky top-3 z-20 rounded-2xl border border-slate-800 bg-slate-950/90 p-3 backdrop-blur sm:p-4">
        <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/dashboard/admin/customers" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Zurück zur Kundenliste
          </Link>
          <ContextChips customerId={profileId} objectId={preferredObjectId || undefined} />
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Link
            href={preferredObjectId ? `/dashboard/appointments/new?object_id=${encodeURIComponent(preferredObjectId)}` : '/dashboard/appointments/new'}
            className="btn-secondary inline-flex items-center justify-center gap-2"
          >
            <CalendarPlus className="h-4 w-4" /> Termin anlegen
          </Link>
          <Link
            href={
              preferredObjectId
                ? `/dashboard/admin/documents/new?object_id=${encodeURIComponent(preferredObjectId)}&profile_id=${encodeURIComponent(profileId)}`
                : '/dashboard/admin/documents/new'
            }
            className="btn-primary inline-flex items-center justify-center gap-2"
          >
            <FilePlus2 className="h-4 w-4" /> Beleg hochladen
          </Link>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/dashboard/admin/customers" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Zurück zur Kundenliste
        </Link>
        <div className="text-xs text-slate-500">Kundenakte & Verknüpfungen</div>
      </div>

      <CustomerHeaderCard customer={customer} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <CustomerObjectsList objects={objects} />
        <CustomerAssetsList assets={assets} objectsById={objectsById} />
      </div>

      <CustomerAppointmentsTable appointments={appointments} />
      <CustomerDocumentsTable documents={documents} />
    </div>
  )
}
