import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import ProfileForm from "./profile-form"

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/login")

  const metadata = user.user_metadata ?? {}

  const [profileRes, usernameRes, ownedRes, memberRes, roomRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("first_name, last_name, display_name, username")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("usernames")
      .select("username, last_changed_at")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase.from("properties").select("id").eq("owner_id", user.id).limit(1),
    supabase
      .from("property_members")
      .select("role:roles(name)")
      .eq("user_id", user.id)
      .returns<{ role: { name: string } | null }[]>(),
    supabase.from("room_members").select("room_id").eq("user_id", user.id).limit(1),
  ])

  const profile = profileRes.data

  const firstName =
    (typeof profile?.first_name === "string" && profile.first_name) ||
    (typeof metadata.first_name === "string" && metadata.first_name) ||
    ""

  const lastName =
    (typeof profile?.last_name === "string" && profile.last_name) ||
    (typeof metadata.last_name === "string" && metadata.last_name) ||
    ""

  const displayName =
    (typeof profile?.display_name === "string" && profile.display_name) ||
    (typeof metadata.display_name === "string" && metadata.display_name) ||
    [firstName, lastName].filter(Boolean).join(" ")

  const username =
    usernameRes.data?.username ||
    (typeof profile?.username === "string" && profile.username) ||
    (typeof metadata.username === "string" && metadata.username) ||
    ""

  const usernameLastChanged = usernameRes.data?.last_changed_at ?? null

  const rolesSet = new Set<string>()

  if ((ownedRes.data?.length ?? 0) > 0) {
    rolesSet.add("Owner")
  }

  for (const item of memberRes.data ?? []) {
    const roleName = item.role?.name
    if (roleName) {
      const formatted =
        roleName === "property-admin"
          ? "Property Admin"
          : roleName.charAt(0).toUpperCase() + roleName.slice(1)
      rolesSet.add(formatted)
    }
  }

  if ((roomRes.data?.length ?? 0) > 0) {
    rolesSet.add("Occupant")
  }

  if (rolesSet.size === 0 && typeof metadata.role === "string" && metadata.role.trim()) {
    rolesSet.add(metadata.role.charAt(0).toUpperCase() + metadata.role.slice(1))
  }

  const roles = rolesSet.size > 0 ? Array.from(rolesSet) : ["User"]

  return (
    <main className="min-h-screen bg-background px-6 py-12 text-foreground transition-colors">
      <div className="mx-auto max-w-2xl">
        <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">My Indekos</p>
        <h1 className="mt-2 text-4xl font-bold">Profile</h1>
        <div className="mt-8 rounded-3xl border border-border bg-card p-6 shadow-sm">
          <ProfileForm
            userId={user.id}
            email={user.email ?? "-"}
            initialFirstName={firstName}
            initialLastName={lastName}
            initialDisplayName={displayName}
            roles={roles}
          />
        </div>
      </div>
    </main>
  )
}
