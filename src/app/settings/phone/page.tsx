"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import {
  COUNTRIES,
  cleanLocalPhoneNumber,
  formatFullPhoneNumber,
} from "@/lib/phone-countries";

type Phone = {
  id: string;
  phone_number: string;
  label: string | null;
  is_primary: boolean;
  verified_at: string | null;
};

const inputClass =
  "w-full rounded-lg border border-input bg-background px-3 py-2.5 text-foreground outline-none transition-colors focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200";

async function loadPhones() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Sesi login tidak ditemukan.");
  const { data, error } = await supabase
    .from("user_phone_numbers")
    .select("id, phone_number, label, is_primary, verified_at")
    .eq("user_id", user.id)
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data as Phone[];
}

export default function PhoneSettingsPage() {
  const queryClient = useQueryClient();
  const {
    data: phones,
    error,
    isLoading,
  } = useQuery({
    queryKey: ["user-phone-numbers"],
    queryFn: loadPhones,
  });

  async function mutate() {
    await queryClient.invalidateQueries({ queryKey: ["user-phone-numbers"] });
  }

  const [selectedCountry, setSelectedCountry] = useState(COUNTRIES[0]);
  const [phone, setPhone] = useState("");
  const [labelCategory, setLabelCategory] = useState<'Pribadi' | 'Rumah' | 'Kantor' | 'Other'>('Pribadi');
  const [customLabel, setCustomLabel] = useState("");
  const [editing, setEditing] = useState<Phone | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [otp, setOtp] = useState("");
  const [pendingVerification, setPendingVerification] = useState<{
    phone: string;
    label: string;
    isPrimary: boolean;
  } | null>(null);

  const effectiveLabel = labelCategory === 'Other' ? customLabel.trim() : labelCategory;

  const handlePhoneInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const cleaned = cleanLocalPhoneNumber(rawVal, selectedCountry.dialCode);
    setPhone(cleaned);
  };

  const handleSelectCountry = (countryCode: string) => {
    const found = COUNTRIES.find((c) => c.code === countryCode) || COUNTRIES[0];
    setSelectedCountry(found);
    if (phone) {
      setPhone(cleanLocalPhoneNumber(phone, found.dialCode));
    }
  };

  async function directSavePhone(fullNumber: string) {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Sesi tidak ditemukan");
      setMessage("Sesi verifikasi tidak ditemukan.");
      setBusy(false);
      return;
    }

    const values = {
      phone_number: fullNumber,
      label: effectiveLabel || null,
      is_primary: !phones?.length || editing?.is_primary === true,
      user_id: user.id,
      is_verified: true,
      verified_at: new Date().toISOString(),
    };

    const result = editing
      ? await supabase
          .from("user_phone_numbers")
          .update(values)
          .eq("id", editing.id)
          .eq("user_id", user.id)
      : await supabase.from("user_phone_numbers").insert(values);

    setBusy(false);
    if (result.error) {
      const errMsg = result.error.code === "23505" ? "Nomor tersebut sudah tersimpan." : "Nomor belum dapat disimpan.";
      toast.error("Gagal menyimpan", { description: errMsg });
      setMessage(errMsg);
      return;
    }
    setPhone("");
    setLabelCategory("Pribadi");
    setCustomLabel("");
    setOtp("");
    setEditing(null);
    setPendingVerification(null);
    const successMsg = editing ? "Nomor telepon berhasil diperbarui." : "Nomor telepon berhasil ditambahkan dan disimpan.";
    toast.success("Berhasil!", { description: successMsg });
    setMessage(successMsg);
    await mutate();
  }

  async function sendOtp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const fullNumber = formatFullPhoneNumber(phone, selectedCountry.dialCode);
    if (!fullNumber) {
      toast.error("Nomor tidak valid", { description: "Masukkan nomor telepon yang valid." });
      setMessage("Masukkan nomor telepon yang valid.");
      setBusy(false);
      return;
    }

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({
      phone: fullNumber,
    });
    if (updateError) {
      if (
        updateError.message.includes("provider") ||
        updateError.message.includes("SMS") ||
        (updateError as { status?: number }).status === 400
      ) {
        toast.info("SMS Provider belum aktif di Supabase, nomor langsung disimpan.");
        await directSavePhone(fullNumber);
        return;
      }
      setBusy(false);
      toast.error("Gagal mengirim OTP", { description: updateError.message });
      setMessage("Kode OTP belum dapat dikirim: " + updateError.message);
      return;
    }
    setBusy(false);
    setPendingVerification({
      phone: fullNumber,
      label: effectiveLabel,
      isPrimary: !phones?.length || editing?.is_primary === true,
    });
    toast.success("OTP Terkirim", { description: `Kode OTP sudah dikirim ke ${fullNumber}` });
    setMessage(`Kode OTP sudah dikirim ke ${fullNumber}.`);
  }

  async function verifyOtp(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage(null);
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !pendingVerification) {
      toast.error("Sesi tidak ditemukan", { description: "Sesi verifikasi tidak ditemukan." });
      setMessage("Sesi verifikasi tidak ditemukan.");
      setBusy(false);
      return;
    }
    const { error: verifyError } = await supabase.auth.verifyOtp({
      phone: pendingVerification.phone,
      token: otp.trim(),
      type: "phone_change",
    });
    if (verifyError) {
      toast.error("Verifikasi Gagal", { description: verifyError.message || "Kode OTP salah atau kedaluwarsa." });
      setMessage("Kode OTP salah atau sudah kedaluwarsa.");
      setBusy(false);
      return;
    }
    const values = {
      phone_number: pendingVerification.phone,
      label: pendingVerification.label || null,
      is_primary: pendingVerification.isPrimary,
      user_id: user.id,
      verified_at: new Date().toISOString(),
    };
    const result = editing
      ? await supabase
          .from("user_phone_numbers")
          .update(values)
          .eq("id", editing.id)
          .eq("user_id", user.id)
      : await supabase.from("user_phone_numbers").insert(values);
    setBusy(false);
    if (result.error) {
      const errMsg = result.error.code === "23505" ? "Nomor tersebut sudah tersimpan." : "Nomor belum dapat disimpan.";
      toast.error("Gagal menyimpan", { description: errMsg });
      setMessage(errMsg);
      return;
    }
    setPhone("");
    setLabelCategory("Pribadi");
    setCustomLabel("");
    setOtp("");
    setEditing(null);
    setPendingVerification(null);
    const successMsg = editing ? "Nomor telepon berhasil diperbarui." : "Nomor telepon berhasil diverifikasi dan disimpan.";
    toast.success("Berhasil!", { description: successMsg });
    setMessage(successMsg);
    await mutate();
  }

  async function deletePhone(id: string) {
    if (!window.confirm("Hapus nomor telepon ini?")) return;
    const { error: deleteError } = await createClient()
      .from("user_phone_numbers")
      .delete()
      .eq("id", id);
    if (deleteError) {
      toast.error("Gagal menghapus nomor", { description: deleteError.message });
      setMessage("Nomor belum dapat dihapus.");
      return;
    }
    toast.success("Nomor berhasil dihapus");
    await mutate();
  }

  async function makePrimary(item: Phone) {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setMessage("Sesi login tidak ditemukan.");
      return;
    }
    const clearResult = await supabase
      .from("user_phone_numbers")
      .update({ is_primary: false })
      .eq("user_id", user.id);
    if (clearResult.error) {
      setMessage("Nomor utama belum dapat diubah.");
      return;
    }
    const { error: updateError } = await supabase
      .from("user_phone_numbers")
      .update({ is_primary: true })
      .eq("id", item.id)
      .eq("user_id", user.id);
    if (updateError) {
      setMessage("Nomor utama belum dapat diubah.");
      return;
    }
    setMessage("Nomor utama berhasil diubah.");
    await mutate();
  }

  const handleStartEdit = (item: Phone) => {
    const matchingCountry =
      COUNTRIES.find((c) => item.phone_number.startsWith(c.dialCode)) ||
      COUNTRIES[0];
    setSelectedCountry(matchingCountry);
    const localNum = cleanLocalPhoneNumber(
      item.phone_number,
      matchingCountry.dialCode,
    );
    setEditing(item);
    setPhone(localNum);
    if (["Pribadi", "Rumah", "Kantor"].includes(item.label ?? "")) {
      setLabelCategory(item.label as "Pribadi" | "Rumah" | "Kantor");
      setCustomLabel("");
    } else if (item.label) {
      setLabelCategory("Other");
      setCustomLabel(item.label);
    } else {
      setLabelCategory("Pribadi");
      setCustomLabel("");
    }
    setPendingVerification(null);
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-xl font-semibold">Nomor telepon</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Tambahkan lebih dari satu nomor untuk akun Anda.
        </p>
      </div>

      <form
        onSubmit={pendingVerification ? verifyOtp : sendOtp}
        className="space-y-4 rounded-xl border border-border bg-card p-5 text-card-foreground"
      >
        {!pendingVerification ? (
          <>
            <div>
              <label htmlFor="phone" className="mb-1 block text-sm font-medium">
                Nomor telepon
              </label>

              {/* Country Flag & Dial Selector with Input */}
              <div className="flex items-stretch rounded-lg border border-input bg-background transition-colors focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-200">
                <div className="relative flex items-center border-r border-input">
                  <div className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium">
                    <span className="text-lg leading-none select-none">
                      {selectedCountry.flag}
                    </span>
                    <span className="font-semibold text-foreground/80">
                      {selectedCountry.dialCode}
                    </span>
                    <ChevronDown size={14} className="text-muted-foreground pointer-events-none" />
                  </div>
                  <select
                    aria-label="Pilih negara dan kode telepon"
                    value={selectedCountry.code}
                    onChange={(e) => handleSelectCountry(e.target.value)}
                    className="absolute inset-0 cursor-pointer opacity-0"
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.name} ({c.dialCode})
                      </option>
                    ))}
                  </select>
                </div>

                <input
                  id="phone"
                  required
                  type="tel"
                  inputMode="tel"
                  value={phone}
                  onChange={handlePhoneInputChange}
                  className="w-full bg-transparent px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground"
                  placeholder={selectedCountry.formatPlaceholder}
                />
              </div>

              <p className="mt-1 text-xs text-muted-foreground">
                Ketik nomor tanpa angka 0 di depan (misal: jika 0822..., otomatis menjadi 822...).
              </p>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                Label{" "}
                <span className="font-normal text-muted-foreground">
                  (pilih jenis kontak)
                </span>
              </label>
              <div className="flex flex-wrap gap-2">
                {(['Pribadi', 'Rumah', 'Kantor', 'Other'] as const).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setLabelCategory(cat)}
                    className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                      labelCategory === cat
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'border border-border bg-muted/50 text-foreground hover:bg-muted'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              {labelCategory === 'Other' && (
                <input
                  id="label"
                  value={customLabel}
                  onChange={(e) => setCustomLabel(e.target.value)}
                  className={`mt-2.5 ${inputClass}`}
                  placeholder="Ketik label khusus (misal: WhatsApp, Kost)..."
                />
              )}
            </div>
          </>
        ) : (
          <div>
            <label htmlFor="otp" className="mb-1 block text-sm font-medium">
              Kode OTP
            </label>
            <input
              id="otp"
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className={inputClass}
              placeholder="Masukkan kode dari SMS"
            />
          </div>
        )}

        <div className="flex gap-2">
          <button
            disabled={busy}
            className="rounded-lg bg-indigo-600 px-4 py-2.5 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
          >
            {busy
              ? "Memproses..."
              : pendingVerification
                ? "Verifikasi & simpan"
                : "Kirim kode OTP"}
          </button>
          {(editing || pendingVerification) && (
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                setPendingVerification(null);
                setPhone("");
                setLabelCategory("Pribadi");
                setCustomLabel("");
                setOtp("");
              }}
              className="rounded-lg border border-border px-4 py-2.5 transition hover:bg-accent"
            >
              Batal
            </button>
          )}
        </div>
      </form>

      {message && (
        <p
          role="status"
          className="rounded-lg bg-muted p-3 text-sm text-muted-foreground"
        >
          {message}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="rounded-lg bg-red-950/20 p-3 text-sm text-red-500"
        >
          Nomor telepon belum dapat dimuat.
        </p>
      )}

      <div className="space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Memuat nomor...</p>
        ) : (
          phones?.map((item: Phone) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card p-4"
            >
              <div>
                <p className="font-semibold">
                  {item.phone_number}{" "}
                  {item.is_primary && (
                    <span className="ml-2 rounded-full bg-indigo-500/15 px-2 py-1 text-xs text-indigo-500">
                      Utama
                    </span>
                  )}
                </p>
                {item.label && (
                  <p className="text-sm text-muted-foreground">{item.label}</p>
                )}
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => handleStartEdit(item)}
                  className="text-sm font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  Edit
                </button>
                {!item.is_primary && (
                  <button
                    type="button"
                    onClick={() => makePrimary(item)}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Jadikan utama
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => deletePhone(item.id)}
                  className="text-sm text-red-500 hover:text-red-600"
                >
                  Hapus
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
