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

/** Provider yang memakai OpenAI Responses API (bukan chat/completions). */
const RESPONSES_API_PROVIDERS = new Set(['xingchi', 'xingchiapi', 'responses'])

function isResponsesProvider(provider: string): boolean {
  return RESPONSES_API_PROVIDERS.has(provider.toLowerCase())
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
      const useResponses = isResponsesProvider(key.provider_name) || isResponsesProvider(opts.model.provider)
      const url = `${key.base_url.replace(/\/$/, '')}${useResponses ? '/responses' : '/chat/completions'}`
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      }
      let body: string
      if (useResponses) {
        // Gateway tipe xingchiapi hanya mengizinkan client coding — kirim header Codex CLI
        headers['User-Agent'] = 'codex_cli_rs/0.21.0'
        headers['originator'] = 'codex_cli_rs'
        const systemText = opts.messages
          .filter((m) => m.role === 'system')
          .map((m) => (typeof m.content === 'string' ? m.content : ''))
          .join('\n\n')
        const chat = opts.messages.filter((m) => m.role !== 'system')
        body = JSON.stringify({
          model: opts.model.model_id,
          instructions: systemText || undefined,
          input: chat.map((m) => ({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: [{ type: 'input_text', text: typeof m.content === 'string' ? m.content : JSON.stringify(m.content) }],
          })),
          max_output_tokens: opts.maxTokens ?? opts.model.max_tokens,
          stream: true,
        })
      } else {
        body = JSON.stringify({
          model: opts.model.model_id,
          messages: opts.messages,
          stream: true,
          temperature: opts.temperature ?? opts.model.temperature_default,
          max_tokens: opts.maxTokens ?? opts.model.max_tokens,
        })
      }
      const res = await fetch(url, { method: 'POST', headers, body, signal: opts.signal })
      if (!res.ok || !res.body) {
        const text = await res.text().catch(() => '')
        lastError = `HTTP ${res.status} dari ${url}: ${text.slice(0, 300)}`
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

/** Parse one SSE line into delta content / usage. Supports chat.completions AND Responses API. Returns null when not a data chunk. */
export function parseSseChunk(json: string): { content?: string; usage?: { prompt_tokens?: number; completion_tokens?: number } } | null {
  try {
    const data = JSON.parse(json)
    // format chat.completions
    const content = data.choices?.[0]?.delta?.content
    if (typeof content === 'string') return { content, usage: data.usage }
    // format Responses API: event response.output_text.delta -> { delta: "..." }
    if (data.type === 'response.output_text.delta' && typeof data.delta === 'string') {
      return { content: data.delta }
    }
    // format Responses API: response.completed -> usage
    if (data.type === 'response.completed' && data.response?.usage) {
      const u = data.response.usage
      return { usage: { prompt_tokens: u.input_tokens, completion_tokens: u.output_tokens } }
    }
    return null
  } catch {
    return null
  }
}

/** Rough token estimate when upstream does not return usage (≈4 chars/token). */
export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4))
}
