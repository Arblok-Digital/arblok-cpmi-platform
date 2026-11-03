# Progres & Roadmap ke Produksi — CPMI Partner & Referral Platform (Pilot Tasikmalaya)

> Dokumen handover untuk tim & agent selanjutnya. Ditulis setelah E2E semua 6 role selesai (55/55 chromium, 49/49 unit, typecheck 0 error, build success).

## 1. Status Saat Ini

### ✅ Sudah Selesai
- **Frontend PWA lengkap**: React 19 + TypeScript + Vite + Tailwind 4 + React Router 7.
- **6 role dengan role guard**: `arblok_admin`, `p3mi_admin`, `p3mi_reviewer`, `agent_coordinator`, `agent`, `cpmi`.
- **Semua halaman dirender**: smoke test 35+ rute per role, tanpa 404, tanpa console error, setiap halaman punya `h1`.
- **Workflow inti E2E**: login 7 akun, wizard referral 3 langkah + consent gate, P3MI accept/reject referral, pipeline 19 status (maju/mundur + alasan), dokumen (upload CPMI, tolak tipe/ukuran, P3MI approve/revisi, access reason + log), fee FIFO + pembayaran + tolak overpayment + reviewer 4-eyes + agen read-only, consent revoke, pengaduan CPMI→P3MI selesai, jaringan koordinator, audit + CSV export, org status, notifikasi, navigasi mobile vs desktop.
- **Data sintetis only**: 2 organisasi, 7 akun, 4 agen, 4 job order, 4 lowongan, 13 kandidat, 13 referral, komisi & ledger, 2 pengaduan, audit + access events. Semua ditandai `is_dummy: true`, tidak ada PII nyata.
- **Supabase-ready**: migrasi `0001_schema.sql` (25 tabel), `0002_rls.sql` (18 fungsi + RLS), `0003_rpc.sql` (11 RPC) ada di `supabase/migrations`. Tapi **belum dihubungkan ke Supabase nyata** — masih pakai `localStorage` demo.
- **Testing**: Vitest 49 test, Playwright 55 E2E (hanya project `chromium`).

### 🔧 Perbaikan Terbaru (belum ada di repo)
- `P3miVacancyPage.openCreate()`: prefill `country`/`sector` dari job order pertama (fix validasi selalu gagal).
- Store action baru: `saveVacancy`/`deleteVacancy`, `saveAgentAgreement`/`deleteAgentAgreement` via `mutate()` → persist ke `localStorage` + audit.
- Role-based CRUD: hanya `p3mi_admin` Tambah/Edit/Hapus lowongan & perjanjian; reviewer read-only; agen diblokir halaman manajemen.
- Tombol "Detail" lowongan & perjanjian: dari LinkButton ke rute 404 → Dialog detail inline.
- data-testid ditambahkan pada form dialog & tombol hapus untuk E2E stabil.
- 5 spec E2E baru: `p3mi.vacancy.crud`, `p3mi.agreement.crud`, `routes.smoke`, + revisi 11 spec lama agar tahan strict-mode.

### 🔑 Akun Demo (password semua `demo1234`)
| Email | Role |
|---|---|
| admin@arblok.id | arblok_admin |
| hendra@mitrabhayangkara.co.id | p3mi_admin |
| nadia@mitrabhayangkara.co.id | p3mi_reviewer |
| dedi@mitrabhayangkara.co.id | agent_coordinator |
| asep@mitraagen.id | agent |
| neng@mitraagen.id | agent |
| siti.cpmi@example.test | cpmi |

---

## 2. Perkiraan Ke 100% Production

Berdasarkan arsitektur saat ini (demo PWA + Supabase-ready, belum konek backend nyata):

| Aspek | Status | Estimasi Sisa |
|-------|--------|---------------|
| Frontend UI/UX semua role | 100% | 0% |
| E2E + unit test | 95% (hanya chromium) | 5% (firefox/webkit/mobile) |
| Supabase schema & RLS (file ada) | 90% (belum diuji vs Postgres nyata) | 10% |
| Koneksi app ke Supabase nyata (auth, DB, storage) | 0% | 30% |
| Autentikasi produksi (bukan demo password hardcode) | 0% | 10% |
| Penyimpanan berkas nyata (S3/Supabase Storage) | 0% (synthetic only) | 10% |
| Review privasi/legal untuk PII nyata | 0% (hanya data sintetis) | 15% |
| CI/CD + deploy produksi | 0% | 10% |
| Monitoring, error tracking, rate limiting, backup | 0% | 10% |
| **Overall ke produksi sebenarnya** | **~75–80%** | **~20–25%** |

**Catatan:** Jika "100%" berarti **pilot Tasikmalaya siap demo dengan data sintetis** → sudah 100%. Jika "100%" berarti **produksi nyata dengan data CPMI asli** → masih butuh ~20–25% kerja backend/infra/legal.

---

## 3. Backlog Prioritas Tinggi (Sebelum Repo GitHub)

1. **Hubungkan ke Supabase**: ganti `localStorage` store dengan Supabase client (auth + Realtime/Postgres), uji RLS dan RPC.
2. **Autentikasi nyata**: ganti hardcoded `demo1234` dengan Supabase Auth + email/password atau SSO.
3. **File storage nyata**: ganti "Demo: file tidak disimpan" dengan Supabase Storage + virus scan / tipe file.
4. **Privasi & legal**: review dokumen PII sebelum mengizinkan data asli; tambahkan privacy policy & ToS.
5. **Test lintas browser**: jalankan Playwright `firefox`, `webkit`, dan project mobile.
6. **CI/CD**: GitHub Actions untuk typecheck, test, build, dan deploy preview.
7. **Monitoring**: Sentry + log error produksi.
8. **Dokumentasi opsional**: runbook deployment, env vars produksi, backup DB.

---

## 4. Cara Menjalankan (Handover)

```bash
cd "C:\Users\ARBLOK\Documents\CPMI platfrom\arblok-cpmi-platform"

# Install
npm install

# Dev server (http://localhost:5173)
npm run dev

# Unit test (49 test)
npm test

# Typecheck
npm run typecheck

# Build PWA
npm run build

# E2E chromium (55 test)
npx playwright test --project=chromium

# Install playwright browsers kalau belum
npx playwright install chromium
```

### Struktur Penting
- `src/lib/store.ts` — store demo (sync, localStorage), aksi referral, fee, dokumen, lowongan, perjanjian.
- `src/lib/permissions.ts` — matriks izin per role.
- `src/lib/types.ts` — type `Vacancy`, `AgentAgreement`, `Referral`, `LedgerEntry`, dll.
- `src/features/operations/P3miVacancyPage.tsx` — CRUD lowongan.
- `src/features/operations/P3miAgentAgreementPage.tsx` — CRUD perjanjian agen.
- `supabase/migrations/0001_schema.sql`, `0002_rls.sql`, `0003_rpc.sql` — siap untuk produksi.
- `tests/e2e/*.spec.ts` — 13 spec E2E.
- `src/lib/*.test.ts` — unit test Vitest.

---

## 5. Peringatan (Jangan Lupa)
- **Tidak ada git repo masih** — semua perubahan belum di-commit. Repo GitHub belum dibuat.
- **Data sintetis only** — jangan masukkan PII/dokumen CPMI asli sebelum review privasi selesai.
- **Demo password `demo1234`** — tidak untuk produksi.
- **Playwright hanya diuji di chromium** — firefox/webkit/mobile belum.

---

## 6. Definisi "100% Production" (Setuju Tim)

1. App konek ke Supabase produksi (auth, DB, Storage).
2. Tidak ada hardcoded demo password / data sintetis di path produksi.
3. Semua migrasi Supabase diterapkan dan RLS teruji.
4. E2E lolos di chromium + firefox + webkit (+ mobile viewport).
5. CI/CD otomatis: typecheck → test → build → deploy preview.
6. Review privasi/legal selesai untuk data CPMI asli.
7. Monitoring + backup aktif.

---

_Dokumen ini dibuat untuk handover. Agent selanjutnya bisa lanjut dari poin 3 (Backlog) atau poin 5 (Koneksi Supabase)._
