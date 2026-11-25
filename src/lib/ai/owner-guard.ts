import { getSessionUser } from './server-helpers'

export async function requireOwner(): Promise<{ ok: boolean; email?: string }> {
  const { user, profile } = await getSessionUser()
  if (!user || !profile) return { ok: false }
  if (profile.role !== 'owner' && profile.role !== 'admin') return { ok: false }
  return { ok: true, email: profile.email }
}
