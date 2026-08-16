import fs from 'fs';
import path from 'path';

async function run() {
  const envContent = fs.readFileSync('.env', 'utf-8');
  let supabaseUrl = '';
  let supabaseKey = '';
  for (const line of envContent.split('\n')) {
    if (line.startsWith('EXPO_PUBLIC_SUPABASE_URL=')) supabaseUrl = line.split('=')[1].trim();
    if (line.startsWith('EXPO_PUBLIC_SUPABASE_ANON_KEY=')) supabaseKey = line.split('=')[1].trim();
  }

  const { createClient } = await import('@supabase/supabase-js');
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data: profileData, error: profileError } = await supabase
    .from('users')
    .select('is_admin')
    .limit(1);
  
  if (profileError) {
    console.log('is_admin check failed:', profileError.message);
  } else {
    console.log('is_admin exists on users!');
  }

  const tables = ['events', 'businesses', 'catalog_items'];
  for (const table of tables) {
    const { error } = await supabase.from(table).select('moderation_status').limit(1);
    if (error) {
        console.log(`moderation_status check failed on ${table}:`, error.message);
    } else {
        console.log(`moderation_status exists on ${table}!`);
    }
  }

  const { data: queueData, error: queueError } = await supabase
    .from('moderation_queue')
    .select('*')
    .limit(1);
  
  if (queueError) {
    console.log('moderation_queue check failed:', queueError.message);
  } else {
    console.log('moderation_queue table exists!');
  }
}
run();
