import fetch from 'node-fetch';
import dotenv from 'dotenv';
dotenv.config({ path: '.env' });

async function main() {
  const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/rest/v1/?apikey=${process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY}`;
  const response = await fetch(url);
  const data = await response.json();
  
  // Find users and businesses definitions
  const usersDef = data.definitions?.users;
  const bizDef = data.definitions?.businesses;
  
  console.log('Users:', JSON.stringify(usersDef?.properties?.rating, null, 2));
  console.log('Businesses:', JSON.stringify(bizDef?.properties?.rating, null, 2));
}
main();
