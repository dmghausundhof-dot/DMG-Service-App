import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import { Resend } from 'npm:resend@4.0.1'

type ProfileRow = {
  id: string
  user_id: string
  full_name: string | null
  email: string | null
  reminder_email: boolean | null
  reminder_whatsapp: boolean | null
  reminder_days_before: number | null
  whatsapp_phone: string | null
}

type AssetRow = {
  id: string
  name: string
  next_maintenance_due: string
  objects?: { id: string; name: string; profile_id: string } | { id: string; name: string; profile_id: string }[] | null
}

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function embeddedObjectName(asset: AssetRow): string {
  const o = asset.objects
  if (!o) return 'Unbekannt'
  const row = Array.isArray(o) ? o[0] : o
  return row?.name ?? 'Unbekannt'
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    const resendKey = Deno.env.get('RESEND_API_KEY') ?? ''

    if (!supabaseUrl || !serviceRole) {
      throw new Error('SUPABASE_URL oder SUPABASE_SERVICE_ROLE_KEY fehlt')
    }
    if (!resendKey) {
      throw new Error('RESEND_API_KEY fehlt')
    }

    const supabase = createClient(supabaseUrl, serviceRole)
    const resend = new Resend(resendKey)

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, user_id, full_name, email, reminder_email, reminder_whatsapp, reminder_days_before, whatsapp_phone')
      .or('reminder_email.eq.true,reminder_whatsapp.eq.true')

    if (profilesError) throw profilesError

    let sentCount = 0
    const results: Array<Record<string, unknown>> = []

    for (const profile of (profiles ?? []) as ProfileRow[]) {
      const days = profile.reminder_days_before ?? 7
      const dueThreshold = new Date(today)
      dueThreshold.setDate(dueThreshold.getDate() + days)
      const dueThresholdStr = dueThreshold.toISOString().split('T')[0]

      const { data: assets, error: assetsError } = await supabase
        .from('assets')
        .select(
          `
          id,
          name,
          next_maintenance_due,
          last_maintenance,
          objects!inner (id, name, profile_id)
        `,
        )
        .eq('objects.profile_id', profile.id)
        .not('next_maintenance_due', 'is', null)
        .lte('next_maintenance_due', dueThresholdStr)
        .order('next_maintenance_due', { ascending: true })

      if (assetsError) {
        console.error(`Assets error for profile ${profile.id}:`, assetsError)
        continue
      }

      const assetRows = (assets ?? []) as AssetRow[]
      if (assetRows.length === 0) continue

      const assetList = assetRows
        .map((asset) => {
          const dueDate = new Date(asset.next_maintenance_due)
          const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 3600 * 24))
          const status = diffDays < 0 ? 'ÜBERFÄLLIG' : `in ${diffDays} Tagen`
          return `• ${asset.name} (Objekt: ${embeddedObjectName(asset)}) – ${status} (${dueDate.toLocaleDateString('de-DE')})`
        })
        .join('\n')

      const customerName = profile.full_name ?? 'Kunde'
      const subject =
        `🔔 Wartungserinnerung: ${assetRows.length} Anlage(n) bald fällig – ${customerName}`

      const htmlContent = `
        <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #10b981;">Hallo ${customerName},</h2>
          <p>Wir möchten Sie freundlich daran erinnern, dass folgende Anlagen in Kürze gewartet werden sollten:</p>
          <div style="background: #f8fafc; padding: 16px; border-radius: 12px; margin: 20px 0; border-left: 4px solid #10b981;">
            <pre style="margin: 0; white-space: pre-wrap; font-size: 14px; line-height: 1.5;">${assetList}</pre>
          </div>
          <p>Bitte melden Sie sich in Ihrem <a href="https://dmg-service-app.vercel.app/dashboard" style="color: #10b981; text-decoration: none;">Kundenportal</a> an, um einen Wartungstermin zu buchen oder weitere Details einzusehen.</p>
          <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
            Viele Grüße,<br/>
            Ihr DMG Service Team<br/>
            <a href="https://dmgservice.org" style="color: #10b981;">dmgservice.org</a>
          </p>
        </div>
      `

      const fromAddr = Deno.env.get('RESEND_FROM_EMAIL') ?? 'DMG Service <reminders@resend.dev>'

      if (profile.reminder_email && profile.email) {
        const { error: sendError } = await resend.emails.send({
          from: fromAddr,
          to: [profile.email],
          subject,
          html: htmlContent,
        })

        if (sendError) {
          console.error(`Failed to send email to ${profile.email}:`, sendError)
          results.push({
            profileId: profile.id,
            email: profile.email,
            success: false,
            error: typeof sendError === 'object' && sendError !== null && 'message' in sendError
              ? String((sendError as { message?: string }).message)
              : String(sendError),
          })
        } else {
          sentCount++
          results.push({ profileId: profile.id, email: profile.email, success: true })
        }
      }

      if (profile.reminder_whatsapp && profile.whatsapp_phone) {
        console.log(`[TODO] WhatsApp reminder to ${profile.whatsapp_phone} for ${assetRows.length} assets`)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent: sentCount,
        totalProfilesChecked: profiles?.length ?? 0,
        results,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error: unknown) {
    console.error('Reminder function error:', error)
    const message = error instanceof Error ? error.message : String(error)
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
