import { NextRequest } from 'next/server'
import { getSupabaseServer } from '@/lib/supabase/server'
import { getSessionUser } from '@/lib/ai/server-helpers'

export async function GET() {
  const { user } = await getSessionUser()
  const supabase = await getSupabaseServer()
  if (!user || !supabase) return Response.json({ conversations: [] })
  const { data } = await supabase
    .from('conversations')
    .select('*')
    .eq('user_id', user.id)
    .order('is_pinned', { ascending: false })
    .order('updated_at', { ascending: false })
  return Response.json({ conversations: data ?? [] })
}

export async function POST(req: NextRequest) {
  const { user } = await getSessionUser()
  const supabase = await getSupabaseServer()
  if (!user || !supabase) return Response.json({ error: 'unauthorized' }, { status: 401 })
  const body = await req.json()
  const { data, error } = await supabase
    .from('conversations')
    .insert({ user_id: user.id, title: body.title ?? 'Chat baru', folder: body.folder ?? null })
    .select()
    .single()
  if (error) return Response.json({ error: error.message }, { status: 500 })
  return Response.json({ conversation: data })
}
