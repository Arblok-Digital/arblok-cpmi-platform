# ARBLOK CPMI Platform

Platform partner & referral CPMI (Pilot Tasikmalaya) — React + TypeScript + Vite + Tailwind + Supabase-ready PWA.

## Stack

- React 19, TypeScript, Vite 8
- Tailwind CSS 4 (custom navy/amber theme)
- React Router 7 (role-gated routes)
- React Hook Form + Zod (validasi)
- vite-plugin-pwa (offline shell, install prompt)
- Vitest + jsdom (unit/integration tests)
- Supabase (PostgreSQL + Auth + RLS + RPC) — optional, demo mode runs without it

## Arsitektur

Lihat [`ARBLOK_CPMI_PLATFORM_ARCHITECTURE.md`](ARBLOK_CPMI_PLATFORM_ARCHITECTURE.md) untuk spesifikasi lengkap (1189 baris): modul, aturan bisnis, 19-status pipeline, keamanan, consent, fee ledger, audit.

## Jalankan (Demo Mode — tanpa backend)

```bash
cd "C:\Users\ARBLOK\Documents\CPMI platfrom\arblok-cpmi-platform"
npm install
npm run dev
```

Buka http://localhost:5173. Login dengan salah satu akun demo (password: `demo1234`):

| Email | Peran | Keterangan |
|---|---|---|
| `admin@arblok.id` | `arblok_admin` | Platform admin |
| `hendra@mitrabhayangkara.co.id` | `p3mi_admin` | Admin P3MI |
| `nadia@mitrabhayangkara.co.id` | `p3mi_reviewer` | Reviewer dokumen |
| `dedi@mitrabhayangkara.co.id` | `agent_coordinator` | Koordinator agen |
| `asep@mitraagen.id` | `agent` | Agen (wil. Kab. Tasikmalaya) |
| `neng@mitraagen.id` | `agent` | Agen (wil. Ciamis) |
| `siti.cpmi@example.test` | `cpmi` | Kandidat Siti Nurhaliza |

Semua data adalah **sintetis/dummy**. Jangan masukkan data CPMI asli sebelum tinjauan privasi/legal.

## Jalankan (Supabase Mode — butuh Docker WSL)

```bash
# Dari WSL
cd "/mnt/c/Users/ARBLOK/Documents/CPMI platfrom/arblok-cpmi-platform"
supabase start -x studio,mailpit,imgproxy,edge-runtime,logflare,vector,supavisor,realtime,storage-api,postgres-meta

# Salin URL & key ke .env.local
VITE_SUPABASE_URL=http://127.0.0.1:56321
VITE_SUPABASE_PUBLISHABLE_KEY=<dari-supabase-status>

# Restart dev server
npm run dev
```

Detail lengkap: [`docs/SUPABASE_LOCAL.md`](docs/SUPABASE_LOCAL.md)

## Perintah Berguna

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Dev server + HMR |
| `npm run build` | Typecheck + production build |
| `npm run preview` | Preview build hasil |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest run (41 test) |
| `npm run test:watch` | Vitest watch mode |

## Struktur Project

```
src/
├── app/                 # Session, route guards
├── components/
│   ├── layout/          # AppShell, sidebar, topbar, mobile nav
│   ├── shared/          # PageHeader, StatCard, Timeline, status badges
│   └── ui/              # Primitif: Button, Card, Dialog, Form, Toast, Tabs
├── features/
│   ├── account/         # Akun saya
│   ├── admin/           # Platform admin (org, network, audit, config)
│   ├── auth/            # Login
│   ├── candidates/      # Pipeline board, list, detail (agent & P3MI)
│   ├── commission/      # Komisi agen, fee P3MI, pembayaran FIFO
│   ├── complaints/      # Pengaduan (agent/CPMI/P3MI)
│   ├── cpmi/            # Data & perkembangan kandidat
│   ├── dashboard/       # Dashboard per role
│   ├── documents/       # Upload, review, versioning dokumen
│   ├── misc/            # NotFound
│   ├── network/         # Jaringan agen & koordinator
│   ├── notifications/   # In-app notifications
│   ├── operations/      # Kunjungan & handover
│   ├── referrals/       # Buat referral, inbox, detail P3MI
│   ├── reports/         # Laporan ops
│   └── settings/        # Pengaturan P3MI
├── lib/
│   ├── constants.ts     # Role, status, doc types, ledger, complaint meta
│   ├── format.ts        # Currency, date, phone, percent
│   ├── insights.ts      # Action queues, group counts
│   ├── permissions.ts   # Visibility scoping, permission matrix
│   ├── seed.ts          # Synthetic data (2 org, 7 accounts, 13 candidates)
│   ├── store.ts         # Demo store (localStorage, useSyncExternalStore)
│   ├── types.ts         # Domain model (TypeScript)
│   └── utils.ts         # cn() helper
└── styles/
    └── index.css        # Tailwind + navy/amber theme + PWA styles
```

## Supabase Migrations

```
supabase/
├── config.toml
├── migrations/
│   ├── 0001_schema.sql   # 25 tables, constraints, sequences
│   ├── 0002_rls.sql      # 18 helper functions + RLS all tables
│   └── 0003_rpc.sql      # 11 transactional RPCs
└── README.md
```

## Testing

```bash
npm test                 # 49 unit/integration tests
npx playwright test --project=chromium   # 55 E2E tests (6 peran)
```

- Unit: permissions, duplicate detection, fee idempotency, FIFO allocation, status transitions, document review, access logging, CRUD lowongan & perjanjian agen.
- E2E: login lintas peran, wizard referral, keputusan P3MI, pipeline, dokumen, fee & pembayaran, pengaduan, consent, jaringan koordinator, audit/CSV, lowongan & perjanjian, navigasi mobile, dan smoke test seluruh rute per peran (anti-404 + console error).

## 📊 Progres & Roadmap ke Produksi

Lihat `docs/PROGRESS.md` untuk dokumentasi lengkap progres, estimasi persentase ke 100% produksi, dan backlog prioritas tinggi sebelum repo GitHub dibuat.

**Singkatnya:** Frontend + E2E semua role sudah 100% (pilot siap demo dengan data sintetis). Untuk produksi nyata (Supabase, autentikasi, file storage, review privasi PII) masih sekitar 20–25% pekerjaan tersisa.

## Data Sintetis (Pilot)

- 2 Organisasi: Mitra Bhayangkara (aktif), Karya Nusantara (onboarding)
- 7 Akun lintas 6 peran
- 4 Agen (2 aktif, 1 pending, 1 koordinator)
- 4 Job Order, 4 Vacancy
- 13 Kandidat (Siti, Rina, Diah, Wulan, dll.)
- 13 Referral (8 accepted, 2 submitted, 1 duplicate, 1 disputed)
- 2 Komisi agreement (Asep, Neng) dengan 3 milestone: handover, departed, working
- 6 Ledger entries (3 paid, 1 due, 1 earned, 1 partially_paid)
- 3 Pembayaran dengan alokasi FIFO
- 2 Pengaduan, 15 Notifikasi, Audit + Access events

> **Peringatan:** Data di atas adalah **sintetis**. Tidak ada PII nyata. Semua dokumen `is_dummy: true` (tidak disimpan fisik).

## Keamanan & Privasi

- RLS aktif di semua 25 tabel
- Tenant isolation: `organization_id` di setiap baris
- Akses dokumen memerlukan alasan (audit log wajib)
- Agent hanya baca pipeline; P3MI punya write
- Consent ganda: `data_processing` + `data_sharing` per kandidat
- Audit trail append-only untuk aksi sensitif
- Tidak ada upload fisik pada demo (file dummy)

## Deploy

```bash
npm run build
# Output di dist/
# Static hosting: Netlify, Vercel, Cloudflare Pages, AWS S3+CloudFront, dst.
```

PWA manifest & service worker sudah ter-generate (Workbox generateSW).

## Dokumentasi

| File | Deskripsi |
|---|---|
| `ARBLOK_CPMI_PLATFORM_ARCHITECTURE.md` | Spesifikasi arsitektur penuh |
| `docs/SUPABASE_LOCAL.md` | Panduan operasional Supabase lokal (WSL) |
| `supabase/README.md` | Ringkasan backend, migrasi, testing |
| `supabase/migrations/*.sql` | Schema, RLS, RPC |

## Lisensi

Internal ARBLOK Digital — Pilot CPMI Tasikmalaya.