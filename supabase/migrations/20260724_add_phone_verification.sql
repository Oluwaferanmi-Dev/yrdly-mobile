ALTER TABLE users
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMPTZ;

-- Auto-stamp verified_at timestamp
CREATE OR REPLACE FUNCTION handle_phone_verified()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.phone_verified = TRUE AND (OLD.phone_verified = FALSE OR OLD.phone_verified IS NULL) THEN
    NEW.phone_verified_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if it exists to make it idempotent
DROP TRIGGER IF EXISTS on_phone_verified ON users;

CREATE TRIGGER on_phone_verified
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION handle_phone_verified();
