import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://yoiyqxtpmxnrrbqqidcs.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvaXlxeHRwbXhucnJicXFpZGNzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDEwNjk5OSwiZXhwIjoyMDc1NjgyOTk5fQ.DOV73_zZefY1VoiaxGhaIET5xAXmWgVouBx6-OWFiN8';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false }
});

const TARGET_EMAIL = 'integrityf04@gmail.com';

async function deleteUserData() {
  console.log(`\n🔍 Looking up user: ${TARGET_EMAIL}...\n`);

  // 1. Find the user via admin API
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();
  if (listError) { console.error('Failed to list users:', listError); process.exit(1); }

  const user = users.find(u => u.email === TARGET_EMAIL);
  if (!user) { console.error(`❌ No user found with email: ${TARGET_EMAIL}`); process.exit(1); }

  const userId = user.id;
  console.log(`✅ Found user: ${userId}\n`);

  // 2. Delete from all public tables in dependency order
  const tables = [
    'notifications',
    'messages',
    'conversations',
    'comments',
    'likes',
    'posts',
    'bookmarks',
    'reviews',
    'orders',
    'tickets',
    'event_attendees',
    'friend_requests',
    'marketplace_items',
    'services',
    'businesses',
    'events',
    'users',
  ];

  for (const table of tables) {
    const { error } = await supabase.from(table).delete().eq('user_id', userId);
    const { error: error2 } = await supabase.from(table).delete().eq('id', userId);
    if (error && !error.message.includes('does not exist')) {
      console.warn(`  ⚠️  ${table} (user_id): ${error.message}`);
    } else {
      console.log(`  ✅  Cleaned: ${table}`);
    }
  }

  // 3. Delete auth user
  console.log(`\n🗑️  Deleting auth user from Supabase Auth...`);
  const { error: deleteAuthError } = await supabase.auth.admin.deleteUser(userId);
  if (deleteAuthError) {
    console.error('❌ Failed to delete auth user:', deleteAuthError);
  } else {
    console.log(`✅ Auth user deleted successfully.`);
  }

  console.log(`\n🎉 Done. All data for ${TARGET_EMAIL} has been removed.\n`);
}

deleteUserData().catch(console.error);
