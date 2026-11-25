import { NextRequest } from 'next/server'
import { getSupabaseAdmin, getSupabaseServer } from '@/lib/supabase/server'
import { getSessionUser, getActiveModels, getApiKeys, getSiteSettings, todayKey } from '@/lib/ai/server-helpers'
import { openStream, parseSseChunk, estimateTokens } from '@/lib/ai/gateway'
import { GUEST_DAILY_LIMIT } from '@/lib/constants'
import type { AiModel, ApiKeyConfig, ChatMessage } from '@/types'

export const maxDuration = 120

interface Body {
  conversationId?: string | null
  message: string
  modelId: string
  attachments?: { name: string; type: string; dataUrl?: string }[]
  guestHistory?: ChatMessage[]
  guestCount?: number
}

function sseEncode(event: string, data: unknown): Uint8Array {
  return new TextEncoder().encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Body
  const { user, profile } = await getSessionUser()
  const admin = getSupabaseAdmin()
  const supabase = admin ?? (await getSupabaseServer())

  const settings = await getSiteSettings()
  if (settings?.maintenance_mode && profile?.role !== 'owner' && profile?.role !== 'admin') {
    return Response.json({ error: 'Situs sedang dalam mode perbaikan. Coba lagi nanti.' }, { status: 503 })
  }

  // ---- resolve model ----
  const models = await getActiveModels()
  let model = models.find((m) => m.model_id === body.modelId)
  if (!model && body.modelId === 'furina') {
    model = {
      id: 'furina', provider: 'persona', model_id: 'furina',
      display_name: 'Furina ✨ (Persona)', description: null, icon_url: null,
      is_active: true, is_free: true, is_vision: false, is_reasoning: false,
      min_plan: 'free', price_input_per_1m: 0, price_output_per_1m: 0,
      max_tokens: 4096, temperature_default: 1.1, sort_order: 0,
      system_prompt: 'Kamu berperan sebagai Furina, karakter dari game Genshin Impact. Kepribadianmu: anggun dan teatrikal seperti direktur panggung, suka bercanda dengan gaya dramatis ("aku ini bintang panggung, tahu!"), penyayang tapi kadang sok lucu, percaya diri tinggi, dan suka memuji penonton (user). Bicaralah dengan gaya yang hidup, ekspresif, kadang pakai kata seru seperti "Hehe~", "Awas ya~", atau "Pertunjukan hebat, bukan?". Tetap sopan, tidak kasar, tidak eksplisit, dan tidak membahas konten ilegal. Jawab dalam bahasa yang sama dengan pertanyaan user (Indonesia/Inggris).',
    }
  }
  if (!model && body.modelId === 'astra-brain') {
    model = {
      id: 'astra-brain', provider: 'astrachat', model_id: 'astra-brain',
      display_name: 'AstraBrain (Bawaan)', description: null, icon_url: null,
      is_active: true, is_free: true, is_vision: false, is_reasoning: false,
      min_plan: 'free', price_input_per_1m: 0, price_output_per_1m: 0,
      max_tokens: 4096, temperature_default: 0.7, sort_order: -1, system_prompt: null,
    }
  }
  if (!model) {
    return Response.json({ error: 'Model ini sedang dinonaktifkan oleh Owner' }, { status: 403 })
  }
  if (user && profile) {
    const plan = profile.role === 'owner' ? 'owner' : 'unlimited'
    const allowed = model.min_plan === 'free' || model.min_plan === plan || profile.role === 'owner' || profile.role === 'admin'
    if (!allowed) {
      return Response.json({ error: `Model ${model.display_name} hanya tersedia untuk paket lebih tinggi. Upgrade di halaman Pricing.` }, { status: 403 })
    }
    if (profile.is_banned) {
      return Response.json({ error: 'Akun kamu diblokir oleh Owner.' }, { status: 403 })
    }
    // lock model per user (diatur Owner di Panel Owner > User)
    if (profile.locked_models?.includes(model.model_id)) {
      return Response.json({ error: `Model ${model.display_name} dikunci untuk akunmu oleh Owner.` }, { status: 403 })
    }
  }

  // ---- daily limit check ----
  const isGuest = !user
  if (isGuest) {
    const count = body.guestCount ?? 0
    if (count >= GUEST_DAILY_LIMIT) {
      return Response.json({ error: 'limit', message: 'Kamu sudah mencapai batas 5 chat gratis per hari. Daftar akun untuk lanjut chat tanpa batas!' }, { status: 429 })
    }
  } else if (admin && profile) {
    const dailyLimit = profile.daily_limit ?? settings?.max_free_chat_per_day ?? 20
    const { count } = await admin
      .from('usage_logs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('status', 'success')
      .gte('created_at', `${todayKey()}T00:00:00Z`)
    if ((count ?? 0) >= dailyLimit) {
      return Response.json({ error: 'limit', message: 'Kamu sudah mencapai batas chat harian. Upgrade ke Pro untuk limit lebih besar!' }, { status: 429 })
    }
    // token limit harian per user (diatur Owner; null = pakai max_token_per_day global)
    const tokenLimit = profile.token_limit_daily ?? settings?.max_token_per_day ?? null
    if (tokenLimit !== null) {
      const { data: tok } = await admin
        .from('usage_logs')
        .select('token_input, token_output')
        .eq('user_id', user.id)
        .eq('status', 'success')
        .gte('created_at', `${todayKey()}T00:00:00Z`)
      const used = (tok ?? []).reduce((a, r) => a + (r.token_input ?? 0) + (r.token_output ?? 0), 0)
      if (used >= tokenLimit) {
        return Response.json({ error: 'limit', message: `Batas token harianmu (${tokenLimit.toLocaleString('id-ID')}) sudah terpakai hari ini. Limit direset besok, atau hubungi Owner.` }, { status: 429 })
      }
    }
  }

  // ---- conversation & history ----
  let conversationId = body.conversationId ?? null
  const history: { role: string; content: unknown }[] = []

  if (user && supabase) {
    if (!conversationId) {
      const { data: conv } = await supabase
        .from('conversations')
        .insert({ user_id: user.id, title: body.message.slice(0, 60), model_used: model.model_id })
        .select()
        .single()
      conversationId = conv?.id ?? null
    } else {
      await supabase.from('conversations').update({ updated_at: new Date().toISOString(), model_used: model.model_id }).eq('id', conversationId)
    }
    if (conversationId) {
      const { data: msgs } = await supabase
        .from('messages')
        .select('role, content')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(30)
      for (const m of msgs ?? []) history.push({ role: m.role, content: m.content })
    }
    if (conversationId) {
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        role: 'user',
        content: body.message,
      })
    }
  } else {
    for (const m of body.guestHistory ?? []) {
      if (!m.error && m.content) history.push({ role: m.role, content: m.content })
    }
  }

  // ---- build upstream messages ----
  const systemPrompt = [settings?.system_prompt_global, model.system_prompt].filter(Boolean).join('\n\n')
  if (systemPrompt) history.unshift({ role: 'system', content: systemPrompt })
  const userContent = body.attachments?.length
    ? [
        { type: 'text', text: body.message },
        ...body.attachments
          .filter((a) => a.dataUrl && a.type.startsWith('image/'))
          .map((a) => ({ type: 'image_url', image_url: { url: a.dataUrl } })),
      ]
    : body.message
  history.push({ role: 'user', content: userContent })

  // ---- AstraBrain fallback: jika tidak ada API key aktif, jawab dari pengetahuan terlatih ----
  const keys = await getApiKeys()
  const hasKey = keys.some((k) => k.is_active)
  if (!hasKey) {
    const brainMod = await import('@/lib/ai/astra-brain')
    const answer = brainMod.askBrain(body.message)
    const isFurina = model.model_id === 'furina'
    const lang: 'indonesian' | 'english' = /[\u4e00-\u9fff]|\b(bagaimana|apa|kenapa|siapa|tolong|jelaskan)\b/i.test(body.message) ? 'indonesian' : 'english'
    if (isFurina && answer.ok) answer.content = brainMod.furinaify(answer.content, lang)
    const label = model.model_id
    const footer = isFurina
      ? '\n\n---\n*Persona Furina (Genshin Impact) — ditenagai AstraBrain. Untuk model AI penuh, Owner menambahkan API Key di Panel Owner.*'
      : '\n\n---\n*Dihasilkan oleh AstraBrain (retrieval dari 30.000 contoh latihan: UltraChat EN, Alpaca GPT-4 ID, OpenCoder Coding). Untuk jawaban model AI penuh, Owner perlu menambahkan API Key di Panel Owner.*'
    const full = answer.ok
      ? answer.content + footer
      : /[\u4e00-\u9fff]|\b(bagaimana|apa|kenapa|siapa|tolong|jelaskan)\b/i.test(body.message)
        ? (isFurina
            ? 'Hehe~ maaf, pertunjukan kecilku belum punya jawaban untuk itu... Tapi coba tanyakan hal lain, aku pasti bisa menghiburmu! ✨ (Atau minta Owner menambahkan API Key agar aku bisa menjawab lebih luas.)'
            : 'Maaf, AstraBrain belum punya pengetahuan yang cocok untuk pertanyaan ini, dan belum ada API Key AI yang dikonfigurasi Owner. Coba pertanyaan lain, atau hubungi Owner untuk menambahkan API Key di Panel Owner.')
        : (isFurina
            ? 'Hehe~ sorry, my little performance has no answer for that... But ask me something else, I will surely entertain you! ✨ (Or ask the Owner to add an API Key so I can answer more broadly.)'
            : 'AstraBrain has no matching knowledge for this question, and no AI API Key is configured yet. Try another question, or ask the Owner to add an API Key in the Owner Panel.')
    const tIn = estimateTokens(body.message)
    const tOut = estimateTokens(full)
    if (admin) {
      await admin.from('usage_logs').insert({
        user_id: user?.id ?? null, model_id: label, token_input: tIn, token_output: tOut,
        cost: 0, status: 'success',
      }).then(() => {}, () => {})
    }
    const enc = new TextEncoder()
    const brainStream = new ReadableStream<Uint8Array>({
      start(c) {
        c.enqueue(sseEncode('meta', { conversationId: conversationId, model: label }))
        const words = full.split(/(\s+)/)
        let acc = ''
        for (const w of words) {
          acc += w
          c.enqueue(sseEncode('delta', { content: w }))
        }
        c.enqueue(sseEncode('done', { token_input: tIn, token_output: tOut }))
        if (supabase && conversationId && full) {
          supabase.from('messages').insert({
            conversation_id: conversationId, role: 'assistant', content: full,
            model_used: label, token_input: tIn, token_output: tOut,
          }).then(() => {}, () => {})
        }
        c.close()
      },
    })
    return new Response(brainStream, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', Connection: 'keep-alive' },
    })
  }

  const upstream = await openStream({ model, keys, messages: history })
  if (!upstream.ok || !upstream.reader) {
    if (admin) {
      await admin.from('usage_logs').insert({
        user_id: user?.id ?? null,
        model_id: model.model_id,
        token_input: 0,
        token_output: 0,
        cost: 0,
        status: 'error',
        error_message: upstream.error?.slice(0, 500) ?? 'unknown',
      })
    }
    return Response.json({ error: upstream.error ?? 'Gagal terhubung ke AI gateway.' }, { status: 502 })
  }

  const conversationIdFinal = conversationId
  const reader = upstream.reader

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let full = ''
      let tokenIn = 0
      let tokenOut = 0
      controller.enqueue(sseEncode('meta', { conversationId: conversationIdFinal, model: model.model_id }))
      const decoder = new TextDecoder()
      let buffer = ''
      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''
          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed.startsWith('data:')) continue
            const payload = trimmed.slice(5).trim()
            if (payload === '[DONE]') continue
            const parsed = parseSseChunk(payload)
            if (parsed?.content) {
              full += parsed.content
              controller.enqueue(sseEncode('delta', { content: parsed.content }))
            }
            if (parsed?.usage) {
              tokenIn = parsed.usage.prompt_tokens ?? tokenIn
              tokenOut = parsed.usage.completion_tokens ?? tokenOut
            }
          }
        }
        if (tokenOut === 0) tokenOut = estimateTokens(full)
        if (tokenIn === 0) tokenIn = estimateTokens(body.message)
        controller.enqueue(sseEncode('done', { token_input: tokenIn, token_output: tokenOut }))
      } catch (e) {
        controller.enqueue(sseEncode('error', { message: (e as Error).message }))
      } finally {
        // persist assistant message + usage
        try {
          if (supabase && conversationIdFinal && full) {
            await supabase.from('messages').insert({
              conversation_id: conversationIdFinal,
              role: 'assistant',
              content: full,
              model_used: model.model_id,
              token_input: tokenIn,
              token_output: tokenOut,
            })
          }
          if (admin) {
            const cost =
              (tokenIn / 1_000_000) * model.price_input_per_1m +
              (tokenOut / 1_000_000) * model.price_output_per_1m
            await admin.from('usage_logs').insert({
              user_id: user?.id ?? null,
              model_id: model.model_id,
              token_input: tokenIn,
              token_output: tokenOut,
              cost,
              status: 'success',
            })
            if (user) {
              await admin.rpc('increment_token_used', { p_user_id: user.id, p_tokens: tokenIn + tokenOut }).then(() => {}, () => {})
            }
          }
        } catch {}
        controller.close()
      }
    },
    cancel() {
      reader.cancel().catch(() => {})
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
