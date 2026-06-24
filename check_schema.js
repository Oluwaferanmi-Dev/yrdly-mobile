require('dotenv').config({ path: '.env' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.from('messages').select('*').limit(1);
  console.log('Fields:', data && data.length > 0 ? Object.keys(data[0]) : 'no data or error');
}
check();
