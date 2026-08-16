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
    const { queue_id, decision, notes } = await req.json()

    if (!queue_id || !decision || !['approved', 'rejected'].includes(decision)) {
        return new Response(JSON.stringify({ error: 'Invalid payload' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Missing authorization header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const token = authHeader.replace(/^Bearer\s+/i, '')
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid or expired token' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Check if user is admin
    const { data: profile } = await supabaseClient.from('users').select('is_admin').eq('id', user.id).single();
    if (!profile || !profile.is_admin) {
        return new Response(JSON.stringify({ error: 'Forbidden: Admin access required' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const supabaseAdmin = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get the queue item
    const { data: queueItem, error: queueError } = await supabaseAdmin.from('moderation_queue').select('*').eq('id', queue_id).single();
    if (queueError || !queueItem) {
        return new Response(JSON.stringify({ error: 'Queue item not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (queueItem.status !== 'pending' && queueItem.status !== 'moderation_error') {
        return new Response(JSON.stringify({ error: 'Item already reviewed' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const targetBucketMap: Record<string, string> = {
        'posts': 'post-images',
        'events': 'post-images',
        'businesses': 'post-images',
        'catalog_items': 'catalog-items',
        'users': 'user-avatars'
    };
    
    const targetBucket = targetBucketMap[queueItem.table_name];

    let finalUrls: string[] = [];

    // Handle Image copies
    if (queueItem.image_urls && queueItem.image_urls.length > 0) {
        for (const url of queueItem.image_urls) {
            if (!url) continue;
            let storageBucket = 'pending-moderation';
            let storagePath = url;
            if (url.includes('/storage/v1/object/public/')) {
                const parts = url.split('/storage/v1/object/public/')[1].split('/');
                storageBucket = parts[0];
                storagePath = parts.slice(1).join('/');
            } else if (url.includes('/storage/v1/object/sign/')) {
                const parts = url.split('/storage/v1/object/sign/')[1].split('/');
                storageBucket = parts[0];
                storagePath = parts.slice(1).join('/');
            }

            if (decision === 'approved' && targetBucket) {
                // Move from pending to target bucket
                await supabaseAdmin.storage.from(storageBucket).copy(storagePath, storagePath, { destinationBucket: targetBucket });
                const { data: publicData } = supabaseAdmin.storage.from(targetBucket).getPublicUrl(storagePath);
                finalUrls.push(publicData.publicUrl);
                await supabaseAdmin.storage.from(storageBucket).remove([storagePath]);
            } else if (decision === 'rejected') {
                // Move to quarantine
                const quarantinePath = `${queueItem.user_id}/${Date.now()}_${storagePath.replace(/\\//g, '_')}`;
                await supabaseAdmin.storage.from(storageBucket).copy(storagePath, quarantinePath, { destinationBucket: 'quarantine' });
                await supabaseAdmin.storage.from(storageBucket).remove([storagePath]);
            }
        }
    }

    // Update target table
    let updatePayload: any = { moderation_status: decision };
    if (decision === 'approved' && finalUrls.length > 0) {
        if (queueItem.table_name === 'users') {
            updatePayload.avatar_url = finalUrls[0];
        } else if (queueItem.table_name === 'catalog_items') {
            updatePayload.images = finalUrls;
        } else {
            updatePayload.image_urls = finalUrls;
            if (queueItem.table_name === 'events') {
                updatePayload.cover_image_url = finalUrls[0];
            }
        }
    }
    
    const { error: updateError } = await supabaseAdmin.from(queueItem.table_name).update(updatePayload).eq('id', queueItem.content_id);
    if (updateError) {
        console.error('Failed to update source table', updateError);
        return new Response(JSON.stringify({ error: 'Failed to update content' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Update queue item
    await supabaseAdmin.from('moderation_queue').update({
        status: decision,
        reviewed_at: new Date().toISOString(),
        reviewer_id: user.id,
        notes: notes || null
    }).eq('id', queue_id);

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (error: any) {
    console.error(error)
    return new Response(JSON.stringify({ error: `Edge Function Error: ${error.message}` }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})
