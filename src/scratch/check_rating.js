import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://yoiyqxtpmxnrrbqqidcs.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvaXlxeHRwbXhucnJicXFpZGNzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjAxMDY5OTksImV4cCI6MjA3NTY4Mjk5OX0.xL4t7V9BiaOxtdGrYqJMBXKLtP6JTwdU2akNwPP8t-w'
);

async function check() {
  const { data: users, error } = await supabase.from('users').select('id, name, rating, review_count').limit(10);
  console.log('Users:', users);
  
  // also check businesses
  const { data: biz } = await supabase.from('businesses').select('id, name, rating, review_count').limit(10);
  console.log('Businesses:', biz);
}

check();
