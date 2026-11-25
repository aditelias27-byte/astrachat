import { NextRequest } from 'next/server'
import { requireOwner } from '@/lib/ai/owner-guard'
import { getSupabaseAdmin } from '@/lib/supabase/server'

export async function GET(req: NextRequest) {
  const guard = await requireOwner()
  if (!guard.ok) return Response.json({ error: 'forbidden' }, { status: 403 })
  const admin = getSupabaseAdmin()
  if (!admin) return Response.json({ logs: [], audit: [] })
  const type = req.nextUrl.searchParams.get('type') ?? 'usage'
  if (type === 'audit') {
    const { data } = await admin.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(200)
    return Response.json({ audit: data ?? [] })
  }
  if (type === 'errors') {
    const { data } = await admin.from('usage_logs').select('*').eq('status', 'error').order('created_at', { ascending: false }).limit(200)
    return Response.json({ logs: data ?? [] })
  }
  const { data } = await admin.from('usage_logs').select('*').order('created_at', { ascending: false }).limit(200)
  return Response.json({ logs: data ?? [] })
}
