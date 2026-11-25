import { getActiveModels, getSessionUser } from '@/lib/ai/server-helpers'

export async function GET() {
  const models = await getActiveModels()
  const { profile } = await getSessionUser()
  const role = profile?.role ?? 'guest'
  const locked = new Set(profile?.locked_models ?? [])
  const visible = models.filter((m) => {
    if (locked.has(m.model_id)) return false
    if (m.min_plan === 'owner') return role === 'owner'
    if (m.min_plan === 'unlimited') return role === 'owner' || role === 'admin'
    return true
  })
  // Furina persona selalu tersedia (kalau belum di-seed DB, tetap muncul)
  if (!visible.some((m) => m.model_id === 'furina')) {
    visible.push({
      id: 'furina', provider: 'persona', model_id: 'furina',
      display_name: 'Furina ✨ (Persona)', description: 'Persona Furina — anggun, teatrikal, jenaka. Roleplay ringan dalam batas aman.',
      icon_url: null, is_active: true, is_free: true, is_vision: false, is_reasoning: false,
      min_plan: 'free', price_input_per_1m: 0, price_output_per_1m: 0, max_tokens: 4096,
      temperature_default: 1.1, sort_order: 0, system_prompt: null,
    })
  }
  // AstraBrain selalu tersedia sebagai model bawaan (tanpa API key)
  visible.push({
    id: 'astra-brain', provider: 'astrachat', model_id: 'astra-brain',
    display_name: 'AstraBrain (Bawaan)', description: 'Model terlatih dari UltraChat (EN), Alpaca GPT-4 (ID), dan OpenCoder (Coding). Gratis, tanpa API key.',
    icon_url: null, is_active: true, is_free: true, is_vision: false, is_reasoning: false,
    min_plan: 'free', price_input_per_1m: 0, price_output_per_1m: 0, max_tokens: 4096,
    temperature_default: 0.7, sort_order: -1, system_prompt: null,
  })
  return Response.json({ models: visible })
}
