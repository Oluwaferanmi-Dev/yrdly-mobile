import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { type, content, bucket } = await req.json()

    // 1. Validate auth via Supabase JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Missing authorization header' }), { 
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    const token = authHeader.replace(/^Bearer\s+/i, '')
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    )
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid or expired token' }), { 
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    const apiUser = Deno.env.get('SIGHTENGINE_API_USER')
    const apiSecret = Deno.env.get('SIGHTENGINE_API_SECRET')
    if (!apiUser || !apiSecret) {
      console.error('Sightengine credentials missing')
      return new Response(JSON.stringify({ error: 'Internal server error' }), { 
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      })
    }

    // 2. Text Moderation
    if (type === 'text') {
      const textToModerate = Array.isArray(content) ? content.join(' ') : content;
      if (!textToModerate.trim()) {
        return new Response(JSON.stringify({ isSafe: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      const formData = new FormData()
      formData.append('text', textToModerate)
      formData.append('lang', 'en')
      formData.append('mode', 'rules')
      formData.append('api_user', apiUser)
      formData.append('api_secret', apiSecret)

      const response = await fetch('https://api.sightengine.com/1.0/text/check.json', {
        method: 'POST',
        body: formData,
      })

      const data = await response.json()
      if (data.status !== 'success') {
        console.error('Sightengine Text API error:', data)
        return new Response(JSON.stringify({ isSafe: false, reason: 'moderation_error' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }) 
      }

      // Check profanity, personal info, extremis, etc. based on rules
      // Sightengine returns profanity in `profanity.matches`
      const isProfane = data.profanity?.matches?.length > 0;
      
      if (isProfane) {
         return new Response(JSON.stringify({ isSafe: false, reason: 'inappropriate_language' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      return new Response(JSON.stringify({ isSafe: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 3. Image Moderation
    if (type === 'image') {
      const paths = Array.isArray(content) ? content : [content];
      if (paths.length === 0) {
         return new Response(JSON.stringify({ isSafe: true, urls: [] }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      // target bucket is where it should go if safe
      const targetBucket = bucket || 'post-images';

      // Need Admin Client to generate signed URLs and move files across buckets securely
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      const finalUrls = [];

      for (const path of paths) {
        let storagePath = path;
        let storageBucket = 'pending-moderation'; // Defaults to pending

        // If the client passed a full URL, parse it
        if (path.includes('/storage/v1/object/public/')) {
           const parts = path.split('/storage/v1/object/public/')[1].split('/');
           storageBucket = parts[0];
           storagePath = parts.slice(1).join('/');
        } else if (path.includes('/storage/v1/object/sign/')) {
           const parts = path.split('/storage/v1/object/sign/')[1].split('/');
           storageBucket = parts[0];
           storagePath = parts.slice(1).join('/');
        }

        if (!storagePath) continue;

        // Generate signed URL for Sightengine
        const { data: signedData, error: signError } = await supabaseAdmin.storage.from(storageBucket).createSignedUrl(storagePath, 60)
        
        if (signError || !signedData?.signedUrl) {
          console.error(`Failed to sign image ${storagePath} from ${storageBucket}`, signError);
          // Fail closed: leave in pending, return error
          return new Response(JSON.stringify({ isSafe: false, reason: 'moderation_error' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        // Send to Sightengine via URL
        const queryParams = new URLSearchParams({
          models: 'nudity-2.0,gore,wad,offensive',
          api_user: apiUser,
          api_secret: apiSecret,
          url: signedData.signedUrl
        });

        const response = await fetch(`https://api.sightengine.com/1.0/check.json?${queryParams.toString()}`, {
          method: 'GET'
        });
        const data = await response.json();
        
        if (data.status !== 'success') {
           console.error('Sightengine Image API error:', data);
           // Fail closed: leave in pending, return error
           return new Response(JSON.stringify({ isSafe: false, reason: 'moderation_error' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        // Determine safety
        let isSafe = true;
        
        if (data.nudity) {
          if (data.nudity.sexual_activity > 0.5 || data.nudity.sexual_display > 0.5 || data.nudity.erotica > 0.5) {
             isSafe = false;
          }
        }
        if (data.gore && data.gore.prob > 0.5) isSafe = false;
        if (data.wad && data.wad.weapon > 0.5) isSafe = false;
        if (data.wad && data.wad.drugs > 0.5) isSafe = false;
        if (data.offensive && data.offensive.prob > 0.5) isSafe = false;

        if (!isSafe) {
           // Move to quarantine
           const quarantinePath = `${user.id}/${Date.now()}_${storagePath.replace(/\\//g, '_')}`;
           
           await supabaseAdmin.storage.from(storageBucket).copy(storagePath, quarantinePath, { destinationBucket: 'quarantine' });
           await supabaseAdmin.storage.from(storageBucket).remove([storagePath]);

           return new Response(JSON.stringify({ isSafe: false, reason: 'inappropriate_image' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        } else {
           // Safe: Move to target public bucket
           await supabaseAdmin.storage.from(storageBucket).copy(storagePath, storagePath, { destinationBucket: targetBucket });
           await supabaseAdmin.storage.from(storageBucket).remove([storagePath]);
           const { data: publicData } = supabaseAdmin.storage.from(targetBucket).getPublicUrl(storagePath);
           finalUrls.push(publicData.publicUrl);
        }
      }

      return new Response(JSON.stringify({ isSafe: true, urls: finalUrls }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    return new Response(JSON.stringify({ error: 'Invalid type' }), { 
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    })

  } catch (error: any) {
    console.error(error)
    return new Response(JSON.stringify({ error: `Edge Function Error: ${error.message}` }), { 
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
