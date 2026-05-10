import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { userId, fullName } = await request.json()

    const supabase = await createClient()

    // Create profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        user_id: userId,
        full_name: fullName,
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
      .single()

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