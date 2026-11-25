'use client'

import { useEffect, useState } from 'react'
import { Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { toast } from '@/store/toast'
import type { SiteSettings } from '@/types'

const DEFAULTS: SiteSettings = {
  id: 1, site_name: 'AstraChat', site_logo: '', welcome_message: 'Halo! Ada yang bisa saya bantu hari ini?',
  system_prompt_global: 'Kamu asisten AI yang membantu, ramah, dan menjawab dalam bahasa pengguna.',
  maintenance_mode: false, registration_enabled: true, max_free_chat_per_day: 20,
  max_token_per_day: 100000, max_token_per_message: 4000, primary_color: '#a855f7',
  default_dark: true, landing_text: '', footer_text: '', social_links: '',
}

export function SettingsPanel() {
  const [s, setS] = useState<SiteSettings>(DEFAULTS)
  const [saving, setSaving] = useState(false)
  const [temp, setTemp] = useState(0.7)
  const [topP, setTopP] = useState(1)
  const [maxTokens, setMaxTokens] = useState(4096)

  useEffect(() => {
    fetch('/api/owner/settings').then((r) => r.json()).then((d) => {
      if (d.settings) { setS({ ...DEFAULTS, ...d.settings }) }
      if (d.defaults) { setTemp(d.defaults.temperature ?? 0.7); setTopP(d.defaults.top_p ?? 1); setMaxTokens(d.defaults.max_tokens ?? 4096) }
    })
  }, [])

  const save = async () => {
    setSaving(true)
    const r = await fetch('/api/owner/settings', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: s, defaults: { temperature: temp, top_p: topP, max_tokens: maxTokens } }),
    })
    const d = await r.json()
    setSaving(false)
    toast(d.error ? { title: 'Gagal', description: d.error, variant: 'error' } : { title: 'Pengaturan disimpan', variant: 'success' })
  }

  const field = (label: string, node: React.ReactNode) => (
    <div><label className="text-xs text-muted-foreground">{label}</label>{node}</div>
  )

  return (
    <div className="space-y-4">
      <Tabs defaultValue="umum">
        <TabsList>
          <TabsTrigger value="umum">Umum</TabsTrigger>
          <TabsTrigger value="prompt">System Prompt</TabsTrigger>
          <TabsTrigger value="limit">Limit</TabsTrigger>
          <TabsTrigger value="tampilan">Tampilan</TabsTrigger>
        </TabsList>

        <TabsContent value="umum" className="space-y-3 max-w-xl">
          {field('Nama Website', <Input value={s.site_name} onChange={(e) => setS({ ...s, site_name: e.target.value })} />)}
          {field('Welcome Message', <Input value={s.welcome_message} onChange={(e) => setS({ ...s, welcome_message: e.target.value })} />)}
          <label className="flex items-center gap-2 text-sm pt-2">
            <Switch checked={s.registration_enabled} onCheckedChange={(v) => setS({ ...s, registration_enabled: v })} /> Registrasi dibuka
          </label>
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={s.maintenance_mode} onCheckedChange={(v) => setS({ ...s, maintenance_mode: v })} /> Maintenance Mode (non-owner melihat halaman maintenance)
          </label>
        </TabsContent>

        <TabsContent value="prompt" className="space-y-3 max-w-xl">
          {field('System Prompt Global (berlaku semua model)',
            <textarea value={s.system_prompt_global} onChange={(e) => setS({ ...s, system_prompt_global: e.target.value })} rows={6}
              className="flex w-full rounded-lg border border-input bg-transparent px-3 py-2 text-sm" />)}
          <div className="pt-2">
            <label className="text-xs text-muted-foreground">Temperature: {temp.toFixed(1)}</label>
            <Slider value={[temp]} min={0} max={2} step={0.1} onValueChange={(v) => setTemp(v[0])} className="mt-2" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground">Top P: {topP.toFixed(2)}</label>
            <Slider value={[topP]} min={0} max={1} step={0.05} onValueChange={(v) => setTopP(v[0])} className="mt-2" />
          </div>
          {field('Max Tokens per respons', <Input type="number" value={maxTokens} onChange={(e) => setMaxTokens(Number(e.target.value))} />)}
          <p className="text-xs text-muted-foreground">System prompt per-model bisa diatur di tab "Manajemen Model" → Edit Model.</p>
        </TabsContent>

        <TabsContent value="limit" className="space-y-3 max-w-xl">
          {field('Max chat per hari (user Gratis)', <Input type="number" value={s.max_free_chat_per_day} onChange={(e) => setS({ ...s, max_free_chat_per_day: Number(e.target.value) })} />)}
          {field('Max token per hari', <Input type="number" value={s.max_token_per_day} onChange={(e) => setS({ ...s, max_token_per_day: Number(e.target.value) })} />)}
          {field('Max token per pesan', <Input type="number" value={s.max_token_per_message} onChange={(e) => setS({ ...s, max_token_per_message: Number(e.target.value) })} />)}
        </TabsContent>

        <TabsContent value="tampilan" className="space-y-3 max-w-xl">
          {field('Warna utama', <Input type="color" value={s.primary_color} onChange={(e) => setS({ ...s, primary_color: e.target.value })} className="h-10 w-20 p-1" />)}
          {field('URL Logo', <Input value={s.site_logo ?? ''} onChange={(e) => setS({ ...s, site_logo: e.target.value })} placeholder="https://…" />)}
          {field('Teks Landing Page', <Input value={s.landing_text ?? ''} onChange={(e) => setS({ ...s, landing_text: e.target.value })} />)}
          {field('Teks Footer', <Input value={s.footer_text ?? ''} onChange={(e) => setS({ ...s, footer_text: e.target.value })} />)}
          {field('Link sosial media (JSON)', <Input value={s.social_links ?? ''} onChange={(e) => setS({ ...s, social_links: e.target.value })} placeholder='{"instagram":"…","youtube":"…"}' />)}
          <label className="flex items-center gap-2 text-sm">
            <Switch checked={s.default_dark} onCheckedChange={(v) => setS({ ...s, default_dark: v })} /> Mode gelap default
          </label>
        </TabsContent>
      </Tabs>

      <Button onClick={save} disabled={saving}><Save className="h-4 w-4" /> {saving ? 'Menyimpan…' : 'Simpan Semua Pengaturan'}</Button>
    </div>
  )
}
