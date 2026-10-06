import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import ProfileForm from "./profile-form"

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const metadata = user.user_metadata ?? {}
  const firstName = typeof metadata.first_name === "string" ? metadata.first_name : ""
  const lastName = typeof metadata.last_name === "string" ? metadata.last_name : ""
  const displayName = typeof metadata.display_name === "string" && metadata.display_name.trim() ? metadata.display_name : [firstName, lastName].filter(Boolean).join(" ")
  const role = typeof metadata.role === "string" ? metadata.role : "User"

  return <main className="min-h-screen bg-background px-6 py-12 text-foreground transition-colors"><div className="mx-auto max-w-2xl"><p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">My Indekos</p><h1 className="mt-2 text-4xl font-bold">Profile</h1><div className="mt-8 rounded-3xl border border-border bg-card p-6 shadow-sm"><ProfileForm firstName={firstName} lastName={lastName} displayName={displayName} email={user.email ?? "-"} role={role} /></div></div></main>
}
