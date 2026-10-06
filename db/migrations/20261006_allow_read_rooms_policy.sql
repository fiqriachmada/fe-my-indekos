-- ==============================================================================
-- Migration: Izinkan Read/SELECT pada Tabel Rooms untuk Pengguna & Publik
-- ==============================================================================
-- Masalah Sebelumnya:
-- RLS pada tabel rooms memblokir SELECT bagi calon penghuni dan penghuni (occupant),
-- sehingga katalog kamar di /properties kosong dan dashboard kamar sewaan
-- mengembalikan room: null.
--
-- Solusi:
-- Berikan izin SELECT pada tabel rooms untuk publik dan authenticated user
-- agar katalog kamar kos dan kamar sewaan dapat dibaca.
-- ==============================================================================

BEGIN;

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public and users can view rooms" ON public.rooms;
DROP POLICY IF EXISTS "Allow authenticated read rooms" ON public.rooms;
DROP POLICY IF EXISTS "Users can view rooms" ON public.rooms;

CREATE POLICY "Users can view rooms"
    ON public.rooms
    FOR SELECT
    TO public
    USING (true);

COMMIT;
