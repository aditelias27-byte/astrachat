import { NextRequest } from 'next/server'
import { requireOwner } from '@/lib/ai/owner-guard'
import { getSupabaseAdmin } from '@/lib/supabase/server'

// PATCH/DELETE /api/owner/models/[id] — id dari URL digabung ke body lalu diproses seperti route utama
const FIELDS = ['display_name', 'description', 'icon_url', 'is_active', 'is_free', 'is_vision', 'is_reasoning', 'min_plan', 'system_prompt', 'provider', 'model_id', 'locked_for_free']
const NUMS = ['price_input_per_1m', 'price_output_per_1m', 'max_tokens', 'temperature_default', 'sort_order']

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireOwner()
  if (!guard.ok) return Response.json({ error: 'forbidden' }, { status: 403 })
  const admin = getSupabaseAdmin()
  if (!admin) return Response.json({ error: 'Supabase belum dikonfigurasi' }, { status: 501 })
  const b = await req.json()
  const patch: Record<string, unknown> = {}
  for (const f of FIELDS) if (f in b) patch[f] = b[f]
  for (const f of NUMS) if (f in b) patch[f] = Number(b[f])
  const { error } = await admin.from('ai_models').update(patch).eq('id', params.id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  await admin.from('audit_logs').insert({ actor_email: guard.email, action: 'update_model', detail: `${params.id}: ${JSON.stringify(patch)}` })
  return Response.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireOwner()
  if (!guard.ok) return Response.json({ error: 'forbidden' }, { status: 403 })
  const admin = getSupabaseAdmin()
  if (!admin) return Response.json({ error: 'Supabase belum dikonfigurasi' }, { status: 501 })
  const { error } = await admin.from('ai_models').delete().eq('id', params.id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  await admin.from('audit_logs').insert({ actor_email: guard.email, action: 'delete_model', detail: params.id })
  return Response.json({ ok: true })
}
