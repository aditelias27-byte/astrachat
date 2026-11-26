'use client'

import { useEffect, useState } from 'react'
import { Plus, Trash2, Eye, EyeOff, PlugZap, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/store/toast'
import type { ApiKeyConfig } from '@/types'

const PROVIDERS = ['clouvia', 'openai', 'anthropic', 'google', 'openrouter', 'xingchi', 'custom']

export function KeysManager() {
  const [keys, setKeys] = useState<ApiKeyConfig[]>([])
  const [show, setShow] = useState<Record<string, boolean>>({})
  const [testing, setTesting] = useState<string | null>(null)
  const [form, setForm] = useState({ provider_name: 'clouvia', base_url: 'https://router.clouvia.id/v1', api_key: '', model_id: '', is_fallback: false })
  const [saving, setSaving] = useState(false)

  const load = () => fetch('/api/owner/keys').then((r) => r.json()).then((d) => setKeys(d.keys ?? []))
  useEffect(() => { load() }, [])

  const add = async () => {
    if (!form.api_key) { toast({ title: 'API Key wajib diisi', variant: 'error' }); return }
    setSaving(true)
    const r = await fetch('/api/owner/keys', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const d = await r.json()
    setSaving(false)
    if (d.error) { toast({ title: 'Gagal', description: d.error, variant: 'error' }); return }
    toast({ title: 'API Key ditambahkan', description: 'Key dienkripsi AES-256-GCM sebelum disimpan.', variant: 'success' })
    setForm({ provider_name: 'clouvia', base_url: 'https://router.clouvia.id/v1', api_key: '', model_id: '', is_fallback: false })
    load()
  }

  const patch = async (id: string, body: Record<string, unknown>) => {
    await fetch('/api/owner/keys', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...body }) })
    load()
  }

  const remove = async (id: string) => {
    await fetch(`/api/owner/keys?id=${id}`, { method: 'DELETE' })
    toast({ title: 'API Key dihapus', variant: 'info' })
    load()
  }

  const test = async (id: string) => {
    setTesting(id)
    const r = await fetch('/api/owner/keys/test', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ keyId: id }) })
    const d = await r.json()
    setTesting(null)
    toast({ title: d.ok ? 'Koneksi berhasil' : 'Koneksi gagal', description: d.message, variant: d.ok ? 'success' : 'error' })
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border bg-card p-4 space-y-3">
        <p className="text-sm font-medium flex items-center gap-2"><Plus className="h-4 w-4 text-primary" /> Tambah API Key / Gateway</p>
        <p className="text-xs text-muted-foreground">Kosongkan "Khusus Model" agar key dipakai untuk semua model provider tsb. Centang "Fallback" agar dipakai sebagai cadangan.</p>
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground">Provider</label>
            <select
              value={form.provider_name}
              onChange={(e) => setForm({
                ...form,
                provider_name: e.target.value,
                base_url: e.target.value === 'xingchi' ? 'https://api.xingchiapi.com/v1' : form.base_url,
              })}
              className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm"
            >
              {PROVIDERS.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Base URL</label>
            <Input value={form.base_url} onChange={(e) => setForm({ ...form, base_url: e.target.value })} placeholder="https://router.clouvia.id/v1" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">API Key</label>
            <Input type="password" value={form.api_key} onChange={(e) => setForm({ ...form, api_key: e.target.value })} placeholder="sk-..." />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Khusus Model (opsional)</label>
            <Input value={form.model_id} onChange={(e) => setForm({ ...form, model_id: e.target.value })} placeholder="kosong = semua model provider ini" />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Switch checked={form.is_fallback} onCheckedChange={(v) => setForm({ ...form, is_fallback: v })} /> Jadikan key cadangan (fallback)
        </label>
        <Button onClick={add} disabled={saving}>{saving ? 'Menyimpan…' : 'Simpan API Key'}</Button>
      </div>

      <div className="space-y-3">
        {keys.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">Belum ada API Key. Tambahkan di atas agar chat bisa jalan.</p>}
        {keys.map((k) => (
          <div key={k.id} className="rounded-2xl border bg-card p-4 flex flex-wrap items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium capitalize">{k.provider_name}</span>
                {k.is_fallback && <Badge variant="warning">Fallback</Badge>}
                {k.model_id && <Badge variant="secondary">{k.model_id}</Badge>}
                <Badge variant={k.is_active ? 'success' : 'destructive'}>{k.is_active ? 'Aktif' : 'Nonaktif'}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1 truncate">{k.base_url}</p>
              <p className="text-xs font-mono mt-0.5 text-muted-foreground">
                {show[k.id] ? k.api_key_masked : '••••••••••••••••••••'}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <Button variant="ghost" size="icon" title="Show/Hide" onClick={() => setShow({ ...show, [k.id]: !show[k.id] })}>
                {show[k.id] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="sm" onClick={() => test(k.id)} disabled={testing === k.id}>
                <PlugZap className="h-3.5 w-3.5" /> {testing === k.id ? 'Menguji…' : 'Test'}
              </Button>
              <div className="flex items-center gap-1 text-xs text-muted-foreground mx-1">Aktif
                <Switch checked={k.is_active} onCheckedChange={(v) => patch(k.id, { is_active: v })} />
              </div>
              <Button variant="ghost" size="icon" className="text-destructive" onClick={() => remove(k.id)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
