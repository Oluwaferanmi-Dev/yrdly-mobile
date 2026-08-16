-- Add moderation_status to user generated content tables
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS moderation_status TEXT NOT NULL DEFAULT 'approved' CHECK (moderation_status IN ('pending', 'approved', 'rejected', 'moderation_error'));
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS moderation_status TEXT NOT NULL DEFAULT 'approved' CHECK (moderation_status IN ('pending', 'approved', 'rejected', 'moderation_error'));
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS moderation_status TEXT NOT NULL DEFAULT 'approved' CHECK (moderation_status IN ('pending', 'approved', 'rejected', 'moderation_error'));
ALTER TABLE public.catalog_items ADD COLUMN IF NOT EXISTS moderation_status TEXT NOT NULL DEFAULT 'approved' CHECK (moderation_status IN ('pending', 'approved', 'rejected', 'moderation_error'));

-- Create moderation queue table
CREATE TABLE IF NOT EXISTS public.moderation_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id UUID NOT NULL,
    table_name TEXT NOT NULL CHECK (table_name IN ('posts', 'events', 'businesses', 'catalog_items', 'users')),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'moderation_error')),
    reason TEXT,
    text_content TEXT,
    image_urls TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    reviewed_at TIMESTAMPTZ,
    reviewer_id UUID REFERENCES public.users(id),
    notes TEXT
);

ALTER TABLE public.moderation_queue ENABLE ROW LEVEL SECURITY;

-- Allow users to insert into the queue for their own items
CREATE POLICY "Users can insert moderation queue items" ON public.moderation_queue
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Only admins can view the moderation queue
CREATE POLICY "Admins can view moderation queue" ON public.moderation_queue
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND is_admin = true
        )
    );

-- Only admins can update the moderation queue
CREATE POLICY "Admins can update moderation queue" ON public.moderation_queue
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.users 
            WHERE id = auth.uid() AND is_admin = true
        )
    );
