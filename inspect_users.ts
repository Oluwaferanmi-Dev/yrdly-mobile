import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);

async function main() {
  const { data: users, error } = await supabase.from('users').select('*').limit(3);
  if (error) {
    console.error(error);
  } else {
    console.log(users);
  }
}

main();
