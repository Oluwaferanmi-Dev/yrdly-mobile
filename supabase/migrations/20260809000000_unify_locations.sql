-- ==========================================
-- 20260809000000_unify_locations.sql
-- ==========================================

-- 1. Unify USERS table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS home_state text,
ADD COLUMN IF NOT EXISTS home_lga text,
ADD COLUMN IF NOT EXISTS home_ward text,
ADD COLUMN IF NOT EXISTS home_lat double precision,
ADD COLUMN IF NOT EXISTS home_lng double precision,
ADD COLUMN IF NOT EXISTS home_location_geom geography(Point, 4326);

-- Attempt to backfill users from the JSON `location` column.
-- We use the `location` field (which was previously {state, lga, ward, geopoint: {latitude, longitude}})
-- Note: Some legacy records may only have `{ state: 'Full Address' }`. We leave lat/lng as null in those cases.
UPDATE public.users
SET
  home_state = location->>'state',
  home_lga = location->>'lga',
  home_ward = location->>'ward',
  home_lat = COALESCE((location->'geopoint'->>'latitude')::double precision, (location->>'lat')::double precision),
  home_lng = COALESCE((location->'geopoint'->>'longitude')::double precision, (location->>'lng')::double precision)
WHERE location IS NOT NULL;

-- Compute home_location_geom for users who had valid coordinates
UPDATE public.users
SET home_location_geom = ST_SetSRID(ST_MakePoint(home_lng, home_lat), 4326)
WHERE home_lat IS NOT NULL AND home_lng IS NOT NULL;


-- 2. Unify POSTS table
-- Posts already has state, lga, ward, location_geom (from previous migration).
-- We just need to add lat and lng for the UI and map compatibility, and backfill.
ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS lat double precision,
ADD COLUMN IF NOT EXISTS lng double precision;

-- Backfill lat/lng from location_geom where available (Marketplace)
UPDATE public.posts
SET 
  lat = ST_Y(location_geom::geometry),
  lng = ST_X(location_geom::geometry)
WHERE location_geom IS NOT NULL;

-- Backfill from legacy event_location JSON if applicable
UPDATE public.posts
SET
  lat = COALESCE(lat, (event_location->'geopoint'->>'latitude')::double precision),
  lng = COALESCE(lng, (event_location->'geopoint'->>'longitude')::double precision)
WHERE event_location IS NOT NULL;

-- Re-compute location_geom for those legacy posts that had event_location but no location_geom
UPDATE public.posts
SET location_geom = ST_SetSRID(ST_MakePoint(lng, lat), 4326)
WHERE lat IS NOT NULL AND lng IS NOT NULL AND location_geom IS NULL;


-- 3. Unify BUSINESSES table
-- Businesses already has state, lga, ward, location_geom (from previous migration).
ALTER TABLE public.businesses
ADD COLUMN IF NOT EXISTS lat double precision,
ADD COLUMN IF NOT EXISTS lng double precision;

-- Backfill lat/lng from location_geom where available
UPDATE public.businesses
SET 
  lat = ST_Y(location_geom::geometry),
  lng = ST_X(location_geom::geometry)
WHERE location_geom IS NOT NULL;

-- Backfill from legacy location JSON
UPDATE public.businesses
SET
  lat = COALESCE(lat, (location->'geopoint'->>'latitude')::double precision, (location->>'lat')::double precision),
  lng = COALESCE(lng, (location->'geopoint'->>'longitude')::double precision, (location->>'lng')::double precision)
WHERE location IS NOT NULL;

-- Re-compute location_geom
UPDATE public.businesses
SET location_geom = ST_SetSRID(ST_MakePoint(lng, lat), 4326)
WHERE lat IS NOT NULL AND lng IS NOT NULL AND location_geom IS NULL;


-- 4. Unify EVENTS table
-- Events already has state, lga, ward, lat, lng.
-- We just need to add location_geom.
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS location_geom geography(Point, 4326);

-- Backfill location_geom from lat/lng
UPDATE public.events
SET location_geom = ST_SetSRID(ST_MakePoint(lng, lat), 4326)
WHERE lat IS NOT NULL AND lng IS NOT NULL AND location_geom IS NULL;


-- 5. Create indices for the new location_geom columns (posts/businesses done in previous migration)
CREATE INDEX IF NOT EXISTS events_location_geom_idx ON public.events USING GIST (location_geom);
CREATE INDEX IF NOT EXISTS users_home_location_geom_idx ON public.users USING GIST (home_location_geom);
