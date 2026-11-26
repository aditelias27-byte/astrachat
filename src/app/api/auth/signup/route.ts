import { NextRequest } from 'next/server'
import { getSupabaseAdmin, getSupabaseServer } from '@/lib/supabase/server'
import { getSiteSettings } from '@/lib/ai/server-helpers'

export async function POST(req: NextRequest) {
  const supabase = await getSupabaseServer()
  const admin = getSupabaseAdmin()
  if (!supabase) return Response.json({ error: 'Supabase belum dikonfigurasi. Isi .env lalu restart.' }, { status: 501 })
  const settings = await getSiteSettings()
  if (settings && !settings.registration_enabled) {
    return Response.json({ error: 'Pendaftaran sedang ditutup oleh Owner.' }, { status: 403 })
  }
  const { email, password, full_name } = await req.json()
  const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { full_name } } })
  if (error) return Response.json({ error: error.message }, { status: 400 })
  if (admin && data.user) {
    const adminEmails = (process.env.ADMIN_EMAILS ?? '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
    const norm = email.trim().toLowerCase()
    const role = norm === (process.env.OWNER_EMAIL ?? '').trim().toLowerCase()
      ? 'owner'
      : adminEmails.includes(norm)
        ? 'admin'
        : 'user'
    await admin.from('profiles').upsert({ id: data.user.id, email, full_name: full_name ?? null, role })
  }
  return Response.json({ ok: true, needsConfirmation: !data.session })
}
