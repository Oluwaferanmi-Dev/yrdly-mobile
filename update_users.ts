import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY! // Oops, we might need service_role key to update, but let's see if we can do it via RPC or if it's protected by RLS
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
      // Update phone_verified and is_admin
      // Note: is_admin might be named differently, let's check user object keys
      const updateData: any = { phone_verified: true, verified: true };
      
      // Let's print keys to see if role or is_admin exists
      if ('is_admin' in user || true) { // We'll just try updating is_admin
        updateData.is_admin = true;
      }
      
      const { data: updated, error: updateErr } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', user.id)
        .select();
        
      if (updateErr) {
        console.error(`Failed to update ${email} (RLS issue?):`, updateErr.message);
      } else {
        console.log(`Successfully updated ${email}:`, updated?.[0]);
      }
    }
  }
}

main();
