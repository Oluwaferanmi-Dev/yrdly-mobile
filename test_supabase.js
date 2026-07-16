const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase
    .from('posts')
    .select('*')
    .eq('category', 'For Sale')
    .or('is_sold.eq.false,is_sold.is.null');
  
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Marketplace count:', data.length);
  }
}
run();
