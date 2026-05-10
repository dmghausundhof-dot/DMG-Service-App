'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export async function confirmAppointment(
  appointmentId: string,
  schedule: { preferred_date: string; time_window?: string | null },
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Nicht angemeldet')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    throw new Error('Keine Admin-Berechtigung')
  }

  const d = schedule.preferred_date?.trim()
  if (!d || !DATE_RE.test(d)) {
    throw new Error('Bitte ein gültiges Datum auswählen.')
  }

  const { data: row, error: readErr } = await supabase
    .from('appointments')
    .select('id, status')
    .eq('id', appointmentId)
    .single()

  if (readErr || !row) {
    throw new Error('Termin nicht gefunden')
  }

  if (!['requested', 'reschedule_requested'].includes(row.status)) {
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

  revalidatePath('/dashboard/admin/appointments')
  return { success: true, message: 'Termin eingeplant und bestätigt.' }
}

export async function rejectAppointment(appointmentId: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Nicht angemeldet')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    throw new Error('Keine Admin-Berechtigung')
  }

  const { error } = await supabase
    .from('appointments')
    .update({ 
      status: 'cancelled',
      updated_at: new Date().toISOString()
    })
    .eq('id', appointmentId)

  if (error) throw new Error(`Fehler beim Ablehnen: ${error.message}`)

  revalidatePath('/dashboard/admin/appointments')
  return { success: true, message: 'Anfrage abgelehnt.' }
}

export async function acceptReschedule(appointmentId: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Nicht angemeldet')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    throw new Error('Keine Admin-Berechtigung')
  }

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

  revalidatePath('/dashboard/admin/appointments')
  return { success: true, message: 'Änderung erfolgreich übernommen! Termin wurde verschoben.' }
}

export async function rejectReschedule(appointmentId: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Nicht angemeldet')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    throw new Error('Keine Admin-Berechtigung')
  }

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

  revalidatePath('/dashboard/admin/appointments')
  return { success: true, message: 'Änderungswunsch abgelehnt. Termin bleibt bestehen.' }
}

export async function updateAdminNote(appointmentId: string, note: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Nicht angemeldet')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (profile?.role !== 'admin') {
    throw new Error('Keine Admin-Berechtigung')
  }

  const { error } = await supabase
    .from('appointments')
    .update({ 
      admin_notes: note.trim() || null,
      updated_at: new Date().toISOString()
    })
    .eq('id', appointmentId)

  if (error) throw new Error(`Fehler beim Speichern der Notiz: ${error.message}`)

  revalidatePath('/dashboard/admin/appointments')
  return { success: true }
}
