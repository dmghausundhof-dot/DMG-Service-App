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
      <div className="mb-10">
        <div className="flex items-end justify-between">
          <div>
            <div className="text-emerald-500 text-sm font-semibold tracking-[2px] mb-2">WILLKOMMEN ZURÜCK</div>
            <h1 className="text-5xl font-semibold tracking-tighter">Guten Morgen, {userName}.</h1>
            <p className="text-xl text-slate-400 mt-3">Hier ist der aktuelle Stand Ihrer Anlagen und Termine.</p>
          </div>
          
          <Link 
            href="/dashboard/appointments/new" 
            className="btn-primary hidden md:flex items-center gap-3 text-base px-8 py-4"
          >
            <Calendar className="w-5 h-5" />
            Neuen Termin anfragen
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <div className="card p-8 group hover:border-emerald-500/50 transition-all">
          <div className="flex items-center justify-between mb-6">
            <div className="text-emerald-500">
              <Wrench className="w-8 h-8" />
            </div>
            <div className="text-5xl font-semibold tabular-nums tracking-tighter text-emerald-400">{totalAssets}</div>
          </div>
          <div className="font-semibold text-xl">Sie haben {totalAssets} wartungsintensive Anlagen</div>
          <p className="text-slate-400 mt-1.5 text-sm">Balkonkraftwerk, Wärmepumpe, Filter etc.</p>
        </div>

        <div className="card p-8 group hover:border-emerald-500/50 transition-all">
          <div className="flex items-center justify-between mb-6">
            <div className="text-emerald-500">
              <Calendar className="w-8 h-8" />
            </div>
            <div className="text-5xl font-semibold tabular-nums tracking-tighter text-emerald-400">{upcomingAppointments}</div>
          </div>
          <div className="font-semibold text-xl">Sie haben {upcomingAppointments} anstehende Termine</div>
          <p className="text-slate-400 mt-1.5 text-sm">Nächster: Filterwechsel Balkonkraftwerk am 18.05.</p>
        </div>

        <div className="card p-8 group hover:border-red-500/50 transition-all">
          <div className="flex items-center justify-between mb-6">
            <div className="text-red-500">
              <Wrench className="w-8 h-8" />
            </div>
            <div className="text-5xl font-semibold tabular-nums tracking-tighter text-red-400">{overdueMaintenances ?? 0}</div>
          </div>
          <div className="font-semibold text-xl">Überfällige Wartungen</div>
          <p className="text-slate-400 mt-1.5 text-sm">{(overdueMaintenances ?? 0) > 0 ? 'Bitte bald einen Termin vereinbaren!' : 'Alle Wartungen sind aktuell.'}</p>
        </div>

        <div className="card p-8 group hover:border-emerald-500/50 transition-all">
          <div className="flex items-center justify-between mb-6">
            <div className="text-emerald-500">
              <FileText className="w-8 h-8" />
            </div>
            <div className="text-5xl font-semibold tabular-nums tracking-tighter text-emerald-400">{openDocuments}</div>
          </div>
          <div className="font-semibold text-xl">Sie haben {openDocuments} neue Dokumente</div>
          <p className="text-slate-400 mt-1.5 text-sm">Rechnung &amp; Servicebericht verfügbar</p>
        </div>
      </div>

      {/* Objekt-spezifische Dashboard-Widgets */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold tracking-tight">Ihre Objekte im Überblick</h2>
          <Link href="/dashboard/objects" className="text-sm text-emerald-500 hover:underline flex items-center gap-1">
            Alle Objekte verwalten <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {objects.length > 0 ? (
            objects.map((obj) => {
              const objAssets = assets.filter(a => a.object_id === obj.id)
              const objAppointments = appointments.filter(a => a.object_id === obj.id && a.status !== 'completed' && new Date(a.preferred_date) >= new Date(today))
              const nextMaint = objAssets
                .filter(a => a.next_maintenance_due)
                .sort((a, b) => new Date(a.next_maintenance_due!).getTime() - new Date(b.next_maintenance_due!).getTime())[0]

              return (
                <div key={obj.id} className="card p-6 hover:border-emerald-500/50 transition-all group">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <div className="font-semibold text-xl tracking-tight group-hover:text-emerald-400 transition-colors">{obj.name}</div>
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
            <div className="col-span-3 card p-8 text-center text-slate-400">
              Noch keine Objekte angelegt. <Link href="/dashboard/objects/new" className="text-emerald-400 hover:underline">Jetzt erstes Objekt anlegen →</Link>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mb-10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold tracking-tight">Schnellzugriff</h2>
        </div>
        
        <div className="grid md:grid-cols-2 gap-6">
          <Link href="/dashboard/assets/new" className="card p-8 group flex items-center justify-between hover:border-emerald-500 transition-all">
            <div>
              <div className="font-semibold text-2xl mb-2">Neue Anlage hinzufügen</div>
              <p className="text-slate-400">Foto hochladen → Grok erkennt automatisch Balkonkraftwerk, Wärmepumpe etc.</p>
            </div>
            <div className="w-14 h-14 bg-emerald-600/10 rounded-2xl flex items-center justify-center group-hover:bg-emerald-600/20 transition-all">
              <Plus className="w-7 h-7 text-emerald-500" />
            </div>
          </Link>

          <Link href="/dashboard/objects" className="card p-8 group flex items-center justify-between hover:border-emerald-500 transition-all">
            <div>
              <div className="font-semibold text-2xl mb-2">Objekte verwalten</div>
              <p className="text-slate-400">Haus, Wohnung oder Ferienimmobilie – alle Ihre Objekte auf einen Blick.</p>
            </div>
            <div className="w-14 h-14 bg-emerald-600/10 rounded-2xl flex items-center justify-center group-hover:bg-emerald-600/20 transition-all">
              <ArrowRight className="w-7 h-7 text-emerald-500" />
            </div>
          </Link>
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold tracking-tight">Letzte Aktivitäten</h2>
          <Link href="/dashboard/documents" className="text-sm text-emerald-500 hover:underline flex items-center gap-1">
            Alle ansehen <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="card p-8">
          <div className="space-y-6">
            {[
              { date: '08.05.2026', title: 'Servicebericht Balkonkraftwerk', type: 'report', status: 'Neu' },
              { date: '02.05.2026', title: 'Rechnung #INV-2026-047', type: 'invoice', status: 'Bezahlt' },
              { date: '28.04.2026', title: 'Wartung Wärmepumpe abgeschlossen', type: 'report', status: 'Abgeschlossen' },
            ].map((item, index) => (
              <div key={index} className="flex items-center justify-between py-4 border-b border-slate-800 last:border-0">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center">
                    {item.type === 'report' ? <FileText className="w-5 h-5 text-emerald-500" /> : <FileText className="w-5 h-5 text-blue-400" />}
                  </div>
                  <div>
                    <div className="font-medium">{item.title}</div>
                    <div className="text-sm text-slate-500">{item.date}</div>
                  </div>
                </div>
                <div className={`px-4 py-1.5 text-xs font-medium rounded-full ${
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
