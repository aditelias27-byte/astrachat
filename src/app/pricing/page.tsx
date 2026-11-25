'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, Check, Sparkles, Zap, Crown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { toast } from '@/store/toast'
import { cn } from '@/lib/utils'

const plans = [
  {
    name: 'Gratis', icon: <Sparkles className="h-5 w-5" />, price: 'Rp0', period: '/bulan',
    desc: 'Untuk mencoba semua model dasar',
    features: ['20 chat per hari', 'Model Gratis (DeepSeek, Kimi)', 'Riwayat chat tersimpan', 'Export Markdown/TXT'],
    cta: 'Paket saat ini', highlight: false,
  },
  {
    name: 'Pro', icon: <Zap className="h-5 w-5" />, price: 'Rp49rb', period: '/bulan',
    desc: 'Untuk pengguna aktif & profesional',
    features: ['Chat tanpa batas wajar (500/hari)', 'Semua model termasuk Claude Opus', 'Upload gambar (Vision)', 'Prioritas streaming lebih cepat'],
    cta: 'Upgrade ke Pro', highlight: true,
  },
  {
    name: 'Unlimited', icon: <Crown className="h-5 w-5" />, price: 'Rp149rb', period: '/bulan',
    desc: 'Tanpa batas, untuk power user',
    features: ['Chat tanpa batas penuh', 'Semua model + akses awal model baru', 'Token per pesan paling besar', 'Support prioritas'],
    cta: 'Upgrade ke Unlimited', highlight: false,
  },
]

export default function PricingPage() {
  const [role, setRole] = useState('guest')

  useEffect(() => {
    fetch('/api/auth/me').then((r) => r.json()).then((d) => setRole(d.profile?.role ?? 'guest')).catch(() => {})
  }, [])

  return (
    <div className="min-h-dvh bg-background">
      <header className="border-b px-4 py-3 flex items-center gap-3">
        <a href="/chat"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></a>
        <h1 className="font-bold">Harga & Paket</h1>
      </header>
      <div className="max-w-5xl mx-auto p-6">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-2">Pilih paket yang pas untuk kamu</h2>
          <p className="text-muted-foreground text-sm">Semua paket memakai gateway AI yang sama — beda limit & akses model.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {plans.map((p, i) => (
            <motion.div
              key={p.name}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
              className={cn('rounded-2xl border bg-card p-6 flex flex-col', p.highlight && 'border-primary shadow-lg shadow-primary/10 ring-1 ring-primary')}
            >
              {p.highlight && <Badge className="w-fit mb-3">Paling populer</Badge>}
              <div className="flex items-center gap-2 text-primary mb-2">{p.icon}<span className="font-bold text-lg">{p.name}</span></div>
              <p className="text-xs text-muted-foreground mb-4">{p.desc}</p>
              <p className="text-3xl font-bold">{p.price}<span className="text-sm font-normal text-muted-foreground">{p.period}</span></p>
              <ul className="space-y-2 my-5 flex-1">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" /> {f}
                  </li>
                ))}
              </ul>
              <Button
                variant={p.highlight ? 'default' : 'outline'}
                disabled={role === 'guest'}
                onClick={() => toast({ title: 'Hubungi Owner', description: 'Pembayaran dikonfigurasi lewat Panel Owner > Settings (payment link).', variant: 'info' })}
              >
                {role === 'guest' ? 'Login dulu untuk upgrade' : p.cta}
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
