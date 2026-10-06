-- ==============================================================================
-- Migration: Notifications & Room Application (Pengajuan Sewa & Penempatan Kamar)
-- ==============================================================================
-- Model:
--   - Property: Dikelola oleh owner / admin / guard.
--   - Room: Unit kamar di dalam property.
--   - Occupant: Penghuni yang menempati ROOM (bukan pengelola property).
--
-- Alur 1: Calon Occupant Mengajukan Sewa ke Owner (room_application)
--   1. Calon occupant melihat kamar kosong di halaman Cari Properti.
--   2. Calon occupant menekan "Ajukan Sewa" -> notifikasi masuk ke Owner.
--   3. Owner menekan [Setujui / Terima] atau [Tolak].
--   4. Jika disetujui, pemohon resmi menjadi occupant di room_members kamar tersebut.
--   5. Calon occupant menerima notifikasi persetujuan secara realtime.
--
-- Alur 2: Owner Menugaskan / Menempatkan Occupant ke Kamar (room_assignment)
--   1. Owner memilih user occupant untuk kamar di Property Management.
--   2. Occupant menerima notifikasi "Tawaran Penempatan Kamar".
--   3. Occupant dapat menekan [Setujui / Terima] atau [Tolak].
--   4. Jika diterima, occupant dimasukkan ke room_members kamar tersebut.
--   5. Jika ditolak, kamar dikosongkan kembali (occupant_member_id di-reset ke NULL).
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

DROP POLICY IF EXISTS "Users can view room members" ON public.room_members;
DROP POLICY IF EXISTS "Users can view room members of their rooms" ON public.room_members;
CREATE POLICY "Users can view room members"
    ON public.room_members FOR SELECT TO authenticated
    USING (true);

-- 2. Buat tabel public.notifications ------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    to_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    from_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE,
    room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
    role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL,
    type TEXT NOT NULL DEFAULT 'general', -- 'room_application', 'room_assignment', 'room_approved', 'room_rejected', 'room_assignment_accepted', 'room_assignment_rejected', 'general'
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

DROP POLICY IF EXISTS "Users can view their notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their notifications"
    ON public.notifications
    FOR SELECT
    TO authenticated
    USING ((auth.uid() = to_user_id OR auth.uid() = from_user_id) AND deleted_at IS NULL);

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

-- 6. Helper Function: Merespon Notifikasi (Owner Terima/Tolak Pengajuan ATAU Occupant Terima/Tolak Penempatan)
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
    v_caller_id UUID := auth.uid();
    v_occupant_role_id UUID;
    v_target_user_id UUID;
    v_room_name TEXT;
    v_property_name TEXT;
    v_property_owner_id UUID;
BEGIN
    IF p_action NOT IN ('approved', 'rejected') THEN
        RAISE EXCEPTION 'Aksi tidak valid: harus approved atau rejected';
    END IF;

    -- Ambil data notifikasi
    SELECT * INTO v_notif
    FROM public.notifications
    WHERE id = p_notification_id 
      AND (to_user_id = v_caller_id OR from_user_id = v_caller_id)
      AND deleted_at IS NULL
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Notifikasi tidak ditemukan atau Anda tidak memiliki akses.';
    END IF;

    IF v_notif.status != 'pending' THEN
        RAISE EXCEPTION 'Pemberitahuan ini sudah pernah diproses (%s).', v_notif.status;
    END IF;

    -- Ambil nama properti, owner_id, dan nama kamar
    SELECT name, owner_id INTO v_property_name, v_property_owner_id FROM public.properties WHERE id = v_notif.property_id;
    SELECT name INTO v_room_name FROM public.rooms WHERE id = v_notif.room_id;
    SELECT id INTO v_occupant_role_id FROM public.roles WHERE name = 'occupant' LIMIT 1;

    -- Update status notifikasi saat ini
    UPDATE public.notifications
    SET 
        status = p_action,
        read = true,
        read_at = COALESCE(read_at, timezone('utc'::text, now())),
        responded_at = timezone('utc'::text, now()),
        updated_at = timezone('utc'::text, now())
    WHERE id = p_notification_id;

    -- KASUS 1: room_application (Calon Penghuni mengajukan sewa -> Ditanggapi oleh Pemilik/Owner)
    IF v_notif.type = 'room_application' THEN
        IF v_notif.to_user_id != v_caller_id AND v_property_owner_id != v_caller_id THEN
            RAISE EXCEPTION 'Hanya pemilik properti yang dapat menyetujui atau menolak pengajuan sewa.';
        END IF;

        v_target_user_id := v_notif.from_user_id;

        IF p_action = 'approved' THEN
            -- Daftarkan calon penghuni ke kamar (room_members)
            IF v_notif.room_id IS NOT NULL AND v_target_user_id IS NOT NULL THEN
                INSERT INTO public.room_members (room_id, user_id, role_id)
                VALUES (v_notif.room_id, v_target_user_id, v_occupant_role_id)
                ON CONFLICT (room_id, user_id) DO NOTHING;
            END IF;

            -- Kirim notifikasi balasan ke calon penghuni
            IF v_target_user_id IS NOT NULL THEN
                INSERT INTO public.notifications (
                    to_user_id, from_user_id, property_id, room_id, type, title, description, status, read
                ) VALUES (
                    v_target_user_id, v_caller_id, v_notif.property_id, v_notif.room_id,
                    'room_approved',
                    'Pengajuan Sewa Disetujui!',
                    'Selamat! Pengajuan sewa untuk ' || COALESCE(v_room_name, 'kamar') || ' di ' || COALESCE(v_property_name, 'properti') || ' telah disetujui oleh pemilik.',
                    'approved', false
                );
            END IF;
        ELSE
            -- Ditolak
            IF v_target_user_id IS NOT NULL THEN
                INSERT INTO public.notifications (
                    to_user_id, from_user_id, property_id, room_id, type, title, description, status, read
                ) VALUES (
                    v_target_user_id, v_caller_id, v_notif.property_id, v_notif.room_id,
                    'room_rejected',
                    'Pengajuan Sewa Ditolak',
                    'Mohon maaf, permohonan sewa untuk ' || COALESCE(v_room_name, 'kamar') || ' di ' || COALESCE(v_property_name, 'properti') || ' belum dapat diterima oleh pemilik.',
                    'rejected', false
                );
            END IF;
        END IF;

    -- KASUS 2: room_assignment (Owner menugaskan/menawarkan kamar -> Ditanggapi oleh Penghuni)
    ELSIF v_notif.type = 'room_assignment' THEN
        IF v_notif.to_user_id != v_caller_id THEN
            RAISE EXCEPTION 'Hanya penghuni yang dituju yang dapat menerima atau menolak tawaran kamar ini.';
        END IF;

        v_target_user_id := v_caller_id;

        IF p_action = 'approved' THEN
            -- Penghuni menerima tawaran -> daftarkan ke room_members
            IF v_notif.room_id IS NOT NULL THEN
                INSERT INTO public.room_members (room_id, user_id, role_id)
                VALUES (v_notif.room_id, v_target_user_id, v_occupant_role_id)
                ON CONFLICT (room_id, user_id) DO NOTHING;
            END IF;

            -- Beritahu owner bahwa penghuni telah menerima penempatan
            IF v_notif.from_user_id IS NOT NULL THEN
                INSERT INTO public.notifications (
                    to_user_id, from_user_id, property_id, room_id, type, title, description, status, read
                ) VALUES (
                    v_notif.from_user_id, v_caller_id, v_notif.property_id, v_notif.room_id,
                    'room_assignment_accepted',
                    'Penghuni Menerima Penempatan Kamar',
                    'Penghuni telah menyetujui penempatan untuk ' || COALESCE(v_room_name, 'kamar') || ' di ' || COALESCE(v_property_name, 'properti') || '.',
                    'approved', false
                );
            END IF;
        ELSE
            -- Penghuni menolak penempatan -> batalkan di tabel rooms & room_members
            IF v_notif.room_id IS NOT NULL THEN
                UPDATE public.rooms
                SET occupant_member_id = NULL
                WHERE id = v_notif.room_id;

                DELETE FROM public.room_members
                WHERE room_id = v_notif.room_id AND user_id = v_target_user_id;
            END IF;

            -- Beritahu owner bahwa penghuni menolak
            IF v_notif.from_user_id IS NOT NULL THEN
                INSERT INTO public.notifications (
                    to_user_id, from_user_id, property_id, room_id, type, title, description, status, read
                ) VALUES (
                    v_notif.from_user_id, v_caller_id, v_notif.property_id, v_notif.room_id,
                    'room_assignment_rejected',
                    'Penghuni Menolak Penempatan Kamar',
                    'Penghuni menolak tawaran penempatan untuk ' || COALESCE(v_room_name, 'kamar') || ' di ' || COALESCE(v_property_name, 'properti') || '.',
                    'rejected', false
                );
            END IF;
        END IF;

    ELSE
        -- Tipe umum/lainnya (misal undangan properti)
        -- Tetap catat respon
    END IF;

    RETURN jsonb_build_object(
        'success', true,
        'action', p_action,
        'notification_id', p_notification_id,
        'room_id', v_notif.room_id,
        'target_user_id', v_target_user_id
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
