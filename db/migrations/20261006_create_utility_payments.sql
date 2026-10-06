-- ==============================================================================
-- Migration: Riwayat Pembayaran / Pengisian Utilitas Kamar (PLN & PDAM)
-- ==============================================================================
-- Aturan penulisan (ditegakkan di API dengan service role):
--   - PLN  : boleh dicatat oleh penghuni kamar (occupant) ATAU owner/property-admin.
--   - PDAM : hanya boleh dicatat oleh owner/property-admin.
-- Pembacaan (RLS): penghuni kamar, owner, dan anggota properti.
-- Tidak ada policy INSERT/UPDATE/DELETE untuk role authenticated; seluruh
-- penulisan lewat endpoint /api/rooms/[roomId]/utilities.
-- ==============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.utility_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_id UUID NOT NULL REFERENCES public.rooms(id) ON DELETE CASCADE,
    property_id UUID NOT NULL REFERENCES public.properties(id) ON DELETE CASCADE,
    utility_type TEXT NOT NULL CHECK (utility_type IN ('pln', 'pdam')),
    amount NUMERIC(14, 2) NOT NULL CHECK (amount >= 0),
    paid_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    token_code TEXT,          -- PLN prabayar: nomor token
    kwh NUMERIC(12, 2),       -- PLN prabayar: jumlah kWh yang didapat
    meter_reading NUMERIC(14, 2), -- PDAM: angka meteran saat dibayar
    period_label TEXT,        -- contoh: '2026-10' (periode tagihan)
    note TEXT,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_by_role TEXT CHECK (created_by_role IN ('owner', 'occupant')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_utility_payments_room_type_paid
    ON public.utility_payments (room_id, utility_type, paid_at DESC);
CREATE INDEX IF NOT EXISTS idx_utility_payments_property
    ON public.utility_payments (property_id);

ALTER TABLE public.utility_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view utility payments" ON public.utility_payments;
CREATE POLICY "Members can view utility payments"
    ON public.utility_payments
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.room_members rm
            WHERE rm.room_id = utility_payments.room_id AND rm.user_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.properties p
            WHERE p.id = utility_payments.property_id AND p.owner_id = auth.uid()
        )
        OR EXISTS (
            SELECT 1 FROM public.property_members pm
            WHERE pm.property_id = utility_payments.property_id AND pm.user_id = auth.uid()
        )
    );

COMMIT;
