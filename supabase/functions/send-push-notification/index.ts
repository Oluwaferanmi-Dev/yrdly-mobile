import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, unknown>;
  url?: string;
  badge?: number;
}

serve(async (req) => {
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { userId, payload } = await req.json() as {
      userId: string;
      payload: PushPayload;
    };

    if (!userId || !payload) {
      return new Response(JSON.stringify({ error: 'Missing userId or payload' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Init Supabase admin client to read the user's push token
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Fetch the push token for this user
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('push_token')
      .eq('id', userId)
      .single();

    if (userError || !userData?.push_token) {
      console.log(`No push token found for user ${userId}:`, userError?.message);
      return new Response(JSON.stringify({ success: false, reason: 'no_token' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const pushToken = userData.push_token;

    // Validate it's a real Expo push token
    if (!pushToken.startsWith('ExponentPushToken[') && !pushToken.startsWith('ExpoPushToken[')) {
      console.log(`Invalid push token format for user ${userId}: ${pushToken}`);
      return new Response(JSON.stringify({ success: false, reason: 'invalid_token_format' }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Send via Expo Push Notification Service
    const expoPayload = {
      to: pushToken,
      title: payload.title,
      body: payload.body,
      sound: 'default',
      badge: payload.badge ?? 1,
      data: {
        ...(payload.data ?? {}),
        url: payload.url ?? '/',
      },
      channelId: 'default',
      priority: 'high',
    };

    const expoResponse = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Accept-Encoding': 'gzip, deflate',
      },
      body: JSON.stringify(expoPayload),
    });

    const expoResult = await expoResponse.json();
    console.log('Expo push result:', JSON.stringify(expoResult));

    // Check for token errors and clean up invalid tokens
    if (expoResult?.data?.status === 'error') {
      const details = expoResult.data.details;
      if (details?.error === 'DeviceNotRegistered') {
        // Token is no longer valid — clear it so we stop sending to it
        console.log(`Clearing invalid push token for user ${userId}`);
        await supabaseAdmin
          .from('users')
          .update({ push_token: null })
          .eq('id', userId);
      }
      return new Response(JSON.stringify({ success: false, reason: details?.error }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ success: true, result: expoResult }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    console.error('send-push-notification error:', err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
