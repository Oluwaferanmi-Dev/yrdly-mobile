import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
async function main() {
  const { data: posts, error: postErr } = await supabase.from('posts').select('*').limit(1);
  console.log('Posts:', posts ? Object.keys(posts[0] || {}) : postErr);
  
  const { data: users, error: userErr } = await supabase.from('users').select('*').limit(1);
  console.log('Users:', users ? Object.keys(users[0] || {}) : userErr);

  const { data: biz, error: bizErr } = await supabase.from('businesses').select('*').limit(1);
  console.log('Businesses:', biz ? Object.keys(biz[0] || {}) : bizErr);
  
  // also get the first post to see if there's a 5 rating
  console.log('First user:', users?.[0]);
  console.log('First biz:', biz?.[0]);
}
main();
