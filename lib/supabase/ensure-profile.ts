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

  const meta = user.user_metadata as { full_name?: string } | undefined
  const fullName = meta?.full_name?.trim() || user.email?.split('@')[0] || 'Kunde'

  const { error: insertError } = await supabase.from('profiles').insert({
    user_id: user.id,
    full_name: fullName,
    email: user.email ?? '',
  })

  if (insertError && insertError.code !== '23505' && !/duplicate/i.test(insertError.message ?? '')) {
    console.error('getOrCreateProfileId insert', insertError)
  }

  const { data: row } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  return row?.id ?? null
}
