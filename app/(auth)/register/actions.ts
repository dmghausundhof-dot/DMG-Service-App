'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createProfileAndFirstObject(userId: string, fullName: string) {
  const supabase = await createClient()

  // 1. Create profile
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({
      user_id: userId,
      full_name: fullName,
      email: '', // Will be updated from auth
    })

  if (profileError) {
    console.error('Profile creation error:', profileError)
    return { error: profileError.message }
  }

  // 2. Get the profile id
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (!profile) {
    return { error: 'Profile not found after creation' }
  }

  // 3. Create first object "Mein Haus"
  const { error: objectError } = await supabase
    .from('objects')
    .insert({
      profile_id: profile.id,
      name: 'Mein Haus',
      street: '',
      postal_code: '',
      city: 'Wiesloch',
      notes: 'Automatisch angelegtes Haupt-Objekt. Bitte Adresse ergänzen.',
    })

  if (objectError) {
    console.error('Object creation error:', objectError)
    return { error: objectError.message }
  }

  return { success: true }
}