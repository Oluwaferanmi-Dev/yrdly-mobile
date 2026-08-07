-- Create categories table
CREATE TABLE IF NOT EXISTS public.categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL, -- 'marketplace', 'event', 'report'
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categories are readable by everyone"
    ON public.categories FOR SELECT
    USING (true);

-- Insert defaults for marketplace
INSERT INTO public.categories (name, type) VALUES
    ('Fashion', 'marketplace'),
    ('Electronics', 'marketplace'),
    ('Home', 'marketplace'),
    ('Vehicles', 'marketplace'),
    ('Sports', 'marketplace'),
    ('Toys', 'marketplace'),
    ('Other', 'marketplace');

-- Insert defaults for events
INSERT INTO public.categories (name, type) VALUES
    ('Party', 'event'),
    ('Networking', 'event'),
    ('Sports', 'event'),
    ('Concert', 'event'),
    ('Workshop', 'event'),
    ('Other', 'event');

-- Insert defaults for reports
INSERT INTO public.categories (name, type) VALUES
    ('Spam', 'report'),
    ('Inappropriate', 'report'),
    ('Scam', 'report'),
    ('Other', 'report');
