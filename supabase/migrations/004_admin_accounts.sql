-- ============================================================
-- 004_admin_accounts.sql — Membuat / mengangkat akun admin khusus
-- Jalankan di SQL Editor Supabase SETELAH 001_init.sql
-- ============================================================

-- CARA 1 (paling mudah): daftar dulu lewat halaman /chat (Masuk / Daftar)
-- dengan email yang kamu isi di env ADMIN_EMAILS (dipisah koma), contoh:
--   ADMIN_EMAILS=staff1@contoh.com,staff2@contoh.com
-- Maka akun tsb otomatis dapat role 'admin' saat register.

-- CARA 2: angkat user yang SUDAH terdaftar jadi admin.
-- Ganti email di bawah, lalu jalankan:
-- update public.profiles set role = 'admin' where email = 'ganti-email@contoh.com';

-- CARA 3: buat akun admin BARU langsung dari SQL (tanpa lewat halaman web).
-- GANTI 'email-admin@contoh.com' dan 'GantiPasswordAman123!' dulu:
-- select id from auth.users where email = 'email-admin@contoh.com';
-- Jika user belum ada, buat lewat Dashboard Supabase:
--   Authentication → Users → "Add user" → isi email + password → Create user
-- Lalu angkat rolenya:
-- update public.profiles set role = 'admin' where email = 'email-admin@contoh.com';

-- Verifikasi siapa saja admin/owner:
select email, role, is_banned, created_at
from public.profiles
where role in ('admin', 'owner')
order by role, created_at;

-- Catatan keamanan:
-- - Role 'admin' bisa membuka /owner (Panel Owner) dan mengelola user/model/keys.
-- - Jangan pernah set role='admin' lewat UI user biasa; hanya Owner yang bisa
--   mengubah role (sudah ditegakkan server-side di /api/owner/*).
-- - Untuk mencabut admin: update public.profiles set role='user' where email='...';
