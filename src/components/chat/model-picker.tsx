'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Zap, Eye, Brain, Check, Sparkles } from 'lucide-react'
import { useChatStore } from '@/store/chat'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { AiModel } from '@/types'

export function ModelPicker({ disabled }: { disabled?: boolean }) {
  const { models, selectedModel, setSelectedModel } = useChatStore()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const close = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const current = models.find((m) => m.model_id === selectedModel) ?? models[0]

  return (
    <div ref={ref} className="relative">
      <button
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2 text-sm font-medium hover:bg-accent transition-colors disabled:opacity-50"
      >
        <Sparkles className="h-4 w-4 text-primary" />
        <span>{current?.display_name ?? 'Pilih Model'}</span>
        <ChevronDown className={cn('h-3.5 w-3.5 opacity-50 transition-transform', open && 'rotate-180')} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full mb-2 left-0 z-50 w-80 max-h-96 overflow-y-auto rounded-xl border bg-popover p-1.5 shadow-xl"
          >
            <p className="px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Pilih Model AI</p>
            {models.length === 0 && <p className="px-3 py-4 text-sm text-muted-foreground">Memuat model…</p>}
            {models.map((m: AiModel) => (
              <button
                key={m.id}
                onClick={() => { setSelectedModel(m.model_id); setOpen(false) }}
                className={cn(
                  'w-full flex items-start gap-3 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-accent',
                  m.model_id === current?.model_id && 'bg-primary/10'
                )}
              >
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary text-xs font-bold">
                  {m.display_name.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-sm font-medium">{m.display_name}</span>
                    {m.is_free && <Badge variant="success">Gratis</Badge>}
                    {!m.is_free && <Badge variant="warning">Pro</Badge>}
                    {m.is_vision && <Badge variant="secondary"><Eye className="h-2.5 w-2.5" /> Vision</Badge>}
                    {m.is_reasoning && <Badge variant="secondary"><Brain className="h-2.5 w-2.5" /> Reasoning</Badge>}
                  </div>
                  {m.description && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{m.description}</p>}
                </div>
                {m.model_id === current?.model_id && <Check className="h-4 w-4 text-primary shrink-0 mt-1" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
