import { NextRequest } from 'next/server'
import { requireOwner } from '@/lib/ai/owner-guard'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { getAllModels } from '@/lib/ai/server-helpers'
import type { AiModel } from '@/types'

export async function GET() {
  const guard = await requireOwner()
  if (!guard.ok) return Response.json({ error: 'forbidden' }, { status: 403 })
  return Response.json({ models: await getAllModels() })
}

export async function POST(req: NextRequest) {
  const guard = await requireOwner()
  if (!guard.ok) return Response.json({ error: 'forbidden' }, { status: 403 })
  const admin = getSupabaseAdmin()
  if (!admin) return Response.json({ error: 'Supabase belum dikonfigurasi' }, { status: 501 })
  const b = await req.json()
  if (!b.model_id || !b.display_name) return Response.json({ error: 'model_id & display_name wajib' }, { status: 400 })
  const { data, error } = await admin
    .from('ai_models')
    .insert({
      model_id: b.model_id,
      display_name: b.display_name,
      provider: b.provider ?? 'custom',
      description: b.description ?? null,
      icon_url: b.icon_url ?? null,
      is_active: b.is_active ?? true,
      is_free: b.is_free ?? false,
      is_vision: b.is_vision ?? false,
      is_reasoning: b.is_reasoning ?? false,
      min_plan: b.min_plan ?? 'free',
      price_input_per_1m: Number(b.price_input_per_1m) || 0,
      price_output_per_1m: Number(b.price_output_per_1m) || 0,
      max_tokens: Number(b.max_tokens) || 4096,
      temperature_default: Number(b.temperature_default ?? 0.7),
      sort_order: Number(b.sort_order) || 99,
      system_prompt: b.system_prompt ?? null,
    })
    .select()
    .single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  await admin.from('audit_logs').insert({ actor_email: guard.email, action: 'create_model', detail: b.model_id })
  return Response.json({ model: data })
}

export async function PATCH(req: NextRequest) {
  const guard = await requireOwner()
  if (!guard.ok) return Response.json({ error: 'forbidden' }, { status: 403 })
  const admin = getSupabaseAdmin()
  if (!admin) return Response.json({ error: 'Supabase belum dikonfigurasi' }, { status: 501 })
  const b = await req.json()
  if (!b.id) return Response.json({ error: 'id wajib' }, { status: 400 })
  const patch: Record<string, unknown> = {}
  const fields = ['display_name', 'description', 'icon_url', 'is_active', 'is_free', 'is_vision', 'is_reasoning', 'min_plan', 'system_prompt', 'provider', 'model_id']
  for (const f of fields) if (f in b) patch[f] = b[f]
  const nums = ['price_input_per_1m', 'price_output_per_1m', 'max_tokens', 'temperature_default', 'sort_order']
  for (const f of nums) if (f in b) patch[f] = Number(b[f])
  const { error } = await admin.from('ai_models').update(patch).eq('id', b.id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  await admin.from('audit_logs').insert({ actor_email: guard.email, action: 'update_model', detail: `ID ${b.id}` })
  return Response.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const guard = await requireOwner()
  if (!guard.ok) return Response.json({ error: 'forbidden' }, { status: 403 })
  const admin = getSupabaseAdmin()
  if (!admin) return Response.json({ error: 'Supabase belum dikonfigurasi' }, { status: 501 })
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return Response.json({ error: 'id wajib' }, { status: 400 })
  await admin.from('ai_models').delete().eq('id', id)
  await admin.from('audit_logs').insert({ actor_email: guard.email, action: 'delete_model', detail: `ID ${id}` })
  return Response.json({ ok: true })
}
