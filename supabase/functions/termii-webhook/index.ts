import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  // Termii sends POST requests
  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 })
  }

  try {
    const payload = await req.json()
    
    // We use the Service Role Key because this is a server-to-server 
    // call from Termii. There is no logged-in user.
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { error } = await supabase.from('sms_delivery_logs').insert({
      message_id: payload.message_id || 'unknown',
      receiver: payload.receiver || null,
      status: payload.status || 'unknown',
      network: payload.network || null,
      full_payload: payload
    })

    if (error) {
      console.error('Failed to log webhook:', error)
      // We still return 200 so Termii doesn't keep retrying unnecessarily
      return new Response('OK', { status: 200 })
    }

    return new Response('OK', { status: 200 })
  } catch (error: any) {
    console.error('Webhook processing error:', error)
    return new Response('OK', { status: 200 })
  }
})
