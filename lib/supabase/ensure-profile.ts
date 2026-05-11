import type { SupabaseClient, User } from '@supabase/supabase-js'

/**
 * Stellt sicher, dass für den angemeldeten Nutzer eine Zeile in `profiles` existiert.
 * Verhindert PostgREST-406 bei .single(), wenn noch kein Profil angelegt wurde.
 */
export async function getOrCreateProfileId(
  supabase: SupabaseClient,
  authUser?: User | null,
): Promise<string | null> {
  let user = authUser ?? null
  if (!user) {
    const { data: { user: u } } = await supabase.auth.getUser()
    user = u
  }
  if (!user) return null

  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (existing?.id) return existing.id

  const meta = user.user_metadata as { full_name?: string; phone?: string } | undefined
  const fullName = meta?.full_name?.trim() || user.email?.split('@')[0] || 'Kunde'
  const phone = meta?.phone?.trim() || null

  // Upsert ohne Update bei Konflikt: vermeidet 409 Race bei parallelem ersten Login.
  const { error: upsertError } = await supabase.from('profiles').upsert(
    {
      user_id: user.id,
      full_name: fullName,
      phone,
      email: user.email ?? '',
    },
    { onConflict: 'user_id', ignoreDuplicates: true },
  )

  if (upsertError) {
    console.error('getOrCreateProfileId upsert', upsertError)
  }

  const { data: row } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  return row?.id ?? null
}
