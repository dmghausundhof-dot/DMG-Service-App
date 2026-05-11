import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { userId, fullName, phone } = await request.json()
    const normalizedPhone =
      typeof phone === 'string' && phone.trim().length > 0 ? phone.trim() : null

    const supabase = await createClient()

    // Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        user_id: userId,
        full_name: fullName,
        phone: normalizedPhone,
        email: '',
      })

    if (profileError && !profileError.message.includes('duplicate')) {
      console.error('Profile error:', profileError)
    }

    // Get profile id
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()

    if (profile) {
      // Create first object "Mein Haus"
      await supabase.from('objects').insert({
        profile_id: profile.id,
        name: 'Mein Haus',
        street: '',
        postal_code: '',
        city: 'Wiesloch',
        notes: 'Automatisch angelegtes Haupt-Objekt. Bitte Adresse und Details ergänzen.',
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Create profile error:', error)
    return NextResponse.json({ success: false }, { status: 500 })
  }
}