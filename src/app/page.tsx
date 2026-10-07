import { getIndekosLandingStats } from "@/lib/landing-stats"
import LandingClient from "./landing-client"

export const metadata = {
  title: "My Indekos — Manajemen & Pencarian Kos Nyaman",
  description: "Platform pengelolaan kamar kos, monitoring sewa, pembayaran utilitas, dan portal pencarian kos.",
}

export default async function Page() {
  const stats = await getIndekosLandingStats()
  return <LandingClient stats={stats} />
}
