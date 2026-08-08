import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const envPath = path.resolve('.env.local');
let env = '';
if (fs.existsSync(envPath)) {
  env = fs.readFileSync(envPath, 'utf8');
} else if (fs.existsSync('.env')) {
  env = fs.readFileSync('.env', 'utf8');
}

const urlMatch = env.match(/EXPO_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/EXPO_PUBLIC_SUPABASE_ANON_KEY=(.*)/);

const url = urlMatch ? urlMatch[1].trim() : '';
const key = keyMatch ? keyMatch[1].trim() : '';

console.log("URL:", url);
