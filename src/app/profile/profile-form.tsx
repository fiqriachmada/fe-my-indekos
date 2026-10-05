"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"

export default function ProfileForm({ firstName, lastName, displayName, email, role }: { firstName: string; lastName: string; displayName: string; email: string; role: string }) {
  const [form, setForm] = useState({ firstName, lastName })
  const [status, setStatus] = useState("")
  const generatedName = [form.firstName.trim(), form.lastName.trim()].filter(Boolean).join(" ")

  async function save(event: React.FormEvent) {
    event.preventDefault()
    setStatus("")
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ data: { first_name: form.firstName.trim(), last_name: form.lastName.trim(), display_name: generatedName } })
    setStatus(error ? "Profil belum berhasil disimpan." : "Profil berhasil diperbarui.")
  }

  return <form onSubmit={save} className="space-y-5"><div><span className="text-sm text-muted-foreground">Email</span><p className="font-medium">{email}</p></div><div><span className="text-sm text-muted-foreground">Role</span><p className="font-medium capitalize">{role}</p></div><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Firstname<input value={form.firstName} onChange={(event) => setForm({ ...form, firstName: event.target.value })} className="mt-2 w-full rounded-xl border border-input bg-background px-3 py-2" /></label><label className="text-sm font-medium">Lastname<input value={form.lastName} onChange={(event) => setForm({ ...form, lastName: event.target.value })} className="mt-2 w-full rounded-xl border border-input bg-background px-3 py-2" /></label></div><div><span className="text-sm text-muted-foreground">Display name</span><p className="mt-1 font-medium">{generatedName || displayName || "-"}</p><p className="text-xs text-muted-foreground">Otomatis dibuat dari firstname dan lastname.</p></div><button type="submit" className="rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white transition hover:bg-indigo-700">Simpan profil</button>{status && <p role="status" className="text-sm text-muted-foreground">{status}</p>}</form>
}
