-- ==============================================================================
-- Migration: Create Notifications Table & Occupant Invitation Approval Support
-- ==============================================================================
-- Run in the Supabase SQL Editor.
-- Runs in one transaction: if anything fails, everything rolls back.

BEGIN;

-- 1. Create table public.notifications ----------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    from_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
    role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL,
    type TEXT NOT NULL DEFAULT 'general',
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IS NULL OR status IN ('pending', 'approved', 'rejected')),
    read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMPTZ,
    responded_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    deleted_at TIMESTAMPTZ
);

-- 2. Add status column to property_members (for tracking pending invitations) --
ALTER TABLE public.property_members 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' 
CHECK (status IN ('active', 'pending', 'rejected'));

-- Set default active for existing owner / admin records
UPDATE public.property_members 
SET status = 'active' 
WHERE status IS NULL;

-- 3. Trigger for updated_at on notifications ----------------------------------
CREATE OR REPLACE FUNCTION public.update_notifications_modtime()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notifications_modtime ON public.notifications;
CREATE TRIGGER trg_notifications_modtime
    BEFORE UPDATE ON public.notifications
    FOR EACH ROW
    EXECUTE FUNCTION public.update_notifications_modtime();

-- 4. Indexes for high performance ---------------------------------------------
CREATE INDEX IF NOT EXISTS idx_notifications_to_user_id ON public.notifications(to_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_from_user_id ON public.notifications(from_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_property_id ON public.notifications(property_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON public.notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- 5. Enable Row Level Security (RLS) -------------------------------------------
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Recipients can read their own notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications"
    ON public.notifications
    FOR SELECT
    TO authenticated
    USING (auth.uid() = to_user_id AND deleted_at IS NULL);

-- Policy: Recipients can update (mark as read, approve/reject) their notifications
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications"
    ON public.notifications
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = to_user_id AND deleted_at IS NULL)
    WITH CHECK (auth.uid() = to_user_id);

-- Policy: Authenticated users can insert notifications (e.g. owners inviting occupants)
DROP POLICY IF EXISTS "Users can send notifications" ON public.notifications;
CREATE POLICY "Users can send notifications"
    ON public.notifications
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);

-- Policy: Recipients can delete their notifications
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
CREATE POLICY "Users can delete their own notifications"
    ON public.notifications
    FOR DELETE
    TO authenticated
    USING (auth.uid() = to_user_id);

-- 6. Helper Function: Atomically respond to invitation ------------------------
-- Allows occupant to approve or reject with a single RPC call
CREATE OR REPLACE FUNCTION public.respond_to_invitation(
    p_notification_id UUID,
    p_action TEXT -- 'approved' or 'rejected'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_notif public.notifications%ROWTYPE;
    v_user_id UUID := auth.uid();
BEGIN
    IF p_action NOT IN ('approved', 'rejected') THEN
        RAISE EXCEPTION 'Aksi tidak valid: harus approved atau rejected';
    END IF;

    -- Ambil notifikasi milik user yang sedang login
    SELECT * INTO v_notif
    FROM public.notifications
    WHERE id = p_notification_id 
      AND to_user_id = v_user_id 
      AND deleted_at IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Notifikasi tidak ditemukan atau Anda tidak memiliki akses.';
    END IF;

    IF v_notif.status != 'pending' THEN
        RAISE EXCEPTION 'Undangan ini sudah pernah ditanggapi sebelumnya (%s).', v_notif.status;
    END IF;

    -- Update notifikasi
    UPDATE public.notifications
    SET 
        status = p_action,
        read = true,
        read_at = COALESCE(read_at, timezone('utc'::text, now())),
        responded_at = timezone('utc'::text, now()),
        updated_at = timezone('utc'::text, now())
    WHERE id = p_notification_id;

    -- Sinkronisasi ke property_members
    IF v_notif.property_id IS NOT NULL THEN
        IF p_action = 'approved' THEN
            -- Aktifkan status membership
            UPDATE public.property_members
            SET status = 'active'
            WHERE property_id = v_notif.property_id AND user_id = v_user_id;
        ELSIF p_action = 'rejected' THEN
            -- Hapus dari property_members atau tandai rejected
            DELETE FROM public.property_members
            WHERE property_id = v_notif.property_id AND user_id = v_user_id;
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'action', p_action,
        'notification_id', p_notification_id
    );
END;
$$;

COMMIT;
