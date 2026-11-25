'use client'

import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Copy, Check, RefreshCw, ThumbsUp, ThumbsDown, Pencil, User, Sparkles } from 'lucide-react'
import { Markdown } from './markdown'
import { useChatStore } from '@/store/chat'
import { cn } from '@/lib/utils'
import type { ChatMessage } from '@/types'

interface Props {
  onRegenerate: () => void
  onEdit: (id: string, content: string) => void
}

function Bubble({ m, isLast, onRegenerate, onEdit }: { m: ChatMessage; isLast: boolean } & Props) {
  const [copied, setCopied] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(m.content)
  const { models } = useChatStore()
  const modelName = models.find((x) => x.model_id === m.model_used)?.display_name ?? m.model_used

  const copy = () => {
    navigator.clipboard.writeText(m.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  if (m.role === 'user') {
    return (
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex justify-end group">
        <div className="max-w-[85%] md:max-w-[70%] space-y-1.5">
          {m.attachments?.some((a) => a.dataUrl) && (
            <div className="flex flex-wrap gap-2 justify-end">
              {m.attachments.filter((a) => a.dataUrl).map((a, i) => (
                <img key={i} src={a.dataUrl} alt={a.name} className="max-h-44 rounded-xl border" />
              ))}
            </div>
          )}
          {editing ? (
            <div className="rounded-2xl border bg-card p-2 space-y-2">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full bg-transparent text-sm outline-none resize-none min-h-[60px]"
                autoFocus
              />
              <div className="flex justify-end gap-2 text-xs">
                <button onClick={() => setEditing(false)} className="px-2 py-1 rounded hover:bg-accent">Batal</button>
                <button
                  onClick={() => { setEditing(false); onEdit(m.id, editText) }}
                  className="px-2 py-1 rounded bg-primary text-primary-foreground"
                >
                  Kirim ulang
                </button>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl rounded-br-md bg-primary text-primary-foreground px-4 py-2.5 text-[15px] leading-7 whitespace-pre-wrap">
              {m.content}
            </div>
          )}
          {!editing && (
            <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={copy} title="Salin" className="p-1 rounded hover:bg-accent text-muted-foreground">
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
              </button>
              <button onClick={() => setEditing(true)} title="Edit & kirim ulang" className="p-1 rounded hover:bg-accent text-muted-foreground">
                <Pencil className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3 group">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 text-primary">
        <Sparkles className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        {modelName && <p className="text-xs font-medium text-muted-foreground mb-1">{modelName}</p>}
        {m.content ? (
          <Markdown content={m.content} />
        ) : m.pending ? (
          <div className="flex items-center gap-1.5 py-2">
            <span className="typing-dot h-2 w-2 rounded-full bg-primary inline-block" />
            <span className="typing-dot h-2 w-2 rounded-full bg-primary inline-block" />
            <span className="typing-dot h-2 w-2 rounded-full bg-primary inline-block" />
          </div>
        ) : null}
        {m.error && <p className="text-sm text-destructive mt-1">{m.content}</p>}
        {!m.pending && m.content && (
          <div className="flex gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={copy} title="Salin" className="p-1.5 rounded hover:bg-accent text-muted-foreground">
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </button>
            {isLast && (
              <button onClick={onRegenerate} title="Regenerate" className="p-1.5 rounded hover:bg-accent text-muted-foreground">
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            )}
            <button title="Bagus" className="p-1.5 rounded hover:bg-accent text-muted-foreground">
              <ThumbsUp className="h-3.5 w-3.5" />
            </button>
            <button title="Kurang bagus" className="p-1.5 rounded hover:bg-accent text-muted-foreground">
              <ThumbsDown className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </motion.div>
  )
}

export function MessageList({ onRegenerate, onEdit, emptyState }: Props & { emptyState: React.ReactNode }) {
  const { messages } = useChatStore()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (messages.length === 0) return <>{emptyState}</>

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">
      {messages.map((m, i) => (
        <Bubble key={m.id} m={m} isLast={i === messages.length - 1 && m.role === 'assistant'} onRegenerate={onRegenerate} onEdit={onEdit} />
      ))}
      <div ref={bottomRef} />
    </div>
  )
}
