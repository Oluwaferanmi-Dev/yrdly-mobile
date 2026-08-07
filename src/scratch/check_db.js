import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);
async function main() {
  const { data, error } = await supabase.rpc('get_schema_info'); // Let's just run a generic query if possible? Supabase JS doesn't allow raw SQL easily.
  // Instead, let's fetch a user that has no reviews.
  const { data: users, error: uError } = await supabase.from('users').select('id, name, rating, review_count').limit(10);
  console.log(users);
}
main();
