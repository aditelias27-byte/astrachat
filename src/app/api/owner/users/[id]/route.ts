import { NextRequest } from 'next/server'
import { requireOwner } from '@/lib/ai/owner-guard'
import { getSupabaseAdmin } from '@/lib/supabase/server'

// PATCH /api/owner/users/[id] — aksi: set_role, ban, unban, reset_limit, delete, set_token_limit, lock_models
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requireOwner()
  if (!guard.ok) return Response.json({ error: 'forbidden' }, { status: 403 })
  const admin = getSupabaseAdmin()
  if (!admin) return Response.json({ error: 'Supabase belum dikonfigurasi' }, { status: 501 })
  const id = params.id
  const b = await req.json()
  const action = b.action as string
  const patch: Record<string, unknown> = {}
  let message = 'OK'

  if (action === 'set_role') {
    if (!['user', 'admin', 'owner'].includes(b.value)) return Response.json({ error: 'role tidak valid' }, { status: 400 })
    patch.role = b.value
    message = `Role diubah ke ${b.value}`
  } else if (action === 'ban') { patch.is_banned = true; message = 'User di-ban' }
  else if (action === 'unban') { patch.is_banned = false; message = 'User di-unban' }
  else if (action === 'reset_limit') { patch.daily_limit = null; patch.token_limit_daily = null; message = 'Limit direset ke default' }
  else if (action === 'set_token_limit') {
    const v = b.value === null || b.value === '' ? null : Number(b.value)
    if (v !== null && (!Number.isFinite(v) || v < 0)) return Response.json({ error: 'token_limit harus angka >= 0 atau kosong (null = default)' }, { status: 400 })
    patch.token_limit_daily = v
    message = v === null ? 'Token limit dikosongkan (pakai default global)' : `Token limit harian di-set ke ${v.toLocaleString('id-ID')}`
  } else if (action === 'lock_models') {
    if (!Array.isArray(b.value)) return Response.json({ error: 'value harus array model_id' }, { status: 400 })
    patch.locked_models = b.value
    message = `${b.value.length} model dikunci untuk user ini`
  } else if (action === 'delete') {
    const { error } = await admin.from('profiles').delete().eq('id', id)
    if (error) return Response.json({ error: error.message }, { status: 500 })
    await admin.from('audit_logs').insert({ actor_email: guard.email, action: 'delete_user', detail: `ID ${id}` })
    return Response.json({ ok: true, message: 'User dihapus' })
  } else {
    return Response.json({ error: 'action tidak dikenal' }, { status: 400 })
  }

  const { error } = await admin.from('profiles').update(patch).eq('id', id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  await admin.from('audit_logs').insert({ actor_email: guard.email, action, detail: `user ${id}: ${JSON.stringify(patch)}` })
  return Response.json({ ok: true, message })
}
