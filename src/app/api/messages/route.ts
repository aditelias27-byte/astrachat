import { NextRequest } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/ai/server-helpers'

export async function GET(req: NextRequest) {
  const { user } = await getSessionUser()
  const supabase = await getSupabaseServer()
  if (!user || !supabase) return Response.json({ messages: [] })
  const conversationId = req.nextUrl.searchParams.get('conversationId')
  if (!conversationId) return Response.json({ messages: [] })
  const { data: conv } = await supabase.from('conversations').select('id').eq('id', conversationId).eq('user_id', user.id).maybeSingle()
  if (!conv) return Response.json({ messages: [] })
  const { data } = await supabase
    .from('messages')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
  return Response.json({ messages: data ?? [] })
}

export async function PATCH(req: NextRequest) {
  const { user } = await getSessionUser()
  const supabase = await getSupabaseServer()
  if (!user || !supabase) return Response.json({ error: 'unauthorized' }, { status: 401 })
  const body = await req.json()
  if (typeof body.id !== 'string' || typeof body.liked !== 'boolean') {
    return Response.json({ error: 'invalid' }, { status: 400 })
  }
  await supabase.from('messages').update({ liked: body.liked }).eq('id', body.id)
  return Response.json({ ok: true })
}
