// Cek provider OAuth mana yang sudah diaktifkan di Supabase
import { getSupabaseAdmin } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const admin = getSupabaseAdmin()
  if (!admin) return Response.json({ google: false, github: false, configured: false })
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) return Response.json({ google: false, github: false, configured: false })
  try {
    const res = await fetch(`${url}/auth/v1/settings`, { headers: { apikey: anon, Authorization: `Bearer ${anon}` } })
    const d = (await res.json()) as { external?: Record<string, { enabled?: boolean }> }
    return Response.json({
      configured: true,
      google: Boolean(d.external?.google?.enabled),
      github: Boolean(d.external?.github?.enabled),
    })
  } catch {
    return Response.json({ configured: true, google: false, github: false })
  }
}
