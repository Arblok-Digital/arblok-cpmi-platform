# Backend Supabase — ARBLOK CPMI Platform

> Panduan operasional lengkap (container, port, isolasi, troubleshooting):
> [`docs/SUPABASE_LOCAL.md`](../docs/SUPABASE_LOCAL.md).

Aplikasi tetap berjalan dalam **Demo Mode** (`localStorage`, data sintetis)
selama dua variabel `VITE_*` kosong. Backend ini dipakai untuk mode Supabase.

## 1. Local (WSL)

Stack lokal berjalan di Docker dalam WSL, terpisah dari project lain.

| Layanan | Port |
|---|---|
| API / Kong | 56321 |
| PostgreSQL | 56322 |
| Shadow DB | 56320 |
| Studio | 56323 (belum dijalankan) |
| Inbucket/Mailpit | 56324 (belum dijalankan) |
| Analytics | 56327 (belum dijalankan) |

`project_id = "arblok-cpmi"` sehingga Docker membuat volume
`supabase_db_arblok-cpmi` dan network `supabase_network_arblok-cpmi` sendiri.
Project lain memakai blok port berbeda: `bengkel-pos` 5532x, `fakturku` 5432x.

CLI yang cocok dengan image cache di mesin ini adalah **v2.122.0** (binary Linux
di `/usr/local/bin/supabase`, dijalankan dari dalam WSL).

```bash
# dari WSL, di root project
cd "/mnt/c/Users/ARBLOK/Documents/CPMI platfrom/arblok-cpmi-platform"

supabase start \
  -x studio,mailpit,imgproxy,edge-runtime,logflare,vector,supavisor,realtime,storage-api,postgres-meta

supabase status
supabase db reset   # terapkan ulang 0001-0003 + seed (jika ada)
```

Catatan WSL: VM dimatikan saat idle, tetapi container Supabase ikut hidup lagi
otomatis dan data tetap ada di volume. Perintah `supabase` berikutnya akan
membangunkan WSL terlebih dahulu (beberapa detik).

Alternatif menjalankan seluruh service (butuh unduhan image tambahan):

```bash
supabase start
```

## 2. Isolasi antar project

Setiap project Supabase lokal wajib punya kombinasi unik berikut. Jangan
menyalin `project_id` atau port dari project lain.

- `project_id` unik → nama container, volume, dan network unik.
- Blok port unik → tidak ada dua `postgres`/`kong` yang berebut port host.
- Tidak ada volume atau database bersama; satu container Postgres per project.

Verifikasi cepat:

```bash
docker volume ls | grep supabase
docker network ls | grep supabase
docker ps --format '{{.Names}}|{{.Status}}|{{.Ports}}'
```

## 3. Hubungkan frontend

```bash
cd "/mnt/c/.../arblok-cpmi-platform"
supabase status   # salin Project URL dan Publishable key
```

Isi `.env.local` (jangan commit):

```
VITE_SUPABASE_URL=http://127.0.0.1:56321
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable-key-dari-supabase-status>
```

Restart `npm run dev`. **Jangan pernah** memakai secret/service key di `VITE_*`.

## 4. Cloud

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push
```

Terapkan ke project **staging** dulu, bukan production. Untuk PostgreSQL biasa,
schema `auth`, role `anon`/`authenticated`, dan `auth.uid()` harus disediakan
(lihat `src/lib/sql-backend.test.ts`).

## 5. Pengujian

```bash
npx vitest run src/lib/sql-backend.test.ts
```

Test menjalankan seluruh migrasi di Postgres in-memory (PGlite) dan menguji
isolasi tenant, referral + consent, rollback pipeline, fee idempoten, pembayaran
FIFO, review dokumen, dan access log.

## 6. Yang belum dicakup migrasi

- Upload file fisik ke Storage (bucket privat + signed URL).
- Undangan/pembuatan akun oleh admin.
- Retensi, penghapusan, dan ekspor data subjek.
