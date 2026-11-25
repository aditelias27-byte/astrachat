import { requireOwner } from '@/lib/ai/owner-guard'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { todayKey } from '@/lib/ai/server-helpers'
import type { OwnerStats } from '@/types'

export async function GET() {
  const guard = await requireOwner()
  if (!guard.ok) return Response.json({ error: 'forbidden' }, { status: 403 })
  const admin = getSupabaseAdmin()
  if (!admin) return Response.json({ error: 'Supabase belum dikonfigurasi' }, { status: 501 })

  const today = `${todayKey()}T00:00:00Z`
  const weekAgo = new Date(Date.now() - 6 * 86400000).toISOString().slice(0, 10)

  const [{ count: totalUsers }, { count: chatsToday }, logs, convs, profiles] = await Promise.all([
    admin.from('profiles').select('id', { count: 'exact', head: true }),
    admin.from('usage_logs').select('id', { count: 'exact', head: true }).eq('status', 'success').gte('created_at', today),
    admin.from('usage_logs').select('token_input, token_output, cost, model_id, created_at, status, error_message, user_id').gte('created_at', `${weekAgo}T00:00:00Z`).order('created_at', { ascending: false }).limit(500),
    admin.from('conversations').select('id, title, model_used, created_at, user_id').order('created_at', { ascending: false }).limit(10),
    admin.from('profiles').select('id, email, full_name, last_sign_in_at').limit(500),
  ])

  const logsAll = logs.data ?? []
  const tokensToday = logsAll.filter((l) => l.created_at >= today).reduce((a, l) => a + (l.token_input ?? 0) + (l.token_output ?? 0), 0)
  const costToday = logsAll.filter((l) => l.created_at >= today).reduce((a, l) => a + (l.cost ?? 0), 0)

  const tokens7d: { date: string; tokens: number }[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10)
    tokens7d.push({ date: d.slice(5), tokens: logsAll.filter((l) => l.created_at.slice(0, 10) === d).reduce((a, l) => a + (l.token_input ?? 0) + (l.token_output ?? 0), 0) })
  }

  const modelCount: Record<string, number> = {}
  for (const l of logsAll) if (l.model_id) modelCount[l.model_id] = (modelCount[l.model_id] ?? 0) + 1
  const popular_models = Object.entries(modelCount).map(([model, count]) => ({ model, count })).sort((a, b) => b.count - a.count).slice(0, 6)

  const emailMap = new Map((profiles.data ?? []).map((p) => [p.id, p.email]))
  const onlineUsers = (profiles.data ?? []).filter((p) => p.last_sign_in_at && Date.now() - new Date(p.last_sign_in_at).getTime() < 24 * 3600_000).length

  const stats: OwnerStats = {
    total_users: totalUsers ?? 0,
    chats_today: chatsToday ?? 0,
    tokens_today: tokensToday,
    cost_today: costToday,
    online_users: onlineUsers,
    tokens_7d: tokens7d,
    popular_models,
    recent_chats: (convs.data ?? []).map((c) => ({ id: c.id, title: c.title, email: emailMap.get(c.user_id) ?? '—', model: c.model_used, created_at: c.created_at })),
  }
  return Response.json({ stats })
}
