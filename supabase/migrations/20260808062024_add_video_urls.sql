-- Add video_urls array to posts
ALTER TABLE posts ADD COLUMN video_urls TEXT[];

-- Migrate any existing video_url to video_urls array
UPDATE posts SET video_urls = ARRAY[video_url] WHERE video_url IS NOT NULL;

-- Remove the old video_url column from posts
ALTER TABLE posts DROP COLUMN video_url;

-- Add video_urls array to events
ALTER TABLE events ADD COLUMN video_urls TEXT[];

-- Update posts realtime replication if necessary (it's already enabled, just altering column)
