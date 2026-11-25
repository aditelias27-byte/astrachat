import { NextRequest } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/ai/server-helpers'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { user } = await getSessionUser()
  const supabase = await getSupabaseServer()
  if (!user || !supabase) return Response.json({ error: 'unauthorized' }, { status: 401 })
  const body = await req.json()
  const patch: Record<string, unknown> = {}
  if (typeof body.title === 'string') patch.title = body.title
  if (typeof body.is_pinned === 'boolean') patch.is_pinned = body.is_pinned
  if (typeof body.folder === 'string' || body.folder === null) patch.folder = body.folder
  const { error } = await supabase.from('conversations').update(patch).eq('id', params.id).eq('user_id', user.id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const { user } = await getSessionUser()
  const supabase = await getSupabaseServer()
  if (!user || !supabase) return Response.json({ error: 'unauthorized' }, { status: 401 })
  await supabase.from('messages').delete().eq('conversation_id', params.id)
  const { error } = await supabase.from('conversations').delete().eq('id', params.id).eq('user_id', user.id)
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ ok: true })
}
