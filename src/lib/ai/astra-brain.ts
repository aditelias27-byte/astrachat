// language: TypeScript, file: astra-brain.ts — AstraBrain: retrieval-based answering dari 3 dataset HuggingFace
// Sumber latihan: ultrachat (EN), alpaca-gpt4-indonesian (ID), opc-sft-stage1 (coding)
import brainData from '@/lib/knowledge/brain.json'

interface Entry { kw: string; q: string; a: string }
const brain = brainData as unknown as Record<'english' | 'indonesian' | 'coding', Entry[]>

const STOP = new Set([
  'apa', 'yang', 'untuk', 'dengan', 'dan', 'the', 'a', 'an', 'of', 'to', 'in', 'is', 'how',
  'what', 'can', 'you', 'bagaimana', 'itu', 'di', 'ke', 'dari', 'pada', 'adalah', 'akan',
  'atau', 'juga', 'nya', 'please', 'me', 'my', 'i', 'buat', 'buatkan', 'jelaskan', 'gimme',
])

function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-zA-Z\u00C0-\u024F]+/g) ?? []).filter((w) => !STOP.has(w) && w.length > 2)
}

function detectLang(text: string): 'indonesian' | 'english' {
  const idWords = ['apa', 'bagaimana', 'kenapa', 'siapa', 'yang', 'dan', 'buat', 'tolong', 'jelaskan', 'bisa', 'aku', 'saya', 'kamu', 'adalah', 'dengan']
  const words = text.toLowerCase().split(/\s+/)
  const hits = words.filter((w) => idWords.includes(w)).length
  return hits >= 2 ? 'indonesian' : 'english'
}

function isCoding(text: string): boolean {
  return /\b(code|coding|function|python|javascript|typescript|bug|error|sql|api|class|algorithm|program|script|kode|fungsi|program|algoritma)\b/i.test(text)
}

export interface BrainAnswer {
  ok: boolean
  content: string
  category: string
  matched: number
}

/** Retrieve-based answer: cocokkan token pertanyaan dengan pola yang dilatih. */
export function askBrain(question: string): BrainAnswer {
  const tokens = tokenize(question)
  if (tokens.length === 0) return { ok: false, content: '', category: 'none', matched: 0 }

  const category = isCoding(question) ? 'coding' : detectLang(question) === 'indonesian' ? 'indonesian' : 'english'
  const pool = brain[category] ?? []
  const otherPools = Object.entries(brain).filter(([k]) => k !== category).map(([, v]) => v).flat()

  // bobot kata: kata yang sering muncul di semua entri bernilai rendah (mirip IDF)
  const df = new Map<string, number>()
  for (const e of [...pool, ...otherPools]) {
    for (const k of Array.from(new Set(e.kw.split(' ')))) df.set(k, (df.get(k) ?? 0) + 1)
  }
  const total = pool.length + otherPools.length || 1
  const idf = (k: string) => Math.log(1 + total / (1 + (df.get(k) ?? 0)))

  const score = (e: Entry, base: number) => {
    const kwTokens = e.kw.split(' ')
    let s = 0
    for (const t of tokens) {
      let best = 0
      for (const k of kwTokens) {
        if (k === t) best = Math.max(best, 3 * idf(k))
        else if (k.startsWith(t) || t.startsWith(k)) best = Math.max(best, 1.5 * idf(k))
      }
      s += best
    }
    return s * base
  }

  const scored = [
    ...pool.map((e) => ({ e, s: score(e, 1) })),
    ...otherPools.map((e) => ({ e, s: score(e, 0.6) })),
  ].filter((x) => x.s > 0).sort((a, b) => b.s - a.s)

  // butuh minimal 2 kata kunci yang cocok kuat agar jawaban relevan
  const strongMatch = tokens.filter((t) => {
    const kwHit = pool.some((e) => e.kw.split(' ').some((k) => k === t || k.startsWith(t) || t.startsWith(k)))
    return kwHit
  }).length

  if (scored.length === 0 || scored[0].s < 5 || strongMatch < 1) {
    return { ok: false, content: '', category, matched: 0 }
  }

  const lang = detectLang(question)
  const best = scored[0].e
  const parts: string[] = []

  if (lang === 'indonesian') {
    parts.push(`Berdasarkan pengetahuan yang AstraBrain pelajari (${category === 'coding' ? 'dataset coding OpenCoder' : category === 'indonesian' ? 'dataset Alpaca GPT-4 Indonesia' : 'dataset UltraChat'}), ini jawaban paling relevan:`)
  } else {
    parts.push(`Based on what AstraBrain learned (${category === 'coding' ? 'OpenCoder coding dataset' : category === 'indonesian' ? 'Alpaca GPT-4 Indonesian dataset' : 'UltraChat dataset'}), here is the most relevant answer:`)
  }
  parts.push(best.a)
  if (scored.length > 1) {
    parts.push(lang === 'indonesian' ? '**Referensi lain yang berkaitan:**' : '**Related references:**')
    for (const s of scored.slice(1)) parts.push(`- ${s.e.a.slice(0, 160)}…`)
  }

  return { ok: true, content: parts.join('\n\n'), category, matched: scored.length }
}
