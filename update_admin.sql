-- Paste this into your Supabase SQL Editor
UPDATE users
SET is_admin = true, verified = true, phone_verified = true
WHERE email IN (
  'boluwatielasisi240@gmail.com',
  'feranmioyelowo.dev@gmail.com',
  'feranmioyelowo@gmail.com',
  'vickysalami04@gmail.com'
);
