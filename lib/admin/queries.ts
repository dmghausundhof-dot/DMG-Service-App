import type { SupabaseClient } from '@supabase/supabase-js'
import { requireAdmin } from '@/lib/admin/require-admin'

type SupabaseServerClient = Awaited<ReturnType<typeof requireAdmin>>['supabase']

export type AdminKpis = {
  openRequests: number
  confirmedThisWeek: number
  overdueFollowUps: number
  newDocuments: number
}

export type AdminObservabilityKpis = {
  medianRequestedToConfirmedHours: number | null
  medianConfirmedToCompletedHours: number | null
  completedWithoutReportCount: number
  linkedDocumentsRatio: number
}

export type AdminInboxItem = {
  kind: 'requested' | 'reschedule_requested' | 'confirmed_stale' | 'completed_missing_report'
  appointmentId: string
  objectId: string
  serviceType: string
  status: string
  preferredDate: string | null
  objectName: string | null
  objectCity: string | null
  ageDays: number
}

export type DocumentQualityRow = {
  id: string
  type: string
  title: string
  object_id: string
  appointment_id: string | null
  asset_id: string | null
  created_at: string | null
  objects?: { name: string; city: string | null } | null
}

export type CustomerListItem = {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  created_at: string | null
  objectCount: number
  assetCount: number
  openRequestCount: number
  documentCount: number
  cityPreview: string[]
}

export type CustomerFilters = {
  search?: string
}

export type CustomerProfile = {
  id: string
  full_name: string
  email: string | null
  phone: string | null
  notes: string | null
  created_at: string | null
}

export type CustomerObject = {
  id: string
  profile_id: string
  name: string
  city: string | null
  street: string | null
  postal_code: string | null
  created_at: string | null
}

export type CustomerAsset = {
  id: string
  object_id: string
  name: string
  category: string
  manufacturer: string | null
  model: string | null
  image_url: string | null
  created_at: string | null
}

export type CustomerAppointment = {
  id: string
  object_id: string
  service_type: string
  preferred_date: string | null
  time_window: string | null
  status: string
  created_at: string | null
  objects?: {
    name: string
    city: string | null
  } | null
}

export type CustomerDocument = {
  id: string
  object_id: string
  type: string
  title: string
  file_url: string
  created_at: string | null
  objects?: {
    name: string
    city: string | null
  } | null
}

export const EMPTY_UUID_FILTER = '00000000-0000-0000-0000-000000000000'

export function toInFilter(values: string[]): string[] {
  return values.length > 0 ? values : [EMPTY_UUID_FILTER]
}

export function getWeekDateRange(baseDate = new Date()): {
  startYmd: string
  endYmd: string
} {
  const reference = new Date(baseDate)
  const day = reference.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day

  const start = new Date(reference)
  start.setDate(reference.getDate() + mondayOffset)
  start.setHours(0, 0, 0, 0)

  const end = new Date(start)
  end.setDate(start.getDate() + 6)

  return {
    startYmd: start.toISOString().slice(0, 10),
    endYmd: end.toISOString().slice(0, 10),
  }
}

async function countExact(
  label: string,
  query: PromiseLike<{ count: number | null; error: { message: string } | null }>,
): Promise<number> {
  const { count, error } = await query
  if (error) {
    throw new Error(`Admin-Query "${label}" fehlgeschlagen: ${error.message}`)
  }
  return count ?? 0
}

function countOpenRequests(supabase: SupabaseServerClient): Promise<number> {
  return countExact(
    'open_requests',
    supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .in('status', ['requested', 'reschedule_requested']),
  )
}

function countConfirmedThisWeek(supabase: SupabaseServerClient): Promise<number> {
  const { startYmd, endYmd } = getWeekDateRange()
  return countExact(
    'confirmed_this_week',
    supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'confirmed')
      .gte('preferred_date', startYmd)
      .lte('preferred_date', endYmd),
  )
}

function countOverdueFollowUps(supabase: SupabaseServerClient): Promise<number> {
  const today = new Date().toISOString().slice(0, 10)
  return countExact(
    'overdue_follow_ups',
    supabase
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .in('status', ['requested', 'reschedule_requested', 'confirmed', 'in_progress'])
      .lt('preferred_date', today),
  )
}

function countNewDocuments(supabase: SupabaseServerClient): Promise<number> {
  const since = new Date()
  since.setDate(since.getDate() - 7)
  return countExact(
    'new_documents',
    supabase
      .from('documents')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', since.toISOString()),
  )
}

function median(values: number[]): number | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  if (sorted.length % 2 === 0) {
    return (sorted[middle - 1] + sorted[middle]) / 2
  }
  return sorted[middle]
}

export async function getAdminKpis(): Promise<AdminKpis> {
  const { supabase } = await requireAdmin()
  const [openRequests, confirmedThisWeek, overdueFollowUps, newDocuments] =
    await Promise.all([
      countOpenRequests(supabase),
      countConfirmedThisWeek(supabase),
      countOverdueFollowUps(supabase),
      countNewDocuments(supabase),
    ])

  return {
    openRequests,
    confirmedThisWeek,
    overdueFollowUps,
    newDocuments,
  }
}

export function asServerClient(client: SupabaseServerClient): SupabaseClient {
  return client as SupabaseClient
}

export async function getAdminInboxItems(): Promise<AdminInboxItem[]> {
  const { supabase } = await requireAdmin()
  const now = new Date()
  const staleThreshold = new Date(now)
  staleThreshold.setDate(staleThreshold.getDate() - 3)

  const [appointmentsRes, reportDocsRes] = await Promise.all([
    supabase
      .from('appointments')
      .select('id, object_id, service_type, status, preferred_date, created_at, updated_at, objects(name, city)')
      .in('status', ['requested', 'reschedule_requested', 'confirmed', 'completed'])
      .order('created_at', { ascending: true })
      .limit(250),
    supabase
      .from('documents')
      .select('id, appointment_id, type')
      .eq('type', 'report')
      .not('appointment_id', 'is', null),
  ])

  if (appointmentsRes.error) {
    throw new Error(`Inbox konnte nicht geladen werden: ${appointmentsRes.error.message}`)
  }
  if (reportDocsRes.error) {
    throw new Error(`Belegdaten für Inbox fehlgeschlagen: ${reportDocsRes.error.message}`)
  }

  const reportAppointmentIds = new Set<string>(
    (reportDocsRes.data ?? [])
      .map((row) => row.appointment_id as string | null)
      .filter((id): id is string => Boolean(id)),
  )

  const toAgeDays = (dateString: string | null | undefined) => {
    if (!dateString) return 0
    const then = new Date(dateString)
    return Math.max(0, Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24)))
  }

  const out: AdminInboxItem[] = []
  for (const row of appointmentsRes.data ?? []) {
    const status = row.status as string
    const object = normalizeEmbedded(
      row.objects as { name: string; city: string | null } | { name: string; city: string | null }[] | null,
    )
    const preferredDate = (row.preferred_date as string | null) ?? null
    const createdAt = (row.created_at as string | null) ?? null
    const updatedAt = (row.updated_at as string | null) ?? createdAt
    const base = {
      appointmentId: row.id as string,
      objectId: row.object_id as string,
      serviceType: row.service_type as string,
      status,
      preferredDate,
      objectName: object?.name ?? null,
      objectCity: object?.city ?? null,
      ageDays: toAgeDays(createdAt),
    }

    if (status === 'requested' || status === 'reschedule_requested') {
      out.push({ kind: status, ...base })
      continue
    }

    if (status === 'confirmed') {
      const staleByDate = preferredDate ? new Date(preferredDate) < staleThreshold : false
      const staleByUpdate = updatedAt ? new Date(updatedAt) < staleThreshold : false
      if (staleByDate || staleByUpdate) {
        out.push({ kind: 'confirmed_stale', ...base, ageDays: toAgeDays(updatedAt) })
      }
      continue
    }

    if (status === 'completed' && !reportAppointmentIds.has(row.id as string)) {
      out.push({ kind: 'completed_missing_report', ...base, ageDays: toAgeDays(updatedAt) })
    }
  }

  return out.sort((a, b) => b.ageDays - a.ageDays)
}

export async function getAdminObservabilityKpis(): Promise<AdminObservabilityKpis> {
  const { supabase } = await requireAdmin()

  const [appointmentsRes, documentsRes] = await Promise.all([
    supabase
      .from('appointments')
      .select('id, status, created_at, updated_at')
      .in('status', ['requested', 'reschedule_requested', 'confirmed', 'in_progress', 'completed']),
    supabase
      .from('documents')
      .select('id, appointment_id, asset_id'),
  ])

  if (appointmentsRes.error) {
    throw new Error(`Observability-Query appointments fehlgeschlagen: ${appointmentsRes.error.message}`)
  }
  if (documentsRes.error) {
    throw new Error(`Observability-Query documents fehlgeschlagen: ${documentsRes.error.message}`)
  }

  const appointments = appointmentsRes.data ?? []
  const docs = documentsRes.data ?? []

  const reportLinks = new Set<string>(
    docs
      .map((d) => d.appointment_id as string | null)
      .filter((id): id is string => Boolean(id)),
  )

  const requestedToConfirmedHours: number[] = []
  const confirmedToCompletedHours: number[] = []
  let completedWithoutReportCount = 0

  for (const appt of appointments) {
    const createdAt = appt.created_at ? new Date(String(appt.created_at)) : null
    const updatedAt = appt.updated_at ? new Date(String(appt.updated_at)) : null
    const status = String(appt.status)
    if (createdAt && updatedAt && status === 'confirmed') {
      requestedToConfirmedHours.push((updatedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60))
    }
    if (createdAt && updatedAt && status === 'completed') {
      confirmedToCompletedHours.push((updatedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60))
      if (!reportLinks.has(String(appt.id))) completedWithoutReportCount++
    }
  }

  const linkedDocuments = docs.filter((d) => Boolean(d.appointment_id) || Boolean(d.asset_id)).length
  const linkedDocumentsRatio = docs.length > 0 ? linkedDocuments / docs.length : 0

  return {
    medianRequestedToConfirmedHours: median(requestedToConfirmedHours),
    medianConfirmedToCompletedHours: median(confirmedToCompletedHours),
    completedWithoutReportCount,
    linkedDocumentsRatio,
  }
}

export async function getDocumentQualityRows(): Promise<{
  unlinkedBusinessDocs: DocumentQualityRow[]
  completedWithoutReport: Array<{ id: string; object_id: string; service_type: string; preferred_date: string | null }>
}> {
  const { supabase } = await requireAdmin()
  const [docsRes, completedRes] = await Promise.all([
    supabase
      .from('documents')
      .select('id, type, title, object_id, appointment_id, asset_id, created_at, objects(name, city)')
      .in('type', ['offer', 'invoice', 'report', 'other'])
      .order('created_at', { ascending: false })
      .limit(400),
    supabase
      .from('appointments')
      .select('id, object_id, service_type, preferred_date')
      .eq('status', 'completed')
      .order('updated_at', { ascending: false })
      .limit(250),
  ])

  if (docsRes.error) throw new Error(`Dokumenten-Qualität konnte nicht geladen werden: ${docsRes.error.message}`)
  if (completedRes.error) throw new Error(`Terminqualität konnte nicht geladen werden: ${completedRes.error.message}`)

  const docs = (docsRes.data ?? []).map((row) => ({
    id: row.id as string,
    type: row.type as string,
    title: row.title as string,
    object_id: row.object_id as string,
    appointment_id: (row.appointment_id as string | null) ?? null,
    asset_id: (row.asset_id as string | null) ?? null,
    created_at: (row.created_at as string | null) ?? null,
    objects: normalizeEmbedded(row.objects as { name: string; city: string | null } | { name: string; city: string | null }[] | null),
  }))

  const unlinkedBusinessDocs = docs.filter((d) => !d.appointment_id && !d.asset_id)
  const reportByAppointmentId = new Set(
    docs
      .filter((d) => d.type === 'report' && d.appointment_id)
      .map((d) => d.appointment_id as string),
  )

  const completedWithoutReport = (completedRes.data ?? []).filter(
    (row) => !reportByAppointmentId.has(String(row.id)),
  ) as Array<{ id: string; object_id: string; service_type: string; preferred_date: string | null }>

  return { unlinkedBusinessDocs, completedWithoutReport }
}

function normalizeEmbedded<T>(raw: T | T[] | null | undefined): T | null {
  if (!raw) return null
  return Array.isArray(raw) ? raw[0] ?? null : raw
}

function searchMatchesCustomer(customer: CustomerListItem, term: string): boolean {
  const low = term.toLowerCase()
  return (
    customer.full_name.toLowerCase().includes(low) ||
    (customer.email?.toLowerCase().includes(low) ?? false) ||
    (customer.phone?.toLowerCase().includes(low) ?? false) ||
    customer.cityPreview.some((city) => city.toLowerCase().includes(low))
  )
}

export async function getCustomersList(filters: CustomerFilters = {}): Promise<CustomerListItem[]> {
  const { supabase } = await requireAdmin()

  const { data: profilesData, error: profilesError } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone, created_at, role')
    .eq('role', 'customer')
    .order('created_at', { ascending: false })

  if (profilesError) {
    throw new Error(`Kundenliste konnte nicht geladen werden: ${profilesError.message}`)
  }

  const profiles = (profilesData ?? []).map((p) => ({
    id: p.id as string,
    full_name: (p.full_name as string | null) ?? 'Kunde',
    email: (p.email as string | null) ?? null,
    phone: (p.phone as string | null) ?? null,
    created_at: (p.created_at as string | null) ?? null,
  }))

  if (profiles.length === 0) return []

  const profileIds = profiles.map((p) => p.id)
  const { data: objectsData, error: objectsError } = await supabase
    .from('objects')
    .select('id, profile_id, city')
    .in('profile_id', toInFilter(profileIds))

  if (objectsError) {
    throw new Error(`Objektdaten konnten nicht geladen werden: ${objectsError.message}`)
  }

  const objects = (objectsData ?? []).map((o) => ({
    id: o.id as string,
    profile_id: o.profile_id as string,
    city: (o.city as string | null) ?? null,
  }))

  const objectIds = objects.map((o) => o.id)

  const [assetsRes, appointmentsRes, documentsRes] = await Promise.all([
    supabase
      .from('assets')
      .select('id, object_id')
      .in('object_id', toInFilter(objectIds)),
    supabase
      .from('appointments')
      .select('id, object_id, status')
      .in('object_id', toInFilter(objectIds)),
    supabase
      .from('documents')
      .select('id, object_id')
      .in('object_id', toInFilter(objectIds)),
  ])

  if (assetsRes.error) throw new Error(`Anlagen konnten nicht geladen werden: ${assetsRes.error.message}`)
  if (appointmentsRes.error) {
    throw new Error(`Termine konnten nicht geladen werden: ${appointmentsRes.error.message}`)
  }
  if (documentsRes.error) throw new Error(`Belege konnten nicht geladen werden: ${documentsRes.error.message}`)

  const objectToProfile = new Map<string, string>()
  const profileToCities = new Map<string, Set<string>>()
  const profileToObjectCount = new Map<string, number>()
  for (const obj of objects) {
    objectToProfile.set(obj.id, obj.profile_id)
    profileToObjectCount.set(obj.profile_id, (profileToObjectCount.get(obj.profile_id) ?? 0) + 1)
    if (obj.city) {
      const bag = profileToCities.get(obj.profile_id) ?? new Set<string>()
      bag.add(obj.city)
      profileToCities.set(obj.profile_id, bag)
    }
  }

  const profileToAssetCount = new Map<string, number>()
  for (const row of assetsRes.data ?? []) {
    const pid = objectToProfile.get(row.object_id as string)
    if (!pid) continue
    profileToAssetCount.set(pid, (profileToAssetCount.get(pid) ?? 0) + 1)
  }

  const profileToOpenRequestCount = new Map<string, number>()
  for (const row of appointmentsRes.data ?? []) {
    const pid = objectToProfile.get(row.object_id as string)
    if (!pid) continue
    const status = row.status as string | null
    if (status === 'requested' || status === 'reschedule_requested') {
      profileToOpenRequestCount.set(pid, (profileToOpenRequestCount.get(pid) ?? 0) + 1)
    }
  }

  const profileToDocumentCount = new Map<string, number>()
  for (const row of documentsRes.data ?? []) {
    const pid = objectToProfile.get(row.object_id as string)
    if (!pid) continue
    profileToDocumentCount.set(pid, (profileToDocumentCount.get(pid) ?? 0) + 1)
  }

  const customers = profiles.map<CustomerListItem>((p) => ({
    id: p.id,
    full_name: p.full_name,
    email: p.email,
    phone: p.phone,
    created_at: p.created_at,
    objectCount: profileToObjectCount.get(p.id) ?? 0,
    assetCount: profileToAssetCount.get(p.id) ?? 0,
    openRequestCount: profileToOpenRequestCount.get(p.id) ?? 0,
    documentCount: profileToDocumentCount.get(p.id) ?? 0,
    cityPreview: [...(profileToCities.get(p.id) ?? new Set<string>())].slice(0, 4),
  }))

  const term = filters.search?.trim()
  if (!term) return customers
  return customers.filter((c) => searchMatchesCustomer(c, term))
}

export async function getCustomerDetail(profileId: string): Promise<CustomerProfile | null> {
  const { supabase } = await requireAdmin()
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, phone, notes, created_at, role')
    .eq('id', profileId)
    .eq('role', 'customer')
    .maybeSingle()

  if (error) throw new Error(`Kundendetails konnten nicht geladen werden: ${error.message}`)
  if (!data) return null
  return {
    id: data.id as string,
    full_name: (data.full_name as string | null) ?? 'Kunde',
    email: (data.email as string | null) ?? null,
    phone: (data.phone as string | null) ?? null,
    notes: (data.notes as string | null) ?? null,
    created_at: (data.created_at as string | null) ?? null,
  }
}

export async function getCustomerObjects(profileId: string): Promise<CustomerObject[]> {
  const { supabase } = await requireAdmin()
  const { data, error } = await supabase
    .from('objects')
    .select('id, profile_id, name, city, street, postal_code, created_at')
    .eq('profile_id', profileId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Kundenobjekte konnten nicht geladen werden: ${error.message}`)
  return (data ?? []) as CustomerObject[]
}

export async function getCustomerAssets(profileId: string): Promise<CustomerAsset[]> {
  const { supabase } = await requireAdmin()
  const { data, error } = await supabase
    .from('assets')
    .select('id, object_id, name, category, manufacturer, model, image_url, created_at, objects!inner(profile_id)')
    .eq('objects.profile_id', profileId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Kundenanlagen konnten nicht geladen werden: ${error.message}`)

  return (data ?? []).map((row) => ({
    id: row.id as string,
    object_id: row.object_id as string,
    name: row.name as string,
    category: row.category as string,
    manufacturer: (row.manufacturer as string | null) ?? null,
    model: (row.model as string | null) ?? null,
    image_url: (row.image_url as string | null) ?? null,
    created_at: (row.created_at as string | null) ?? null,
  }))
}

export async function getCustomerAppointments(profileId: string): Promise<CustomerAppointment[]> {
  const { supabase } = await requireAdmin()
  const { data, error } = await supabase
    .from('appointments')
    .select(
      'id, object_id, service_type, preferred_date, time_window, status, created_at, objects!inner(name, city, profile_id)',
    )
    .eq('objects.profile_id', profileId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Kundentermine konnten nicht geladen werden: ${error.message}`)

  return (data ?? []).map((row) => ({
    id: row.id as string,
    object_id: row.object_id as string,
    service_type: row.service_type as string,
    preferred_date: (row.preferred_date as string | null) ?? null,
    time_window: (row.time_window as string | null) ?? null,
    status: row.status as string,
    created_at: (row.created_at as string | null) ?? null,
    objects: normalizeEmbedded(row.objects as { name: string; city: string | null } | { name: string; city: string | null }[] | null),
  }))
}

export async function getCustomerDocuments(profileId: string): Promise<CustomerDocument[]> {
  const { supabase } = await requireAdmin()
  const { data, error } = await supabase
    .from('documents')
    .select('id, object_id, type, title, file_url, created_at, objects!inner(name, city, profile_id)')
    .eq('objects.profile_id', profileId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Kundenbelege konnten nicht geladen werden: ${error.message}`)

  return (data ?? []).map((row) => ({
    id: row.id as string,
    object_id: row.object_id as string,
    type: row.type as string,
    title: row.title as string,
    file_url: row.file_url as string,
    created_at: (row.created_at as string | null) ?? null,
    objects: normalizeEmbedded(row.objects as { name: string; city: string | null } | { name: string; city: string | null }[] | null),
  }))
}
