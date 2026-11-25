import { decrypt } from './crypto'
import type { AiModel, ApiKeyConfig } from '@/types'

export interface GatewayCallOptions {
  model: AiModel
  keys: ApiKeyConfig[]
  messages: { role: string; content: unknown }[]
  temperature?: number
  maxTokens?: number
  signal?: AbortSignal
}

export interface GatewayResult {
  ok: boolean
  error?: string
  reader?: ReadableStreamDefaultReader<Uint8Array>
  keyUsed?: ApiKeyConfig
}

/** Pick active keys for a model: exact match first, then provider-wide, then fallback keys. Ordered. */
export function pickKeys(model: AiModel, keys: ApiKeyConfig[]): ApiKeyConfig[] {
  const active = keys.filter((k) => k.is_active)
  const exact = active.filter((k) => k.model_id === model.model_id)
  const providerWide = active.filter((k) => !k.model_id && k.provider_name === model.provider)
  const any = active.filter((k) => !k.model_id && k.provider_name !== model.provider)
  const sorted = (arr: ApiKeyConfig[]) => [...arr].sort((a, b) => Number(b.is_fallback) - Number(a.is_fallback))
  return [...sorted(exact), ...sorted(providerWide), ...sorted(any)]
}

/** Open the upstream SSE stream, trying keys in order (fallback). */
export async function openStream(opts: GatewayCallOptions): Promise<GatewayResult> {
  const keys = pickKeys(opts.model, opts.keys)
  if (keys.length === 0) {
    return { ok: false, error: 'Tidak ada API Key aktif untuk model ini. Hubungi Owner di Panel Owner > API & Model.' }
  }
  let lastError = ''
  for (const key of keys) {
    const apiKey = decrypt(key.api_key_encrypted)
    if (!apiKey) {
      lastError = `API Key provider ${key.provider_name} tidak dapat didekripsi (cek ENCRYPTION_KEY).`
      continue
    }
    try {
      const res = await fetch(`${key.base_url.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: opts.model.model_id,
          messages: opts.messages,
          stream: true,
          temperature: opts.temperature ?? opts.model.temperature_default,
          max_tokens: opts.maxTokens ?? opts.model.max_tokens,
        }),
        signal: opts.signal,
      })
      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => '')
        lastError = `HTTP ${res.status} dari ${key.base_url}: ${text.slice(0, 300)}`
        continue
      }
      return { ok: true, reader: res.body.getReader(), keyUsed: key }
    } catch (e) {
      if ((e as Error).name === 'AbortError') return { ok: false, error: 'Dibatalkan' }
      lastError = (e as Error).message
    }
  }
  return { ok: false, error: lastError || 'Semua API Key gagal.' }
}

/** Parse one SSE line into delta content / usage. Returns null when not a data chunk. */
export function parseSseChunk(json: string): { content?: string; usage?: { prompt_tokens?: number; completion_tokens?: number } } | null {
  try {
    const data = JSON.parse(json)
    const content = data.choices?.[0]?.delta?.content
    return { content: typeof content === 'string' ? content : undefined, usage: data.usage }
  } catch {
    return null
  }
}

/** Rough token estimate when upstream does not return usage (≈4 chars/token). */
export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4))
}
