import { redirect } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

type AdminProfile = {
  id: string
  role: string
  full_name: string | null
  email: string | null
}

export type RequireAdminResult = {
  supabase: Awaited<ReturnType<typeof createClient>>
  user: User
  profile: AdminProfile
}

type RequireAdminOptions = {
  unauthorizedRedirectTo?: string
}

export function isAdminRole(role: string | null | undefined): role is 'admin' {
  return role === 'admin'
}

export async function requireAdmin(
  options: RequireAdminOptions = {},
): Promise<RequireAdminResult> {
  const supabase = await createClient()
  const { unauthorizedRedirectTo = '/dashboard' } = options

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, role, full_name, email')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    throw new Error(`Admin-Pruefung fehlgeschlagen: ${error.message}`)
  }

  if (!profile || !isAdminRole(profile.role)) {
    redirect(unauthorizedRedirectTo)
  }

  return {
    supabase,
    user,
    profile,
  }
}
