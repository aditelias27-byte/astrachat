import { NextRequest } from 'next/server'
import { requireOwner } from '@/lib/ai/owner-guard'
import { getSupabaseAdmin } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const guard = await requireOwner()
  if (!guard.ok) return Response.json({ error: 'forbidden' }, { status: 403 })
  const admin = getSupabaseAdmin()
  if (!admin) return Response.json({ users: [] })
  const q = req.nextUrl.searchParams.get('q') ?? ''
  let query = admin.from('profiles').select('*').order('created_at', { ascending: false }).limit(200)
  if (q) query = query.or(`email.ilike.%${q}%,full_name.ilike.%${q}%`)
  const { data } = await query
  return Response.json({ users: data ?? [] })
}

export async function PATCH(req: NextRequest) {
  const guard = await requireOwner()
  if (!guard.ok) return Response.json({ error: 'forbidden' }, { status: 403 })
  const admin = getSupabaseAdmin()
  if (!admin) return Response.json({ error: 'Supabase belum dikonfigurasi' }, { status: 501 })
  const b = await req.json()
  if (!b.id) return Response.json({ error: 'id wajib' }, { status: 400 })
  const patch: Record<string, unknown> = {}
  if (b.role) patch.role = b.role
  if (typeof b.is_banned === 'boolean') patch.is_banned = b.is_banned
  if (b.reset_limit) patch.daily_limit = null
  const { error } = await admin.from('profiles').update(patch).eq('id', b.id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  await admin.from('audit_logs').insert({ actor_email: guard.email, action: 'update_user', detail: `ID ${b.id}: ${JSON.stringify(patch)}` })
  return Response.json({ ok: true })
}

export async function DELETE(req: NextRequest) {
  const guard = await requireOwner()
  if (!guard.ok) return Response.json({ error: 'forbidden' }, { status: 403 })
  const admin = getSupabaseAdmin()
  if (!admin) return Response.json({ error: 'Supabase belum dikonfigurasi' }, { status: 501 })
  const id = req.nextUrl.searchParams.get('id')
  if (!id) return Response.json({ error: 'id wajib' }, { status: 400 })
  await admin.auth.admin.deleteUser(id)
  await admin.from('profiles').delete().eq('id', id)
  await admin.from('audit_logs').insert({ actor_email: guard.email, action: 'delete_user', detail: `ID ${id}` })
  return Response.json({ ok: true })
}
