import { getSupabaseServer, getSupabaseAdmin } from '@/lib/supabase/server'
import type { AiModel, ApiKeyConfig, Profile, SiteSettings } from '@/types'

export async function getSessionUser(): Promise<{ user: { id: string; email?: string } | null; profile: Profile | null }> {
  const supabase = await getSupabaseServer()
  if (!supabase) return { user: null, profile: null }
  const { data } = await supabase.auth.getUser()
  if (!data?.user) return { user: null, profile: null }
  const admin = getSupabaseAdmin()
  let profile: Profile | null = null
  if (admin) {
    const { data: p } = await admin.from('profiles').select('*').eq('id', data.user.id).maybeSingle()
    profile = p as Profile | null
  } else {
    const { data: p } = await supabase.from('profiles').select('*').eq('id', data.user.id).maybeSingle()
    profile = p as Profile | null
  }
  return { user: data.user, profile }
}

export async function getActiveModels(): Promise<AiModel[]> {
  const admin = getSupabaseAdmin()
  const supabase = admin ?? (await getSupabaseServer())
  if (!supabase) return []
  try {
    const { data, error } = await supabase.from('ai_models').select('*').eq('is_active', true).order('sort_order')
    if (error) return []
    return (data as AiModel[]) ?? []
  } catch {
    return []
  }
}

export async function getAllModels(): Promise<AiModel[]> {
  const admin = getSupabaseAdmin()
  const supabase = admin ?? (await getSupabaseServer())
  if (!supabase) return []
  const { data } = await supabase.from('ai_models').select('*').order('sort_order')
  return (data as AiModel[]) ?? []
}

export async function getApiKeys(): Promise<ApiKeyConfig[]> {
  const admin = getSupabaseAdmin()
  const supabase = admin ?? (await getSupabaseServer())
  if (!supabase) return []
  const { data } = await supabase.from('api_keys_config').select('*').order('created_at')
  return (data as ApiKeyConfig[]) ?? []
}

export async function getSiteSettings(): Promise<SiteSettings | null> {
  const admin = getSupabaseAdmin()
  const supabase = admin ?? (await getSupabaseServer())
  if (!supabase) return null
  const { data } = await supabase.from('site_settings').select('*').eq('id', 1).maybeSingle()
  return (data as SiteSettings) ?? null
}

export function todayKey(): string {
  return new Date().toISOString().slice(0, 10)
}
