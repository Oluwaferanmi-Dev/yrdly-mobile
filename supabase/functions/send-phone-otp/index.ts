import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

// Fallback for CORS if needed, but usually Edge Functions handle this via a wrapper or direct
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { phone } = await req.json()
    
    // Auth guard: only allow authenticated users
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { 
        status: 401, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // Validate Nigerian phone format (+234...)
    const normalized = phone.startsWith('+') ? phone.slice(1) : phone
    if (!normalized.startsWith('234') || normalized.length < 13) {
      return new Response(JSON.stringify({ error: 'Invalid phone number' }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const termiiUrl = Deno.env.get('TERMII_BASE_URL') || 'https://v4.api.termii.com'

    const res = await fetch(`${termiiUrl}/api/sms/otp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: Deno.env.get('TERMII_API_KEY'),
        message_type: 'NUMERIC',
        to: normalized,
        from: 'N-Alert', // Fallback until Yrdly is approved
        channel: 'dnd',
        pin_attempts: 3,
        pin_time_to_live: 10,
        pin_length: 6,
        pin_placeholder: '< 1234 >',
        message_text: 'Your Yrdly verification code is < 1234 >. Expires in 10 mins.',
      }),
    })

    const data = await res.json()
    
    if (data.smsStatus !== 'Message Sent') {
      console.error('Termii send error:', data)
      return new Response(JSON.stringify({ error: 'Failed to send SMS' }), { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Return pinId to client
    return new Response(JSON.stringify({ pinId: data.pinId }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error(error)
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
