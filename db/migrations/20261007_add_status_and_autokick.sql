-- ==============================================================================
-- Migration: Add status master tables (status_member_property & status_member_rooms)
--            and link foreign keys + update auto-kick RPC logic
-- ==============================================================================

BEGIN;

-- 1. Buat Tabel Master: public.status_member_property -------------------------
-- Mengikuti pola status_profiles (1: aktif, 2: tidak aktif, 3: pending undangan, 4: expired)
CREATE TABLE IF NOT EXISTS public.status_member_property (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status_id INT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Seed data status_member_property
INSERT INTO public.status_member_property (status_id, name)
VALUES 
    (1, 'active'),
    (2, 'inactive'),
    (3, 'pending_invitation'),
    (4, 'expired')
ON CONFLICT (status_id) DO UPDATE 
SET name = EXCLUDED.name, updated_at = timezone('utc'::text, now());


-- 2. Buat Tabel Master: public.status_member_rooms ----------------------------
CREATE TABLE IF NOT EXISTS public.status_member_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status_id INT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Seed data status_member_rooms
INSERT INTO public.status_member_rooms (status_id, name)
VALUES 
    (1, 'active'),
    (2, 'inactive'),
    (3, 'pending_assignment'),
    (4, 'expired')
ON CONFLICT (status_id) DO UPDATE 
SET name = EXCLUDED.name, updated_at = timezone('utc'::text, now());


-- 3. Tambah kolom status dan status_id pada property_members ------------------
-- status_id berelasi ke public.status_member_property(status_id)
ALTER TABLE public.property_members 
ADD COLUMN IF NOT EXISTS status_id INT REFERENCES public.status_member_property(status_id) DEFAULT 1,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

UPDATE public.property_members
SET status_id = 1, status = 'active'
WHERE status_id IS NULL OR status IS NULL;


-- 4. Tambah kolom status dan status_id pada room_members ----------------------
-- status_id berelasi ke public.status_member_rooms(status_id)
ALTER TABLE public.room_members 
ADD COLUMN IF NOT EXISTS status_id INT REFERENCES public.status_member_rooms(status_id) DEFAULT 1,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';

UPDATE public.room_members
SET status_id = 1, status = 'active'
WHERE status_id IS NULL OR status IS NULL;


-- 5. RLS untuk tabel master status (Read-only untuk authenticated user) -------
ALTER TABLE public.status_member_property ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_member_rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select status_member_property" ON public.status_member_property;
CREATE POLICY "Allow select status_member_property" 
    ON public.status_member_property FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Allow select status_member_rooms" ON public.status_member_rooms;
CREATE POLICY "Allow select status_member_rooms" 
    ON public.status_member_rooms FOR SELECT TO authenticated USING (true);


-- 6. Perbarui RPC respond_to_room_application ---------------------------------
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
    v_other_rooms_count INT;
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

    -- Ambil info properti, owner, dan kamar
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
            -- Daftarkan calon penghuni ke kamar (room_members) dengan status_id 1 ('active')
            IF v_notif.room_id IS NOT NULL AND v_target_user_id IS NOT NULL THEN
                INSERT INTO public.room_members (room_id, user_id, role_id, status_id, status)
                VALUES (v_notif.room_id, v_target_user_id, v_occupant_role_id, 1, 'active')
                ON CONFLICT (room_id, user_id) DO UPDATE SET status_id = 1, status = 'active';
            END IF;

            -- Pastikan juga tercatat di property_members dengan status_id 1 ('active')
            IF v_notif.property_id IS NOT NULL AND v_target_user_id IS NOT NULL THEN
                INSERT INTO public.property_members (property_id, user_id, role_id, role, status_id, status)
                VALUES (v_notif.property_id, v_target_user_id, v_occupant_role_id, 'occupant', 1, 'active')
                ON CONFLICT (property_id, user_id) DO UPDATE SET status_id = 1, status = 'active';
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
            -- Ditolak oleh owner
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
            -- Penghuni menerima tawaran kamar -> set status_id 1 ('active')
            IF v_notif.room_id IS NOT NULL THEN
                INSERT INTO public.room_members (room_id, user_id, role_id, status_id, status)
                VALUES (v_notif.room_id, v_target_user_id, v_occupant_role_id, 1, 'active')
                ON CONFLICT (room_id, user_id) DO UPDATE SET status_id = 1, status = 'active';
            END IF;

            -- Pastikan status di property_members menjadi 1 ('active')
            IF v_notif.property_id IS NOT NULL THEN
                UPDATE public.property_members
                SET status_id = 1, status = 'active'
                WHERE property_id = v_notif.property_id AND user_id = v_target_user_id;
            END IF;

            -- Notifikasi ke owner
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
            -- Penghuni menolak / membatalkan penempatan -> batalkan di tabel rooms & room_members
            IF v_notif.room_id IS NOT NULL THEN
                UPDATE public.rooms
                SET occupant_member_id = NULL
                WHERE id = v_notif.room_id;

                DELETE FROM public.room_members
                WHERE room_id = v_notif.room_id AND user_id = v_target_user_id;
            END IF;

            -- Auto-kick dari property_members jika tidak menempati kamar lain di properti ini
            IF v_notif.property_id IS NOT NULL THEN
                SELECT COUNT(*) INTO v_other_rooms_count
                FROM public.room_members rm
                JOIN public.rooms r ON r.id = rm.room_id
                WHERE rm.user_id = v_target_user_id 
                  AND r.property_id = v_notif.property_id
                  AND r.id != COALESCE(v_notif.room_id, '00000000-0000-0000-0000-000000000000'::uuid);

                IF v_other_rooms_count = 0 THEN
                    DELETE FROM public.property_members
                    WHERE property_id = v_notif.property_id AND user_id = v_target_user_id;
                END IF;
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

    -- KASUS 3: property_invitation
    ELSIF v_notif.type = 'property_invitation' THEN
        v_target_user_id := v_caller_id;

        IF p_action = 'approved' THEN
            UPDATE public.property_members
            SET status_id = 1, status = 'active'
            WHERE property_id = v_notif.property_id AND user_id = v_target_user_id;
        ELSE
            -- Tolak undangan -> kick dari property_members
            DELETE FROM public.property_members
            WHERE property_id = v_notif.property_id AND user_id = v_target_user_id;
        END IF;

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

COMMIT;
