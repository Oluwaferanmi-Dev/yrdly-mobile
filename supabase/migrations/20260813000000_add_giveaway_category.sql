-- Add 'Giveaway' to the post_category enum
ALTER TYPE post_category ADD VALUE IF NOT EXISTS 'Giveaway';
