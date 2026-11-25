# AstraChat — Website Chat AI Multi-Model

Satu website untuk banyak model AI (GPT, Claude, Gemini, DeepSeek, Qwen, Kimi, dll) melalui satu gateway OpenAI-Compatible. Dilengkapi Panel Owner super lengkap: API Key terenkripsi, manajemen model, user & limit, system prompt, settings tampilan, logs & audit.

## Tech Stack
- **Next.js 14 App Router + TypeScript**
- **Tailwind CSS + shadcn/ui** (Radix primitives) + **Framer Motion**
- **Supabase** (PostgreSQL + Auth) — RLS aktif di semua tabel
- **Zustand** untuk state management
- **react-markdown + remark-gfm + remark-math + rehype-highlight + rehype-katex** (code block, tabel, LaTeX)
- **Recharts** untuk grafik dashboard owner
- Streaming **SSE** — semua request AI lewat **server-side API Route** (API key tidak pernah bocor ke browser)

## 1. Install

```bash
npm install
cp .env.example .env.local   # isi env (lihat bawah)
npm run dev                  # buka http://localhost:3000
```

## 2. Setup Supabase

1. Buat project di [supabase.com](https://supabase.com) → ambil **Project URL**, **anon key**, dan **service_role key** (Settings → API).
2. Buka **SQL Editor** di dashboard Supabase → paste seluruh isi [`supabase/migrations/001_init.sql`](supabase/migrations/001_init.sql) → **Run**. Ini membuat 7 tabel + RLS + trigger + seed (7 model awal + settings default).
3. (Opsional) Auth → Providers → aktifkan **Google** untuk login Google.
4. Isi `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
OWNER_EMAIL=email-kamu@contoh.com      # user pertama yang daftar dgn email ini otomatis jadi owner
ENCRYPTION_KEY=<32 karakter acak>       # generate: openssl rand -hex 32
```

> `SUPABASE_SERVICE_ROLE_KEY` hanya dipakai di server (API routes) — tidak pernah dikirim ke browser.

## 3. Isi API Key di Panel Owner

1. Daftar/login dengan `OWNER_EMAIL` → buka **/owner**.
2. Tab **API & Model** → tambahkan API Key: pilih provider (clouvia / openai / anthropic / google / openrouter / custom), isi Base URL (default `https://router.clouvia.id/v1`) dan API Key → Simpan. Key dienkripsi **AES-256-GCM** sebelum masuk database.
3. Klik **Test** untuk cek koneksi. Centang *Fallback* agar key jadi cadangan otomatis kalau key utama gagal/limit.
4. Tab **Manajemen Model** → atur model aktif/nonaktif, harga per 1M token, badge (Gratis/Pro/Vision/Reasoning), min. paket, system prompt per model, dan urutan.

## 4. Fitur

**User:** sidebar riwayat (search/rename/delete/pin/folder), model picker dengan badge, streaming kata per kata, upload gambar (vision), voice input (Web Speech API), regenerate, edit & kirim ulang, copy/like, export Markdown/TXT, mode fokus, guest 5 chat/hari (localStorage), prompt suggestions, code block + copy, tabel & LaTeX, dark/light.

**Owner:** dashboard (statistik + grafik Recharts + 10 chat terakhir), API keys multi-gateway dengan fallback + test connection + enkripsi, CRUD model + urutan + min. paket, manajemen user (role/ban/reset limit/hapus), limit global & maintenance mode, settings tampilan (nama, logo, warna, dark default), logs request AI + error + audit log.

## 5. Deploy ke Vercel

1. Push repo ke GitHub → import di [vercel.com](https://vercel.com).
2. Isi semua env variables dari `.env.example` di Project Settings → Environment Variables.
3. Deploy. Selesai — `npm run build` sudah diverifikasi lulus tanpa error.

## Struktur

```
src/
├── app/                    # App Router (halaman + API routes)
│   ├── api/chat/           # SSE streaming proxy ke AI gateway (server-side)
│   ├── api/owner/          # stats, keys, models, users, settings, logs, audit
│   ├── chat/ profile/ pricing/ owner/
├── components/ chat/ owner/ ui/
├── lib/ ai/ (gateway, crypto AES-256-GCM) supabase/
├── store/                  # Zustand
└── types/
supabase/migrations/001_init.sql
```
