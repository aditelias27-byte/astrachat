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
