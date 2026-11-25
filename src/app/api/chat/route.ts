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
  const model = models.find((m) => m.model_id === body.modelId)
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

  const keys = await getApiKeys()
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
