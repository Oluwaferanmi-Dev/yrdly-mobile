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
        return new Response(JSON.stringify({ isSafe: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }) // Fail open to not block users
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
         return new Response(JSON.stringify({ isSafe: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }

      // Need Admin Client to download and move files across buckets securely
      const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      )

      for (const path of paths) {
        let storagePath = path;
        let storageBucket = bucket;

        if (path.includes('/storage/v1/object/public/')) {
           const parts = path.split('/storage/v1/object/public/')[1].split('/');
           storageBucket = parts[0];
           storagePath = parts.slice(1).join('/');
        }

        if (!storageBucket || !storagePath) continue;

        // Download the file
        const { data: fileBlob, error: downloadError } = await supabaseAdmin.storage.from(storageBucket).download(storagePath)
        
        if (downloadError || !fileBlob) {
          console.error(`Failed to download image ${storagePath} from ${storageBucket}`, downloadError);
          continue; // Fail open or skip
        }

        // Send to Sightengine
        const formData = new FormData();
        formData.append('media', fileBlob, 'image.jpg');
        formData.append('models', 'nudity-2.0,gore,wad,offensive');
        formData.append('api_user', apiUser);
        formData.append('api_secret', apiSecret);

        const response = await fetch('https://api.sightengine.com/1.0/check.json', {
          method: 'POST',
          body: formData,
        })
        const data = await response.json();
        
        if (data.status !== 'success') {
           console.error('Sightengine Image API error:', data);
           continue;
        }

        // Determine safety
        let isSafe = true;
        
        if (data.nudity) {
          if (data.nudity.sexual_activity > 0.5 || data.nudity.sexual_display > 0.5 || data.nudity.erotica > 0.5) {
             isSafe = false;
          }
        }
        if (data.gore && data.gore.prob > 0.5) isSafe = false;
        if (data.weapon && data.weapon > 0.5) isSafe = false;
        if (data.drugs && data.drugs > 0.5) isSafe = false;
        if (data.offensive && data.offensive.prob > 0.5) isSafe = false;

        if (!isSafe) {
           // Move to quarantine
           const quarantinePath = `${user.id}/${Date.now()}_${storagePath.replace(/\\//g, '_')}`;
           
           const arrayBuffer = await fileBlob.arrayBuffer();
           await supabaseAdmin.storage.from('quarantine').upload(quarantinePath, arrayBuffer);
           
           // Delete original
           await supabaseAdmin.storage.from(storageBucket).remove([storagePath]);

           return new Response(JSON.stringify({ isSafe: false, reason: 'inappropriate_image' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
      }

      return new Response(JSON.stringify({ isSafe: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
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
