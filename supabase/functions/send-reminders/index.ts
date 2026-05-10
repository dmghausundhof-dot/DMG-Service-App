/**
 * Früher: Erinnerungen an next_maintenance_due.
 * Wartungs-Follow-up wurde Produkt-seitig entfernt — die Funktion antwortet leer (Cron kann bestehen bleiben).
 */

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    if (!supabaseUrl || !serviceRole) {
      throw new Error('SUPABASE_URL oder SUPABASE_SERVICE_ROLE_KEY fehlt')
    }

    return new Response(
      JSON.stringify({
        success: true,
        sent: 0,
        totalProfilesChecked: 0,
        message: 'Wartungserinnerungen sind deaktiviert (kein Wartungskalender mehr).',
        results: [],
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
