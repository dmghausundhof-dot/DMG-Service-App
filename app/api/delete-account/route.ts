import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { createClient as createServerSupabase } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/admin'
import { DELETE_ACCOUNT_CONFIRM_PHRASE } from '@/lib/delete-account-constants'

type Body = {
  password: string
  confirmText: string
}

/**
 * Löscht Storage-Dateien, ruft DB-RPC auf und entfernt den Auth-User (CASCADE auf profiles, objects, …).
 * Erfordert aktuelles Passwort + Bestätigungstext.
 */
export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as Body
    const password = body.password?.trim()
    const confirmText = body.confirmText?.trim()

    if (!password) {
      return NextResponse.json({ error: 'Passwort fehlt.' }, { status: 400 })
    }
    if (confirmText !== DELETE_ACCOUNT_CONFIRM_PHRASE) {
      return NextResponse.json(
        { error: `Bestätigungstext muss exakt lauten: ${DELETE_ACCOUNT_CONFIRM_PHRASE}` },
        { status: 400 },
      )
    }

    const supabase = await createServerSupabase()
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()
    if (userError || !user?.id || !user.email) {
      return NextResponse.json({ error: 'Nicht angemeldet.' }, { status: 401 })
    }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    const verifyClient = createClient(url, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const { error: pwError } = await verifyClient.auth.signInWithPassword({
      email: user.email,
      password,
    })
    if (pwError) {
      return NextResponse.json({ error: 'Passwort ist nicht korrekt.' }, { status: 403 })
    }

    let adminClient: ReturnType<typeof createServiceRoleClient>
    try {
      adminClient = createServiceRoleClient()
    } catch (e) {
      console.error('delete-account: service role missing', e)
      return NextResponse.json(
        { error: 'Server-Konfiguration unvollständig (Service Role).' },
        { status: 503 },
      )
    }

    const { error: rpcError } = await adminClient.rpc('delete_user_storage_objects', {
      p_user_id: user.id,
    })
    if (rpcError) {
      console.error('delete_user_storage_objects:', rpcError)
      return NextResponse.json(
        { error: 'Speicherdaten konnten nicht vollständig gelöscht werden: ' + rpcError.message },
        { status: 500 },
      )
    }

    const { error: delAuthError } = await adminClient.auth.admin.deleteUser(user.id)
    if (delAuthError) {
      console.error('admin.deleteUser:', delAuthError)
      return NextResponse.json(
        { error: 'Konto konnte nicht gelöscht werden: ' + delAuthError.message },
        { status: 500 },
      )
    }

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error('delete-account:', e)
    return NextResponse.json({ error: 'Unerwarteter Fehler.' }, { status: 500 })
  }
}
