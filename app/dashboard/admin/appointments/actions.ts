'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const ACTIVE_PIPELINE_STATUSES = ['requested', 'reschedule_requested', 'confirmed', 'in_progress'] as const

async function requireAdminSupabase() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('Nicht angemeldet')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    throw new Error('Keine Admin-Berechtigung')
  }
  return supabase
}

async function fetchAppointmentStatus(supabase: Awaited<ReturnType<typeof createClient>>, appointmentId: string) {
  const { data: row, error: readErr } = await supabase
    .from('appointments')
    .select('id, status')
    .eq('id', appointmentId)
    .single()

  if (readErr || !row) {
    throw new Error('Termin nicht gefunden')
  }
  return row.status as string
}

function revalidateAdminPaths(appointmentId?: string) {
  revalidatePath('/dashboard/admin/appointments')
  if (appointmentId) revalidatePath(`/dashboard/appointments/${appointmentId}`)
}

export async function confirmAppointment(
  appointmentId: string,
  schedule: { preferred_date: string; time_window?: string | null },
) {
  const supabase = await requireAdminSupabase()

  const d = schedule.preferred_date?.trim()
  if (!d || !DATE_RE.test(d)) {
    throw new Error('Bitte ein gültiges Datum auswählen.')
  }

  const status = await fetchAppointmentStatus(supabase, appointmentId)
  if (!['requested', 'reschedule_requested'].includes(status)) {
    throw new Error('Termin kann in diesem Status nicht eingeplant werden.')
  }

  const { error } = await supabase
    .from('appointments')
    .update({
      status: 'confirmed',
      preferred_date: d,
      time_window: schedule.time_window?.trim() || null,
      proposed_preferred_date: null,
      proposed_time_window: null,
      reschedule_reason: null,
      reschedule_requested_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', appointmentId)

  if (error) throw new Error(`Fehler beim Einplanen: ${error.message}`)

  revalidateAdminPaths(appointmentId)
  return { success: true, message: 'Termin eingeplant und bestätigt.' }
}

export async function rejectAppointment(appointmentId: string) {
  const supabase = await requireAdminSupabase()
  const status = await fetchAppointmentStatus(supabase, appointmentId)
  if (!ACTIVE_PIPELINE_STATUSES.includes(status as (typeof ACTIVE_PIPELINE_STATUSES)[number])) {
    throw new Error('Termin kann in diesem Status nicht abgelehnt werden.')
  }

  const { error } = await supabase
    .from('appointments')
    .update({ 
      status: 'cancelled',
      updated_at: new Date().toISOString()
    })
    .eq('id', appointmentId)

  if (error) throw new Error(`Fehler beim Ablehnen: ${error.message}`)

  revalidateAdminPaths(appointmentId)
  return { success: true, message: 'Anfrage abgelehnt.' }
}

export async function acceptReschedule(appointmentId: string) {
  const supabase = await requireAdminSupabase()

  // Get current appointment to copy proposed values
  const { data: appt } = await supabase
    .from('appointments')
    .select('proposed_preferred_date, proposed_time_window')
    .eq('id', appointmentId)
    .single()

  if (!appt?.proposed_preferred_date) {
    throw new Error('Kein vorgeschlagenes Datum vorhanden')
  }

  const { error } = await supabase
    .from('appointments')
    .update({ 
      status: 'rescheduled',
      preferred_date: appt.proposed_preferred_date,
      time_window: appt.proposed_time_window,
      proposed_preferred_date: null,
      proposed_time_window: null,
      reschedule_reason: null,
      reschedule_requested_at: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', appointmentId)

  if (error) throw new Error(`Fehler beim Akzeptieren der Änderung: ${error.message}`)

  revalidateAdminPaths(appointmentId)
  return { success: true, message: 'Änderung erfolgreich übernommen! Termin wurde verschoben.' }
}

export async function rejectReschedule(appointmentId: string) {
  const supabase = await requireAdminSupabase()

  const { error } = await supabase
    .from('appointments')
    .update({ 
      status: 'confirmed', // Zurück zum bestätigten Status
      proposed_preferred_date: null,
      proposed_time_window: null,
      reschedule_reason: null,
      reschedule_requested_at: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', appointmentId)

  if (error) throw new Error(`Fehler beim Ablehnen der Änderung: ${error.message}`)

  revalidateAdminPaths(appointmentId)
  return { success: true, message: 'Änderungswunsch abgelehnt. Termin bleibt bestehen.' }
}

export async function updateAdminNote(appointmentId: string, note: string) {
  const supabase = await requireAdminSupabase()

  const { error } = await supabase
    .from('appointments')
    .update({ 
      admin_notes: note.trim() || null,
      updated_at: new Date().toISOString()
    })
    .eq('id', appointmentId)

  if (error) throw new Error(`Fehler beim Speichern der Notiz: ${error.message}`)

  revalidateAdminPaths(appointmentId)
  return { success: true }
}

export async function startAppointment(appointmentId: string) {
  const supabase = await requireAdminSupabase()
  const status = await fetchAppointmentStatus(supabase, appointmentId)
  if (!['confirmed', 'rescheduled'].includes(status)) {
    throw new Error('Nur bestätigte Termine können gestartet werden.')
  }

  const { error } = await supabase
    .from('appointments')
    .update({
      status: 'in_progress',
      updated_at: new Date().toISOString(),
    })
    .eq('id', appointmentId)

  if (error) throw new Error(`Fehler beim Starten: ${error.message}`)
  revalidateAdminPaths(appointmentId)
  return { success: true, message: 'Termin als in Bearbeitung markiert.' }
}

export async function completeAppointment(appointmentId: string) {
  const supabase = await requireAdminSupabase()
  const status = await fetchAppointmentStatus(supabase, appointmentId)
  if (!['in_progress', 'confirmed', 'rescheduled'].includes(status)) {
    throw new Error('Dieser Termin kann nicht abgeschlossen werden.')
  }

  const { error } = await supabase
    .from('appointments')
    .update({
      status: 'completed',
      updated_at: new Date().toISOString(),
    })
    .eq('id', appointmentId)

  if (error) throw new Error(`Fehler beim Abschließen: ${error.message}`)
  revalidateAdminPaths(appointmentId)
  return { success: true, message: 'Termin abgeschlossen.' }
}
