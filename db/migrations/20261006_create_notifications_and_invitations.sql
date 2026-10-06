-- ==============================================================================
-- Migration: Notifications & Room Application (Pengajuan Sewa Kamar Occupant)
-- ==============================================================================
-- Model:
--   - Property: Dikelola oleh owner / admin / guard.
--   - Room: Unit kamar di dalam property.
--   - Occupant: Penghuni yang menempati ROOM (bukan property member).
-- Alur:
--   1. Calon occupant mencari kamar yang tersedia di property.
--   2. Calon occupant mengajukan sewa kamar ke Owner.
--   3. Notifikasi pengajuan masuk ke Owner.
--   4. Owner dapat menerima/menolak di website Indekos maupun Property Management.
--   5. Jika disetujui, user resmi menjadi occupant di room_members kamar tersebut.
-- ==============================================================================

BEGIN;

-- 1. Pastikan tabel room_members tersedia untuk menampung occupant kamar -------
CREATE TABLE IF NOT EXISTS public.room_members (
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (room_id, user_id)
);

ALTER TABLE public.room_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view room members of their rooms" ON public.room_members;
CREATE POLICY "Users can view room members of their rooms"
    ON public.room_members FOR SELECT TO authenticated
    USING (
        auth.uid() = user_id 
        OR EXISTS (
            SELECT 1 FROM public.rooms r
            JOIN public.properties p ON p.id = r.property_id
            WHERE r.id = room_members.room_id AND p.owner_id = auth.uid()
        )
    );

-- 2. Buat tabel public.notifications ------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    from_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
    role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL,
    type TEXT NOT NULL DEFAULT 'general', -- 'room_application', 'room_approved', 'room_rejected', 'general'
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

-- 3. Trigger updated_at -------------------------------------------------------
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

-- 4. Indexes ------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_notifications_to_user_id ON public.notifications(to_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_from_user_id ON public.notifications(from_user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_property_id ON public.notifications(property_id);
CREATE INDEX IF NOT EXISTS idx_notifications_room_id ON public.notifications(room_id);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON public.notifications(status);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- 5. Row Level Security (RLS) -------------------------------------------------
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications"
    ON public.notifications
    FOR SELECT
    TO authenticated
    USING (auth.uid() = to_user_id AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications"
    ON public.notifications
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = to_user_id AND deleted_at IS NULL)
    WITH CHECK (auth.uid() = to_user_id);

DROP POLICY IF EXISTS "Users can send notifications" ON public.notifications;
CREATE POLICY "Users can send notifications"
    ON public.notifications
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.notifications;
CREATE POLICY "Users can delete their own notifications"
    ON public.notifications
    FOR DELETE
    TO authenticated
    USING (auth.uid() = to_user_id);

-- 6. Helper Function: Owner Menerima / Menolak Pengajuan Kamar -----------------
-- Dipanggil ketika owner menekan [Terima] atau [Tolak] di website Indekos maupun Property Management
CREATE OR REPLACE FUNCTION public.respond_to_room_application(
    p_notification_id UUID,
    p_action TEXT -- 'approved' atau 'rejected'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_notif public.notifications%ROWTYPE;
    v_owner_id UUID := auth.uid();
    v_occupant_role_id UUID;
    v_room_name TEXT;
    v_property_name TEXT;
BEGIN
    IF p_action NOT IN ('approved', 'rejected') THEN
        RAISE EXCEPTION 'Aksi tidak valid: harus approved atau rejected';
    END IF;

    -- Ambil notifikasi pengajuan sewa milik owner yang sedang login
    SELECT * INTO v_notif
    FROM public.notifications
    WHERE id = p_notification_id 
      AND to_user_id = v_owner_id 
      AND deleted_at IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Notifikasi pengajuan tidak ditemukan atau Anda bukan penerimanya.';
    END IF;

    IF v_notif.status != 'pending' THEN
        RAISE EXCEPTION 'Pengajuan sewa ini sudah pernah diproses (%s).', v_notif.status;
    END IF;

    -- Update status notifikasi pengajuan owner
    UPDATE public.notifications
    SET 
        status = p_action,
        read = true,
        read_at = COALESCE(read_at, timezone('utc'::text, now())),
        responded_at = timezone('utc'::text, now()),
        updated_at = timezone('utc'::text, now())
    WHERE id = p_notification_id;

    -- Ambil nama properti & kamar untuk notifikasi balasan
    SELECT name INTO v_property_name FROM public.properties WHERE id = v_notif.property_id;
    SELECT name INTO v_room_name FROM public.rooms WHERE id = v_notif.room_id;

    -- Cari role occupant
    SELECT id INTO v_occupant_role_id FROM public.roles WHERE name = 'occupant' LIMIT 1;

    IF p_action = 'approved' THEN
        -- Assign user pemohon ke kamar (room_members)
        IF v_notif.room_id IS NOT NULL AND v_notif.from_user_id IS NOT NULL THEN
            INSERT INTO public.room_members (room_id, user_id, role_id)
            VALUES (v_notif.room_id, v_notif.from_user_id, v_occupant_role_id)
            ON CONFLICT (room_id, user_id) DO NOTHING;
        END IF;

        -- Kirim notifikasi konfirmasi ke calon penghuni
        IF v_notif.from_user_id IS NOT NULL THEN
            INSERT INTO public.notifications (
                to_user_id,
                from_user_id,
                property_id,
                room_id,
                type,
                title,
                description,
                status,
                read
            ) VALUES (
                v_notif.from_user_id,
                v_owner_id,
                v_notif.property_id,
                v_notif.room_id,
                'room_approved',
                'Pengajuan Sewa Kamar Disetujui!',
                COALESCE(
                    'Selamat! Permohonan sewa untuk ' || COALESCE(v_room_name, 'kamar') || ' di ' || COALESCE(v_property_name, 'properti') || ' telah disetujui oleh pemilik.',
                    'Pengajuan sewa kamar Anda telah disetujui.'
                ),
                'approved',
                false
            );
        END IF;

    ELSIF p_action = 'rejected' THEN
        -- Kirim notifikasi penolakan ke calon penghuni
        IF v_notif.from_user_id IS NOT NULL THEN
            INSERT INTO public.notifications (
                to_user_id,
                from_user_id,
                property_id,
                room_id,
                type,
                title,
                description,
                status,
                read
            ) VALUES (
                v_notif.from_user_id,
                v_owner_id,
                v_notif.property_id,
                v_notif.room_id,
                'room_rejected',
                'Pengajuan Sewa Kamar Ditolak',
                COALESCE(
                    'Mohon maaf, permohonan sewa untuk ' || COALESCE(v_room_name, 'kamar') || ' di ' || COALESCE(v_property_name, 'properti') || ' belum dapat diterima oleh pemilik.',
                    'Pengajuan sewa kamar Anda belum disetujui.'
                ),
                'rejected',
                false
            );
        END IF;
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'action', p_action,
        'notification_id', p_notification_id,
        'room_id', v_notif.room_id,
        'occupant_user_id', v_notif.from_user_id
    );
END;
$$;

-- 7. Aktifkan Supabase Realtime untuk tabel notifications ---------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

COMMIT;
