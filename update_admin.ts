import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

// TO THE USER: 
// To run this script, you must replace the EXPO_PUBLIC_SUPABASE_ANON_KEY 
// in your .env file with your SUPABASE_SERVICE_ROLE_KEY temporarily, 
// OR run this directly in your Supabase SQL editor using SQL commands.
const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
);

async function main() {
  const emails = [
    'boluwatielasisi240@gmail.com', 
    'feranmioyelowo.dev@gmail.com', 
    'feranmioyelowo@gmail.com', 
    'vickysalami04@gmail.com'
  ];
  
  for (const email of emails) {
    const { data: users, error } = await supabase.from('users').select('*').ilike('email', email);
    if (error) {
      console.error(`Error querying ${email}:`, error);
      continue;
    }
    if (!users || users.length === 0) {
      console.log(`User not found: ${email}`);
      continue;
    }
    
    for (const user of users) {
      console.log(`Found ${user.email} (ID: ${user.id}). Updating...`);
      const { data: updated, error: updateErr } = await supabase
        .from('users')
        .update({ phone_verified: true, verified: true, is_admin: true })
        .eq('id', user.id)
        .select();
        
      if (updateErr) {
        console.error(`Failed to update ${email}:`, updateErr.message);
      } else {
        console.log(`Successfully updated ${email}`);
      }
    }
  }
}

main();
