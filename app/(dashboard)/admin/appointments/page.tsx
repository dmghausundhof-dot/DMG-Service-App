'use client'

import { useState, useTransition, useEffect } from 'react'
import Link from 'next/link'
import { Calendar, Clock, AlertTriangle, CheckCircle, ArrowRight, User, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { 
  confirmAppointment, 
  rejectAppointment, 
  acceptReschedule, 
  rejectReschedule, 
  updateAdminNote 
} from './actions'

interface Appointment {
  id: string
  service_type: string
  preferred_date: string
  time_window: string | null
  urgency: string
  status: string
  description: string | null
  customer_notes: string | null
  admin_notes: string | null
  reschedule_reason: string | null
  proposed_preferred_date: string | null
  proposed_time_window: string | null
  reschedule_requested_at: string | null
  objects: {
    name: string
    city: string | null
  } | null
}

export default function AdminAppointmentsPage() {
  const [appointments, setAppointments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const supabase = createClient()

  const fetchAppointments = async () => {
    setLoading(true)
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      setError('Bitte anmelden...')
      setLoading(false)
      return
    }

    const { data, error: fetchError } = await supabase
      .from('appointments')
      .select(`
        id, 
        service_type, 
        preferred_date, 
        time_window, 
        urgency, 
        status, 
        description, 
        customer_notes,
        admin_notes,
        reschedule_reason,
        proposed_preferred_date,
        proposed_time_window,
        reschedule_requested_at,
        objects (name, city)
      `)
      .in('status', ['requested', 'reschedule_requested'])
      .order('preferred_date', { ascending: true })

    if (fetchError) {
      setError(`Fehler beim Laden der Termine: ${fetchError.message}`)
    } else {
      setAppointments(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchAppointments()
  }, [])

  const openRequests = appointments

  const handleAction = async (action: () => Promise<any>, id: string) => {
    setPendingId(id)
    startTransition(async () => {
      try {
        const result = await action()
        if (result?.success) {
          alert(result.message || 'Erfolgreich!')
          fetchAppointments()
        }
      } catch (err: any) {
        alert(err.message || 'Ein Fehler ist aufgetreten')
      } finally {
        setPendingId(null)
      }
    })
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto p-8 text-center">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-emerald-500" />
        <p className="mt-4 text-slate-400">Lade offene Anfragen...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-8 text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-400">{error}</p>
        <button onClick={fetchAppointments} className="mt-4 btn-secondary">Erneut versuchen</button>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-10 gap-4">
        <div>
          <div className="text-emerald-500 text-sm font-semibold tracking-[2px] mb-2">ADMIN BEREICH</div>
          <h1 className="text-5xl font-semibold tracking-tighter">Offene Anfragen</h1>
          <p className="text-xl text-slate-400 mt-2">
            {openRequests.length} offene Terminanfragen • Bestätigen, Verschieben oder Ablehnen
          </p>
        </div>
        
        <Link 
          href="/dashboard" 
          className="btn-secondary flex items-center gap-2 px-6 py-3 text-sm w-fit"
        >
          ← Zurück zum Dashboard
        </Link>
      </div>

      {openRequests.length === 0 ? (
        <div className="card p-16 text-center">
          <div className="w-20 h-20 bg-emerald-600/10 rounded-3xl flex items-center justify-center mx-auto mb-6">
            <CheckCircle className="w-10 h-10 text-emerald-500" />
          </div>
          <h3 className="text-3xl font-semibold mb-4">Alles erledigt!</h3>
          <p className="text-xl text-slate-400 max-w-md mx-auto">
            Es gibt derzeit keine offenen Terminanfragen oder Änderungswünsche.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {openRequests.map((appt) => {
            const isReschedule = appt.status === 'reschedule_requested'
            const urgencyColor = appt.urgency === 'emergency' ? 'text-red-400' : appt.urgency === 'high' ? 'text-orange-400' : 'text-slate-400'

            return (
              <div key={appt.id} className="card p-8 hover:border-emerald-500/30 transition-all group">
                <div className="flex flex-col lg:flex-row lg:items-start gap-8">
                  {/* Main Info */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-2xl tracking-tight group-hover:text-emerald-400 transition-colors">
                            {appt.service_type}
                          </h3>
                          <div className={`px-3 py-1 rounded-full text-xs font-medium border ${isReschedule ? 'bg-purple-600/20 text-purple-400 border-purple-900/50' : 'bg-amber-600/20 text-amber-400 border-amber-900/50'}`}>
                            {isReschedule ? '🔄 Änderungswunsch' : '🆕 Neue Anfrage'}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                          <Calendar className="w-4 h-4" />
                          {new Date(appt.preferred_date).toLocaleDateString('de-DE', { 
                            weekday: 'long', 
                            day: 'numeric', 
                            month: 'long' 
                          })}
                          {appt.time_window && (
                            <>
                              <span className="mx-1">•</span>
                              <Clock className="w-4 h-4" /> {appt.time_window}
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm mb-6">
                      <div>
                        <div className="text-xs text-slate-500 mb-1">OBJEKT</div>
                        <div className="font-medium">{appt.objects?.name} {appt.objects?.city && `• ${appt.objects.city}`}</div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 mb-1">DRINGLICHKEIT</div>
                        <div className={`font-medium ${urgencyColor}`}>{appt.urgency === 'emergency' ? 'Notfall' : appt.urgency === 'high' ? 'Hoch' : 'Normal'}</div>
                      </div>
                    </div>

                    {appt.description && (
                      <div className="mb-4">
                        <div className="text-xs text-slate-500 mb-1">BESCHREIBUNG</div>
                        <p className="text-slate-300 text-sm line-clamp-2">{appt.description}</p>
                      </div>
                    )}

                    {isReschedule && appt.reschedule_reason && (
                      <div className="mb-4 p-4 bg-purple-950/30 border border-purple-900/50 rounded-2xl">
                        <div className="text-xs text-purple-400 mb-1">BEGRÜNDUNG FÜR ÄNDERUNG</div>
                        <p className="text-sm text-slate-300">{appt.reschedule_reason}</p>
                        {appt.proposed_preferred_date && (
                          <div className="mt-2 text-xs text-purple-400">
                            Gewünscht: {new Date(appt.proposed_preferred_date).toLocaleDateString('de-DE')}
                            {appt.proposed_time_window && ` • ${appt.proposed_time_window}`}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="lg:w-72 flex-shrink-0 space-y-3 pt-2">
                    <div className="text-xs text-slate-500 mb-2">AKTIONEN</div>
                    
                    {appt.status === 'requested' && (
                      <>
                        <button 
                          onClick={() => handleAction(() => confirmAppointment(appt.id), appt.id)}
                          disabled={pendingId === appt.id}
                          className="w-full btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {pendingId === appt.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} 
                          Termin bestätigen
                        </button>
                        <button 
                          onClick={() => handleAction(() => rejectAppointment(appt.id), appt.id)}
                          disabled={pendingId === appt.id}
                          className="w-full px-6 py-3 border border-red-900/50 text-red-400 hover:bg-red-950/50 rounded-2xl transition flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                        >
                          {pendingId === appt.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />} 
                          Anfrage ablehnen
                        </button>
                      </>
                    )}

                    {isReschedule && (
                      <>
                        <button 
                          onClick={() => handleAction(() => acceptReschedule(appt.id), appt.id)}
                          disabled={pendingId === appt.id}
                          className="w-full btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {pendingId === appt.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />} 
                          Änderung akzeptieren
                        </button>
                        <button 
                          onClick={() => handleAction(() => rejectReschedule(appt.id), appt.id)}
                          disabled={pendingId === appt.id}
                          className="w-full px-6 py-3 border border-orange-900/50 text-orange-400 hover:bg-orange-950/50 rounded-2xl transition flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                        >
                          {pendingId === appt.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4" />} 
                          Änderung ablehnen
                        </button>
                      </>
                    )}

                    <Link 
                      href={`/dashboard/appointments/${appt.id}`}
                      className="w-full btn-secondary py-3 flex items-center justify-center gap-2 text-sm"
                    >
                      Details ansehen <ArrowRight className="w-4 h-4" />
                    </Link>

                    {/* Quick admin note */}
                    <div className="pt-3 border-t border-slate-800">
                      <div className="text-xs text-slate-500 mb-1.5">INTERNE NOTIZ</div>
                      <textarea 
                        id={`admin-note-${appt.id}`}
                        placeholder="Notiz fürs Team..."
                        defaultValue={appt.admin_notes || ''}
                        className="input w-full text-xs min-h-[60px] resize-y"
                        onBlur={(e) => {
                          if (e.target.value !== (appt.admin_notes || '')) {
                            handleAction(() => updateAdminNote(appt.id, e.target.value), appt.id)
                          }
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="mt-12 text-center text-xs text-slate-500">
        Tipp: Klicken Sie auf "Details ansehen" für die vollständige Terminansicht und weitere Optionen.
      </div>
    </div>
  )
}
