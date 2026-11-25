import { getActiveModels, getSessionUser } from '@/lib/ai/server-helpers'

export async function GET() {
  const models = await getActiveModels()
  const { profile } = await getSessionUser()
  const role = profile?.role ?? 'guest'
  const visible = models.filter((m) => {
    if (m.min_plan === 'owner') return role === 'owner'
    if (m.min_plan === 'unlimited') return role === 'owner' || role === 'admin'
    return true
  })
  return Response.json({ models: visible })
}
