import { getSessionUser } from '@/lib/ai/server-helpers'

export async function GET() {
  const { user, profile } = await getSessionUser()
  if (!user) return Response.json({ user: null })
  return Response.json({ user: { id: user.id, email: user.email }, profile })
}
