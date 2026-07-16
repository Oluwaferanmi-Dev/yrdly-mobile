const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase
    .from('posts')
    .select('*, user:users!posts_user_id_fkey(id,name,avatar_url)')
    .eq('category', 'For Sale')
    .or('is_sold.eq.false,is_sold.is.null');
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Marketplace items:', data.length);
    console.log(data.map(i => ({ id: i.id, title: i.title, created_at: i.timestamp })));
  }
}
run();
