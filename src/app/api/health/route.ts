import { getSupabaseAdmin } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const admin = getSupabaseAdmin()
  if (!admin) {
    return Response.json({
      ok: true,
      database: 'not_configured',
      hint: 'Isi NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, dan SUPABASE_SERVICE_ROLE_KEY di env, lalu jalankan supabase/migrations/001_init.sql.',
    })
  }
  const { error } = await admin.from('site_settings').select('id').limit(1)
  return Response.json({ ok: !error, database: error ? 'error' : 'connected', detail: error?.message ?? null })
}
