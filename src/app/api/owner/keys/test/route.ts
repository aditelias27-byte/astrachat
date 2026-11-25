import { NextRequest } from 'next/server'
import { requireOwner } from '@/lib/ai/owner-guard'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { decrypt } from '@/lib/ai/crypto'

export async function POST(req: NextRequest) {
  const guard = await requireOwner()
  if (!guard.ok) return Response.json({ error: 'forbidden' }, { status: 403 })
  const { keyId } = await req.json()
  const admin = getSupabaseAdmin()
  if (!admin) return Response.json({ ok: false, message: 'Supabase belum dikonfigurasi' })
  const { data: key } = await admin.from('api_keys_config').select('*').eq('id', keyId).maybeSingle()
  if (!key) return Response.json({ ok: false, message: 'API Key tidak ditemukan' })
  const apiKey = decrypt(key.api_key_encrypted)
  if (!apiKey) return Response.json({ ok: false, message: 'Gagal dekripsi — cek ENCRYPTION_KEY di .env' })
  try {
    const res = await fetch(`${key.base_url.replace(/\/$/, '')}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(15000),
    })
    if (res.ok) {
      const json = await res.json().catch(() => null)
      const count = Array.isArray(json?.data) ? json.data.length : 0
      return Response.json({ ok: true, message: `Koneksi berhasil${count ? ` — ${count} model tersedia` : ''}` })
    }
    return Response.json({ ok: false, message: `HTTP ${res.status}: ${(await res.text()).slice(0, 200)}` })
  } catch (e) {
    return Response.json({ ok: false, message: (e as Error).message })
  }
}
