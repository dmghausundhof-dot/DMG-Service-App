import { createClient } from '@/lib/supabase/server'
import { getOrCreateProfileId } from '@/lib/supabase/ensure-profile'
import Link from 'next/link'
import { Calendar, Wrench, FileText, ArrowRight, Plus, MapPin } from 'lucide-react'

export default async function DashboardOverview() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) {
    // Redirect or show login prompt (in real app use middleware)
    return <div>Bitte anmelden...</div>
  }

  const profileId = await getOrCreateProfileId(supabase, user)
  if (!profileId) {
    return <div>Profil konnte nicht geladen werden. Bitte Seite neu laden oder den Support kontaktieren.</div>
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('id', profileId)
    .maybeSingle()

  const userName = profile?.full_name?.split(' ')[0] || user.email?.split('@')[0] || 'Kunde'

  // Get user's object IDs
  let objectIds: string[] = []
  const { data: userObjects } = await supabase
    .from('objects')
    .select('id')
    .eq('profile_id', profileId)
  objectIds = userObjects?.map(o => o.id) || []

  // Fetch real counts from Supabase
  const { count: totalObjects = 0 } = await supabase
    .from('objects')
    .select('*', { count: 'exact', head: true })
    .eq('profile_id', profileId)

  const { count: totalAssets = 0 } = await supabase
    .from('assets')
    .select('*', { count: 'exact', head: true })
    .in('object_id', objectIds.length > 0 ? objectIds : ['00000000-0000-0000-0000-000000000000'])

  const today = new Date().toISOString().split('T')[0]
  const { count: upcomingAppointments = 0 } = await supabase
    .from('appointments')
    .select('*', { count: 'exact', head: true })
    .in('object_id', objectIds.length > 0 ? objectIds : ['00000000-0000-0000-0000-000000000000'])
    .not('preferred_date', 'is', null)
    .gte('preferred_date', today)
    .not('status', 'eq', 'completed')

  const { count: overdueMaintenances = 0 } = await supabase
    .from('assets')
    .select('*', { count: 'exact', head: true })
    .in('object_id', objectIds.length > 0 ? objectIds : ['00000000-0000-0000-0000-000000000000'])
    .lt('next_maintenance_due', today)

  const { count: openDocuments = 0 } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true })
    .in('object_id', objectIds.length > 0 ? objectIds : ['00000000-0000-0000-0000-000000000000'])

  // Full data for object-specific widgets
  const { data: objectsRows } = await supabase
    .from('objects')
    .select('id, name, street, city')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })
  const objects = objectsRows ?? []

  const { data: assetsRows } = await supabase
    .from('assets')
    .select('id, name, object_id, next_maintenance_due')
    .in('object_id', objectIds.length > 0 ? objectIds : ['00000000-0000-0000-0000-000000000000'])
  const assets = assetsRows ?? []

  const { data: appointmentsRows } = await supabase
    .from('appointments')
    .select('id, object_id, preferred_date, status')
    .in('object_id', objectIds.length > 0 ? objectIds : ['00000000-0000-0000-0000-000000000000'])
  const appointments = appointmentsRows ?? []

  return (
    <div className="max-w-6xl mx-auto">
      {/* Welcome Header */}
      <div className="mb-6 lg:mb-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="mb-1.5 text-xs font-semibold tracking-[2px] text-emerald-500 sm:text-sm sm:mb-2">
              WILLKOMMEN ZURÜCK
            </div>
            <h1 className="text-3xl font-semibold tracking-tighter sm:text-4xl lg:text-5xl">
              Guten Morgen, {userName}.
            </h1>
            <p className="mt-2 text-base text-slate-400 sm:mt-3 sm:text-lg lg:text-xl">
              Hier ist der aktuelle Stand Ihrer Anlagen und Termine.
            </p>
          </div>

          <Link
            href="/dashboard/appointments/new"
            className="btn-primary hidden shrink-0 items-center gap-3 md:flex"
          >
            <Calendar className="h-5 w-5" />
            Neuen Termin anfragen
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:mb-10 lg:grid-cols-4 lg:gap-6">
        <div className="card group p-5 transition-all hover:border-emerald-500/50 sm:p-6 lg:p-8">
          <div className="mb-4 flex items-center justify-between sm:mb-5 lg:mb-6">
            <div className="text-emerald-500">
              <Wrench className="h-7 w-7 sm:h-8 sm:w-8" />
            </div>
            <div className="text-4xl font-semibold tabular-nums tracking-tighter text-emerald-400 lg:text-5xl">{totalAssets}</div>
          </div>
          <div className="text-lg font-semibold sm:text-xl">Sie haben {totalAssets} wartungsintensive Anlagen</div>
          <p className="mt-1.5 text-sm text-slate-400">Balkonkraftwerk, Heizung, Filter etc.</p>
        </div>

        <div className="card group p-5 transition-all hover:border-emerald-500/50 sm:p-6 lg:p-8">
          <div className="mb-4 flex items-center justify-between sm:mb-5 lg:mb-6">
            <div className="text-emerald-500">
              <Calendar className="h-7 w-7 sm:h-8 sm:w-8" />
            </div>
            <div className="text-4xl font-semibold tabular-nums tracking-tighter text-emerald-400 lg:text-5xl">{upcomingAppointments}</div>
          </div>
          <div className="text-lg font-semibold sm:text-xl">Sie haben {upcomingAppointments} anstehende Termine</div>
          <p className="mt-1.5 text-sm text-slate-400">Nächster: Filterwechsel Balkonkraftwerk am 18.05.</p>
        </div>

        <div className="card group p-5 transition-all hover:border-red-500/50 sm:p-6 lg:p-8">
          <div className="mb-4 flex items-center justify-between sm:mb-5 lg:mb-6">
            <div className="text-red-500">
              <Wrench className="h-7 w-7 sm:h-8 sm:w-8" />
            </div>
            <div className="text-4xl font-semibold tabular-nums tracking-tighter text-red-400 lg:text-5xl">{overdueMaintenances ?? 0}</div>
          </div>
          <div className="text-lg font-semibold sm:text-xl">Überfällige Wartungen</div>
          <p className="mt-1.5 text-sm text-slate-400">
            {(overdueMaintenances ?? 0) > 0 ? 'Bitte bald einen Termin vereinbaren!' : 'Alle Wartungen sind aktuell.'}
          </p>
        </div>

        <div className="card group p-5 transition-all hover:border-emerald-500/50 sm:p-6 lg:p-8">
          <div className="mb-4 flex items-center justify-between sm:mb-5 lg:mb-6">
            <div className="text-emerald-500">
              <FileText className="h-7 w-7 sm:h-8 sm:w-8" />
            </div>
            <div className="text-4xl font-semibold tabular-nums tracking-tighter text-emerald-400 lg:text-5xl">{openDocuments}</div>
          </div>
          <div className="text-lg font-semibold sm:text-xl">Sie haben {openDocuments} neue Dokumente</div>
          <p className="mt-1.5 text-sm text-slate-400">Rechnung &amp; Servicebericht verfügbar</p>
        </div>
      </div>

      {/* Objekt-spezifische Dashboard-Widgets */}
      <div className="mb-6 lg:mb-10">
        <div className="mb-4 flex flex-col gap-2 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Ihre Objekte im Überblick</h2>
          <Link href="/dashboard/objects" className="text-sm text-emerald-500 hover:underline flex items-center gap-1">
            Alle Objekte verwalten <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-3 lg:gap-6">
          {objects.length > 0 ? (
            objects.map((obj) => {
              const objAssets = assets.filter(a => a.object_id === obj.id)
              const objAppointments = appointments.filter(
                (a) =>
                  a.object_id === obj.id &&
                  a.status !== 'completed' &&
                  a.preferred_date != null &&
                  String(a.preferred_date) >= today,
              )
              const nextMaint = objAssets
                .filter(a => a.next_maintenance_due)
                .sort((a, b) => new Date(a.next_maintenance_due!).getTime() - new Date(b.next_maintenance_due!).getTime())[0]

              return (
                <div key={obj.id} className="card group p-5 transition-all hover:border-emerald-500/50 sm:p-6">
                  <div className="mb-4 flex items-start justify-between">
                    <div>
                      <div className="text-lg font-semibold tracking-tight transition-colors group-hover:text-emerald-400 sm:text-xl">{obj.name}</div>
                      {(obj.street || obj.city) && (
                        <div className="text-sm text-slate-400 flex items-center gap-1 mt-1">
                          <MapPin className="w-3.5 h-3.5" /> {[obj.street, obj.city].filter(Boolean).join(', ')}
                        </div>
                      )}
                    </div>
                    <Link href={`/dashboard/objects/${obj.id}`} className="text-emerald-500 hover:text-emerald-400">
                      <ArrowRight className="w-5 h-5" />
                    </Link>
                  </div>

                  <div className="grid grid-cols-3 gap-3 text-center mb-4">
                    <div className="bg-slate-800/50 rounded-2xl p-3">
                      <div className="text-2xl font-semibold tabular-nums text-emerald-400">{objAssets.length}</div>
                      <div className="text-[10px] text-slate-400 tracking-widest">ANLAGEN</div>
                    </div>
                    <div className="bg-slate-800/50 rounded-2xl p-3">
                      <div className="text-2xl font-semibold tabular-nums text-emerald-400">{objAppointments.length}</div>
                      <div className="text-[10px] text-slate-400 tracking-widest">TERMINE</div>
                    </div>
                    <div className="bg-slate-800/50 rounded-2xl p-3">
                      <div className="text-2xl font-semibold tabular-nums text-emerald-400">
                        {nextMaint ? new Date(nextMaint.next_maintenance_due!).toLocaleDateString('de-DE', {day: 'numeric', month: 'short'}) : '—'}
                      </div>
                      <div className="text-[10px] text-slate-400 tracking-widest">NÄCHSTE WARTUNG</div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Link href={`/dashboard/assets?object=${obj.id}`} className="flex-1 text-center text-xs py-2 rounded-xl bg-slate-800 hover:bg-slate-700 transition text-slate-300">Anlagen</Link>
                    <Link href={`/dashboard/appointments?object=${obj.id}`} className="flex-1 text-center text-xs py-2 rounded-xl bg-slate-800 hover:bg-slate-700 transition text-slate-300">Termine</Link>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="card col-span-3 p-5 text-center text-sm text-slate-400 sm:p-8 sm:text-base">
              Noch keine Objekte angelegt. <Link href="/dashboard/objects/new" className="text-emerald-400 hover:underline">Jetzt erstes Objekt anlegen →</Link>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-6 lg:mb-10">
        <div className="mb-4 flex items-center justify-between sm:mb-6">
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Schnellzugriff</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2 md:gap-6">
          <Link
            href="/dashboard/assets/new"
            className="card group flex flex-col gap-4 p-5 transition-all hover:border-emerald-500 sm:flex-row sm:items-center sm:justify-between sm:p-8"
          >
            <div className="min-w-0">
              <div className="mb-1 text-lg font-semibold sm:text-2xl sm:mb-2">Neue Anlage hinzufügen</div>
              <p className="text-sm text-slate-400 sm:text-base">
                Per Foto oder manuell – Anlage anlegen und Daten pflegen.
              </p>
            </div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center self-end rounded-2xl bg-emerald-600/10 transition-all group-hover:bg-emerald-600/20 sm:h-14 sm:w-14 sm:self-center">
              <Plus className="h-6 w-6 text-emerald-500 sm:h-7 sm:w-7" />
            </div>
          </Link>

          <Link
            href="/dashboard/objects"
            className="card group flex flex-col gap-4 p-5 transition-all hover:border-emerald-500 sm:flex-row sm:items-center sm:justify-between sm:p-8"
          >
            <div className="min-w-0">
              <div className="mb-1 text-lg font-semibold sm:text-2xl sm:mb-2">Objekte verwalten</div>
              <p className="text-sm text-slate-400 sm:text-base">
                Haus, Wohnung oder Ferienimmobilie – alle Ihre Objekte auf einen Blick.
              </p>
            </div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center self-end rounded-2xl bg-emerald-600/10 transition-all group-hover:bg-emerald-600/20 sm:h-14 sm:w-14 sm:self-center">
              <ArrowRight className="h-6 w-6 text-emerald-500 sm:h-7 sm:w-7" />
            </div>
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <div className="mb-4 flex items-center justify-between sm:mb-6">
          <h2 className="text-xl font-semibold tracking-tight sm:text-2xl">Letzte Aktivitäten</h2>
          <Link href="/dashboard/documents" className="text-sm text-emerald-500 hover:underline flex items-center gap-1">
            Alle ansehen <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="card p-5 sm:p-6 lg:p-8">
          <div className="space-y-4 sm:space-y-6">
            {[
              { date: '08.05.2026', title: 'Servicebericht Balkonkraftwerk', type: 'report', status: 'Neu' },
              { date: '02.05.2026', title: 'Rechnung #INV-2026-047', type: 'invoice', status: 'Bezahlt' },
              { date: '28.04.2026', title: 'Wartung Heizung abgeschlossen', type: 'report', status: 'Abgeschlossen' },
            ].map((item, index) => (
              <div
                key={index}
                className="flex flex-col gap-2 border-b border-slate-800 py-3 last:border-0 sm:flex-row sm:items-center sm:justify-between sm:gap-0 sm:py-4"
              >
                <div className="flex min-w-0 items-center gap-3 sm:gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-800 sm:h-12 sm:w-12">
                    {item.type === 'report' ? <FileText className="w-5 h-5 text-emerald-500" /> : <FileText className="w-5 h-5 text-blue-400" />}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium sm:text-base">{item.title}</div>
                    <div className="text-xs text-slate-500 sm:text-sm">{item.date}</div>
                  </div>
                </div>
                <div className={`self-start px-3 py-1 text-xs font-medium rounded-full sm:self-center sm:px-4 sm:py-1.5 ${
                  item.status === 'Neu' ? 'bg-emerald-600/20 text-emerald-400' : 'bg-slate-700 text-slate-300'
                }`}>
                  {item.status}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
