CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    from_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    read BOOLEAN DEFAULT false NOT NULL,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own notifications"
    ON public.notifications
    FOR SELECT
    USING (auth.uid() = to_user_id AND deleted_at IS NULL);

CREATE POLICY "Users can update their own notifications"
    ON public.notifications
    FOR UPDATE
    USING (auth.uid() = to_user_id AND deleted_at IS NULL);

-- Allow system/users to create notifications
CREATE POLICY "Users can insert notifications"
    ON public.notifications
    FOR INSERT
    WITH CHECK (true);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_notifications_modtime()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_notifications_modtime ON public.notifications;
CREATE TRIGGER update_notifications_modtime
    BEFORE UPDATE ON public.notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_notifications_modtime();

-- Create index for faster querying
CREATE INDEX IF NOT EXISTS idx_notifications_to_user_id ON public.notifications(to_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_from_user_id ON public.notifications(from_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_property_id ON public.notifications(property_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
