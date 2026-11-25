import { NextRequest } from 'next/server'
import { requireOwner } from '@/lib/ai/owner-guard'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { getSiteSettings } from '@/lib/ai/server-helpers'

export async function GET() {
  const guard = await requireOwner()
  if (!guard.ok) return Response.json({ error: 'forbidden' }, { status: 403 })
  return Response.json({ settings: await getSiteSettings() })
}

export async function PATCH(req: NextRequest) {
  const guard = await requireOwner()
  if (!guard.ok) return Response.json({ error: 'forbidden' }, { status: 403 })
  const admin = getSupabaseAdmin()
  if (!admin) return Response.json({ error: 'Supabase belum dikonfigurasi' }, { status: 501 })
  const b = await req.json()
  const patch: Record<string, unknown> = {}
  const fields = ['site_name', 'site_logo', 'welcome_message', 'system_prompt_global', 'maintenance_mode', 'registration_enabled', 'max_free_chat_per_day', 'max_token_per_day', 'max_token_per_message', 'primary_color', 'default_dark', 'landing_text', 'footer_text', 'social_links']
  for (const f of fields) if (f in b) patch[f] = b[f]
  const { error } = await admin.from('site_settings').update(patch).eq('id', 1)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  await admin.from('audit_logs').insert({ actor_email: guard.email, action: 'update_settings', detail: Object.keys(patch).join(', ') })
  return Response.json({ ok: true })
}
