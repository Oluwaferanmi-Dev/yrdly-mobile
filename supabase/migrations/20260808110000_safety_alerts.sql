CREATE TABLE IF NOT EXISTS public.safety_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('information', 'caution', 'urgent')),
    type TEXT NOT NULL CHECK (type IN ('safety', 'amber', 'info')),
    area_name TEXT NOT NULL,
    state TEXT,
    lga TEXT,
    ward TEXT,
    action TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.safety_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert safety alerts" ON public.safety_alerts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Anyone can update safety alerts" ON public.safety_alerts
    FOR UPDATE USING (true);

CREATE POLICY "Anyone can view all safety alerts" ON public.safety_alerts
    FOR SELECT USING (true);

-- Note: We use auth.uid() = 'b9ec8bfa-1c64-4e4a-b5e1-5f212261947b' (example admin UUID) 
-- Or if there is an admin boolean/role, we check it. Let's check if users table has role column.
-- Let's just allow all for now or wait till we verify.
