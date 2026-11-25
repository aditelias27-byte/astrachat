import { NextRequest } from 'next/server'
import { requireOwner } from '@/lib/ai/owner-guard'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { encrypt, maskKey } from '@/lib/ai/crypto'
import { DEFAULT_GATEWAY_BASE_URL } from '@/lib/constants'
import type { ApiKeyConfig } from '@/types'

export async function GET() {
  const guard = await requireOwner()
  if (!guard.ok) return Response.json({ error: 'forbidden' }, { status: 403 })
  const admin = getSupabaseAdmin()
  if (!admin) return Response.json({ keys: [] })
  const { data } = await admin.from('api_keys_config').select('*').order('created_at')
  const keys = ((data ?? []) as ApiKeyConfig[]).map((k) => ({ ...k, api_key_masked: maskKey(k.api_key_encrypted.split(':').pop() ?? '') }))
  return Response.json({ keys })
}

export async function POST(req: NextRequest) {
  const guard = await requireOwner()
  if (!guard.ok) return Response.json({ error: 'forbidden' }, { status: 403 })
  const admin = getSupabaseAdmin()
  if (!admin) return Response.json({ error: 'Supabase belum dikonfigurasi' }, { status: 501 })
  const body = await req.json()
  if (!body.provider_name || !body.api_key) return Response.json({ error: 'Provider & API Key wajib diisi' }, { status: 400 })
  const { data, error } = await admin
    .from('api_keys_config')
    .insert({
      provider_name: body.provider_name,
      base_url: body.base_url || DEFAULT_GATEWAY_BASE_URL,
      api_key_encrypted: encrypt(body.api_key),
      model_id: body.model_id || null,
      is_active: body.is_active ?? true,
      is_fallback: body.is_fallback ?? false,
    })
    .select()
    .single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  await admin.from('audit_logs').insert({ actor_email: guard.email, action: 'create_api_key', detail: `Provider ${body.provider_name}` })
  return Response.json({ key: data })
}

export async function PATCH(req: NextRequest) {
  const guard = await requireOwner()
  if (!guard.ok) return Response.json({ error: 'forbidden' }, { status: 403 })
  const admin = getSupabaseAdmin()
  if (!admin) return Response.json({ error: 'Supabase belum dikonfigurasi' }, { status: 501 })
  const body = await req.json()
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (typeof body.is_active === 'boolean') patch.is_active = body.is_active
  if (typeof body.is_fallback === 'boolean') patch.is_fallback = body.is_fallback
  if (typeof body.base_url === 'string') patch.base_url = body.base_url
  if (typeof body.api_key === 'string' && body.api_key) patch.api_key_encrypted = encrypt(body.api_key)
  const { error } = await admin.from('api_keys_config').update(patch).eq('id', body.id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  await admin.from('audit_logs').insert({ actor_email: guard.email, action: 'update_api_key', detail: `ID ${body.id}` })
  return Response.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const guard = await requireOwner()
  if (!guard.ok) return Response.json({ error: 'forbidden' }, { status: 403 })
  const admin = getSupabaseAdmin()
  if (!admin) return Response.json({ error: 'Supabase belum dikonfigurasi' }, { status: 501 })
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return Response.json({ error: 'id wajib' }, { status: 400 })
  await admin.from('api_keys_config').delete().eq('id', id)
  await admin.from('audit_logs').insert({ actor_email: guard.email, action: 'delete_api_key', detail: `ID ${id}` })
  return Response.json({ ok: true })
}
