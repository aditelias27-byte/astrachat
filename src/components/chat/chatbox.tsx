'use client'

import { useRef, useState, useCallback, useEffect } from 'react'
import { Send, Square, Paperclip, Mic, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Props {
  onSend: (text: string, attachments: { name: string; type: string; dataUrl?: string }[]) => void
  onStop: () => void
  streaming: boolean
  disabled?: boolean
  placeholder?: string
}

export function Chatbox({ onSend, onStop, streaming, disabled, placeholder }: Props) {
  const [text, setText] = useState('')
  const [attachments, setAttachments] = useState<{ name: string; type: string; dataUrl?: string }[]>([])
  const [listening, setListening] = useState(false)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const recogRef = useRef<{ stop: () => void } | null>(null)

  const resize = useCallback(() => {
    const ta = taRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = Math.min(ta.scrollHeight, 200) + 'px'
  }, [])

  useEffect(resize, [text, resize])

  const submit = () => {
    if (streaming || disabled) return
    if (!text.trim() && attachments.length === 0) return
    onSend(text.trim(), attachments)
    setText('')
    setAttachments([])
  }

  const pickFiles = (files: FileList | null) => {
    if (!files) return
    for (const f of Array.from(files).slice(0, 3)) {
      const ok = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'].includes(f.type)
      if (!ok) continue
      if (f.size > 4 * 1024 * 1024) continue
      const att: { name: string; type: string; dataUrl?: string } = { name: f.name, type: f.type }
      if (f.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = () => setAttachments((prev) => [...prev, { ...att, dataUrl: reader.result as string }])
        reader.readAsDataURL(f)
      } else {
        setAttachments((prev) => [...prev, att])
      }
    }
  }

  const toggleVoice = () => {
    const SR = (window as unknown as { SpeechRecognition?: new () => never; webkitSpeechRecognition?: new () => never }).SpeechRecognition
      ?? (window as unknown as { webkitSpeechRecognition?: new () => never }).webkitSpeechRecognition
    if (!SR) {
      alert('Browser tidak mendukung voice input. Gunakan Chrome/Edge.')
      return
    }
    if (listening) {
      recogRef.current?.stop()
      setListening(false)
      return
    }
    const rec = new SR() as unknown as {
      lang: string; interimResults: boolean; continuous: boolean
      onresult: (e: { results: { 0: { transcript: string } }[] }) => void
      onend: () => void
      start: () => void; stop: () => void
    }
    rec.lang = 'id-ID'
    rec.interimResults = false
    rec.continuous = false
    rec.onresult = (e) => {
      const t = e.results[0][0].transcript
      setText((prev) => (prev ? prev + ' ' : '') + t)
    }
    rec.onend = () => setListening(false)
    recogRef.current = rec
    rec.start()
    setListening(true)
  }

  return (
    <div className="w-full">
      {attachments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {attachments.map((a, i) => (
            <div key={i} className="flex items-center gap-1.5 rounded-lg border bg-card px-2 py-1 text-xs">
              {a.dataUrl ? <img src={a.dataUrl} alt={a.name} className="h-6 w-6 rounded object-cover" /> : <Paperclip className="h-3 w-3" />}
              <span className="max-w-32 truncate">{a.name}</span>
              <button onClick={() => setAttachments(attachments.filter((_, j) => j !== i))}><X className="h-3 w-3" /></button>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-end gap-1.5 rounded-2xl border bg-card p-2 shadow-sm focus-within:ring-1 focus-within:ring-ring">
        <input ref={fileRef} type="file" multiple accept="image/png,image/jpeg,image/webp,application/pdf" hidden onChange={(e) => pickFiles(e.target.files)} />
        <Button variant="ghost" size="icon" title="Lampirkan gambar/PDF" onClick={() => fileRef.current?.click()} disabled={streaming}>
          <Paperclip className="h-4 w-4" />
        </Button>
        <textarea
          ref={taRef}
          rows={1}
          value={text}
          placeholder={placeholder ?? 'Tulis pesan kamu… (Enter kirim, Shift+Enter baris baru)'}
          className="flex-1 resize-none bg-transparent px-1 py-2 text-sm outline-none max-h-[200px] placeholder:text-muted-foreground"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              submit()
            }
          }}
        />
        <Button variant="ghost" size="icon" title="Voice input" onClick={toggleVoice} className={cn(listening && 'text-destructive animate-pulse')} disabled={streaming}>
          <Mic className="h-4 w-4" />
        </Button>
        {streaming ? (
          <Button size="icon" variant="destructive" title="Stop generating" onClick={onStop}>
            <Square className="h-4 w-4" />
          </Button>
        ) : (
          <Button size="icon" title="Kirim" onClick={submit} disabled={disabled || (!text.trim() && attachments.length === 0)}>
            <Send className="h-4 w-4" />
          </Button>
        )}
      </div>
      <p className="text-center text-[10px] text-muted-foreground mt-1.5">
        AstraChat bisa salah. Periksa kembali informasi penting.
      </p>
    </div>
  )
}
