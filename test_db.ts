import { supabase } from './src/lib/supabase';
async function test() {
  const { data } = await supabase.from('posts').select('id, title, event_date').eq('category', 'Event').limit(5);
  console.log(data);
}
test();
