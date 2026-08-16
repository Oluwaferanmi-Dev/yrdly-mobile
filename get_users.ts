import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);

async function checkUsers() {
  const emails = ['boluwatielasisi240@gmail.com', 'feranmioyelowo.dev@gmail.com', 'feranmioyelowo@gmail.com', 'vickysalami04@gmail.com'];
  
  // Try to find the users in the profiles table by username or handle or email if there is an email column
  const { data, error } = await supabase.from('profiles').select('*');
  if (error) {
    console.error(error);
  } else {
    console.log("Found", data?.length, "profiles. Checking fields for email matches or exact matches.");
    console.log(data?.[0]);
  }
}

checkUsers();
