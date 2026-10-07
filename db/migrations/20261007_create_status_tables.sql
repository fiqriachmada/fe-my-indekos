-- ==============================================================================
-- Migration: Add property_status, room_status, and ensure status_member_rooms
--            with UUID primary keys, INT status_id (1-4), and link foreign keys
-- ==============================================================================

BEGIN;

-- 1. Buat Tabel Master: public.property_status --------------------------------
-- 1: aktif, 2: tidak aktif, 3: pending undangan, 4: expired
CREATE TABLE IF NOT EXISTS public.property_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status_id INT NOT NULL UNIQUE,
    status_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

INSERT INTO public.property_status (status_id, status_name)
VALUES 
    (1, 'aktif'),
    (2, 'tidak aktif'),
    (3, 'pending undangan'),
    (4, 'expired')
ON CONFLICT (status_id) DO UPDATE 
SET status_name = EXCLUDED.status_name, updated_at = timezone('utc'::text, now());


-- 2. Buat Tabel Master: public.room_status ------------------------------------
-- 1: aktif, 2: tidak aktif, 3: pending undangan, 4: expired
CREATE TABLE IF NOT EXISTS public.room_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status_id INT NOT NULL UNIQUE,
    status_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

INSERT INTO public.room_status (status_id, status_name)
VALUES 
    (1, 'aktif'),
    (2, 'tidak aktif'),
    (3, 'pending undangan'),
    (4, 'expired')
ON CONFLICT (status_id) DO UPDATE 
SET status_name = EXCLUDED.status_name, updated_at = timezone('utc'::text, now());


-- 3. Pastikan Tabel Master: public.status_member_rooms ------------------------
CREATE TABLE IF NOT EXISTS public.status_member_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    status_id INT NOT NULL UNIQUE,
    status_name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Bila kolom sebelumnya bernama 'name', tambahkan/sinkronkan kolom status_name
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'status_member_rooms' 
          AND column_name = 'name'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'status_member_rooms' 
          AND column_name = 'status_name'
    ) THEN
        ALTER TABLE public.status_member_rooms RENAME COLUMN name TO status_name;
    END IF;
END $$;

INSERT INTO public.status_member_rooms (status_id, status_name)
VALUES 
    (1, 'aktif'),
    (2, 'tidak aktif'),
    (3, 'pending undangan'),
    (4, 'expired')
ON CONFLICT (status_id) DO UPDATE 
SET status_name = EXCLUDED.status_name, updated_at = timezone('utc'::text, now());


-- 4. Hubungkan ke tabel public.properties -------------------------------------
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS status_id INT REFERENCES public.property_status(status_id) DEFAULT 1;

-- Sinkronisasi data lama berdasarkan is_active
UPDATE public.properties
SET status_id = CASE 
    WHEN is_active = false THEN 2 
    ELSE 1 
END
WHERE status_id IS NULL;


-- 5. Hubungkan ke tabel public.rooms ------------------------------------------
ALTER TABLE public.rooms 
ADD COLUMN IF NOT EXISTS status_id INT REFERENCES public.room_status(status_id) DEFAULT 1;

-- Sinkronisasi data lama berdasarkan is_active
UPDATE public.rooms
SET status_id = CASE 
    WHEN is_active = false THEN 2 
    ELSE 1 
END
WHERE status_id IS NULL;


-- 6. Hubungkan ke tabel public.room_members -----------------------------------
ALTER TABLE public.room_members 
ADD COLUMN IF NOT EXISTS status_id INT REFERENCES public.status_member_rooms(status_id) DEFAULT 1;

UPDATE public.room_members
SET status_id = 1
WHERE status_id IS NULL;


-- 7. RLS Policy (Allow Read untuk authenticated & anon agar publik bisa baca status) --
ALTER TABLE public.property_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_member_rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select property_status" ON public.property_status;
CREATE POLICY "Allow select property_status" 
    ON public.property_status FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Allow select room_status" ON public.room_status;
CREATE POLICY "Allow select room_status" 
    ON public.room_status FOR SELECT TO public USING (true);

DROP POLICY IF EXISTS "Allow select status_member_rooms" ON public.status_member_rooms;
CREATE POLICY "Allow select status_member_rooms" 
    ON public.status_member_rooms FOR SELECT TO public USING (true);

COMMIT;
