'use client'

import { useEffect, useState } from 'react'
import { Plus, Pencil, Trash2, ArrowUp, ArrowDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from '@/store/toast'
import type { AiModel } from '@/types'

type ModelForm = {
  model_id: string; display_name: string; provider: string; description: string
  is_free: boolean; is_vision: boolean; is_reasoning: boolean
  min_plan: 'free' | 'pro' | 'unlimited' | 'owner'
  price_input_per_1m: number; price_output_per_1m: number
  max_tokens: number; temperature_default: number; system_prompt: string
}
const empty: ModelForm = { model_id: '', display_name: '', provider: 'clouvia', description: '', is_free: false, is_vision: false, is_reasoning: false, min_plan: 'free', price_input_per_1m: 0, price_output_per_1m: 0, max_tokens: 4096, temperature_default: 0.7, system_prompt: '' }

export function ModelsManager() {
  const [models, setModels] = useState<AiModel[]>([])
  const [dialog, setDialog] = useState<null | { mode: 'add' } | { mode: 'edit'; model: AiModel }>(null)
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)

  const load = () => fetch('/api/owner/models').then((r) => r.json()).then((d) => setModels(d.models ?? []))
  useEffect(() => { load() }, [])

  const openAdd = () => { setForm(empty); setDialog({ mode: 'add' }) }
  const openEdit = (m: AiModel) => {
    setForm({ ...empty, ...m, description: m.description ?? '', system_prompt: m.system_prompt ?? '' })
    setDialog({ mode: 'edit', model: m })
  }

  const save = async () => {
    if (!form.model_id || !form.display_name) { toast({ title: 'model_id & display_name wajib', variant: 'error' }); return }
    setSaving(true)
    const isEdit = dialog?.mode === 'edit'
    const url = isEdit ? `/api/owner/models/${(dialog as { model: AiModel }).model.id}` : '/api/owner/models'
    const r = await fetch(url, { method: isEdit ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const d = await r.json()
    setSaving(false)
    if (d.error) { toast({ title: 'Gagal', description: d.error, variant: 'error' }); return }
    toast({ title: isEdit ? 'Model diperbarui' : 'Model ditambahkan', variant: 'success' })
    setDialog(null); load()
  }

  const toggle = async (m: AiModel, is_active: boolean) => {
    await fetch(`/api/owner/models/${m.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ is_active }) })
    load()
  }

  const remove = async (m: AiModel) => {
    await fetch(`/api/owner/models/${m.id}`, { method: 'DELETE' })
    toast({ title: 'Model dihapus', variant: 'info' }); load()
  }

  const reorder = async (m: AiModel, dir: -1 | 1) => {
    await fetch(`/api/owner/models/${m.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sort_order: m.sort_order + dir }) })
    load()
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end"><Button onClick={openAdd}><Plus className="h-4 w-4" /> Tambah Model</Button></div>

      <div className="rounded-2xl border bg-card overflow-x-auto">
        <table className="w-full text-sm min-w-[720px]">
          <thead>
            <tr className="text-left text-xs text-muted-foreground border-b">
              <th className="px-4 py-2">Urut</th><th className="px-4 py-2">Model</th><th className="px-4 py-2">Badge</th>
              <th className="px-4 py-2">Harga in/out /1M</th><th className="px-4 py-2">Min. Paket</th><th className="px-4 py-2">Aktif</th><th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {models.map((m) => (
              <tr key={m.id} className="border-b last:border-0">
                <td className="px-4 py-2.5">
                  <div className="flex gap-0.5">
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => reorder(m, -1)}><ArrowUp className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => reorder(m, 1)}><ArrowDown className="h-3 w-3" /></Button>
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <p className="font-medium">{m.display_name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{m.model_id} · {m.provider}</p>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex gap-1 flex-wrap">
                    {m.is_free && <Badge variant="success">Gratis</Badge>}
                    {!m.is_free && <Badge variant="warning">Pro</Badge>}
                    {m.is_vision && <Badge variant="secondary">Vision</Badge>}
                    {m.is_reasoning && <Badge variant="secondary">Reasoning</Badge>}
                  </div>
                </td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground">${m.price_input_per_1m} / ${m.price_output_per_1m}</td>
                <td className="px-4 py-2.5"><Badge variant="outline" className="capitalize">{m.min_plan}</Badge></td>
                <td className="px-4 py-2.5"><Switch checked={m.is_active} onCheckedChange={(v) => toggle(m, v)} /></td>
                <td className="px-4 py-2.5">
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(m)}><Pencil className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => remove(m)}><Trash2 className="h-3.5 w-3.5" /></Button>
                  </div>
                </td>
              </tr>
            ))}
            {models.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">Belum ada model. Klik "Tambah Model".</td></tr>}
          </tbody>
        </table>
      </div>

      <Dialog open={!!dialog} onOpenChange={(v) => !v && setDialog(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>{dialog?.mode === 'edit' ? 'Edit Model' : 'Tambah Model Baru'}</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs text-muted-foreground">model_id</label><Input value={form.model_id} onChange={(e) => setForm({ ...form, model_id: e.target.value })} placeholder="gpt-5.6" /></div>
            <div><label className="text-xs text-muted-foreground">Nama tampil</label><Input value={form.display_name} onChange={(e) => setForm({ ...form, display_name: e.target.value })} placeholder="GPT-5.6" /></div>
            <div><label className="text-xs text-muted-foreground">Provider</label><Input value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} /></div>
            <div><label className="text-xs text-muted-foreground">Min. paket</label>
              <select value={form.min_plan} onChange={(e) => setForm({ ...form, min_plan: e.target.value as typeof form.min_plan })} className="flex h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm">
                <option value="free">free</option><option value="pro">pro</option><option value="unlimited">unlimited</option><option value="owner">owner</option>
              </select>
            </div>
            <div><label className="text-xs text-muted-foreground">Harga input /1M ($)</label><Input type="number" step="0.01" value={form.price_input_per_1m} onChange={(e) => setForm({ ...form, price_input_per_1m: Number(e.target.value) })} /></div>
            <div><label className="text-xs text-muted-foreground">Harga output /1M ($)</label><Input type="number" step="0.01" value={form.price_output_per_1m} onChange={(e) => setForm({ ...form, price_output_per_1m: Number(e.target.value) })} /></div>
            <div><label className="text-xs text-muted-foreground">Max tokens</label><Input type="number" value={form.max_tokens} onChange={(e) => setForm({ ...form, max_tokens: Number(e.target.value) })} /></div>
            <div><label className="text-xs text-muted-foreground">Temperature default</label><Input type="number" step="0.1" min="0" max="2" value={form.temperature_default} onChange={(e) => setForm({ ...form, temperature_default: Number(e.target.value) })} /></div>
            <div className="col-span-2"><label className="text-xs text-muted-foreground">Deskripsi</label><Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="col-span-2"><label className="text-xs text-muted-foreground">System prompt khusus model (opsional, menimpa global)</label>
              <textarea value={form.system_prompt} onChange={(e) => setForm({ ...form, system_prompt: e.target.value })} rows={3} className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm" />
            </div>
            <label className="flex items-center gap-2 text-sm"><Switch checked={form.is_free} onCheckedChange={(v) => setForm({ ...form, is_free: v })} /> Gratis</label>
            <label className="flex items-center gap-2 text-sm"><Switch checked={form.is_vision} onCheckedChange={(v) => setForm({ ...form, is_vision: v })} /> Vision</label>
            <label className="flex items-center gap-2 text-sm"><Switch checked={form.is_reasoning} onCheckedChange={(v) => setForm({ ...form, is_reasoning: v })} /> Reasoning</label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog(null)}>Batal</Button>
            <Button onClick={save} disabled={saving}>{saving ? 'Menyimpan…' : 'Simpan'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
