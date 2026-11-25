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

## 6. Login Google & GitHub (OAuth)

1. **Supabase Dashboard → Authentication → URL Configuration**
   - Site URL: `https://DOMAIN-ANDA.vercel.app`
   - Redirect URLs: tambahkan `https://DOMAIN-ANDA.vercel.app/auth/callback` dan `http://localhost:3000/auth/callback`
2. **Provider Google**: aktifkan di Supabase → buat OAuth Client di [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → Authorized redirect URI: `https://xxxxx.supabase.co/auth/v1/callback` → copy Client ID & Secret ke Supabase.
3. **Provider GitHub**: buat OAuth App di [github.com/settings/developers](https://github.com/settings/developers) → Homepage URL: domain Anda → Authorization callback URL: `https://xxxxx.supabase.co/auth/v1/callback` → copy Client ID & Secret ke Supabase.
4. Selesai — tombol **Google** & **GitHub** di dialog login AstraChat langsung berfungsi.

## 7. AstraBrain — AI bawaan tanpa API Key

AstraChat dilatih dengan retrieval dari 3 dataset HuggingFace (total 6.000 contoh SFT aktif):

| Dataset | Bahasa/Kategori | Jumlah pola |
|---|---|---|
| [metythorn/ultrachat](https://huggingface.co/datasets/metythorn/ultrachat) | Inggris | 1.987 |
| [FreedomIntelligence/alpaca-gpt4-indonesian](https://huggingface.co/datasets/FreedomIntelligence/alpaca-gpt4-indonesian) | Indonesia | 1.997 |
| [OpenCoder-LLM/opc-sft-stage1](https://huggingface.co/datasets/OpenCoder-LLM/opc-sft-stage1) | Coding | 1.660 |

Model **AstraBrain (Bawaan)** selalu muncul di model picker dan gratis. Ketika tidak ada API key eksternal dikonfigurasi, `/api/chat` otomatis menjawab lewat AstraBrain dengan streaming SSE.

### Melatih ulang AstraBrain dengan data lebih banyak
```bash
python3 scripts/prepare-datasets.py   # unduh contoh baru dari HuggingFace (default 2000/kategori)
python3 scripts/build-knowledge.py    # kompres jadi src/lib/knowledge/brain.json
npm run build                         # rebuild
```
Naikkan angka `2000` di `scripts/prepare-datasets.py` untuk melatih lebih banyak (dataset asli: 800k + 50k + 1M).

## 8. Fitur v1.3 — Persona Furina + Admin Settings (Token Limit & Lock Model)

### Persona Furina ✨
Model `furina` (provider `persona`) muncul otomatis di model picker. Saat dipakai tanpa API key, AstraBrain menjawab dengan **gaya bicara Furina** (karakter Genshin Impact): anggun, teatrikal, jenaka ("Hehe~", "Pertunjukan hebat, bukan? ✨"). Saat Owner menambahkan API key, system prompt Furina otomatis diterapkan ke model gateway tsb (atur di Panel Owner → Manajemen Model → Edit → System prompt).

### Token limit per user
Panel Owner → **User** → klik ikon koin (🪙) pada user → isi angka token/hari (kosong = default global dari Settings). Saat user melewati batas, `/api/chat` menolak dengan pesan limit (HTTP 429) dan modal upgrade muncul di UI.

### Lock/unlock model per user
Panel Owner → **User** → klik ikon gembok (🔒) → centang model yang **dikunci** untuk user tsb. Model yang dikunci: tidak muncul di model picker user DAN ditolak server-side (HTTP 403) bila dipaksakan via API.

### Migrasi database
Jalankan `supabase/migrations/003_persona_limits.sql` di SQL Editor Supabase (menambah kolom `token_limit_daily`, `locked_models` di tabel `profiles` + seed model `furina`).
