# Runbook Operasional — ARBLOK CPMI Platform (Pilot)

## 1. Akses & Kredensial

### Demo Mode (localStorage)
- URL: `http://localhost:5173` (dev) atau build `dist/` (produksi)
- Password universal: `demo1234`
- 7 akun siap pakai (lihat README.md)
- Data persisten di `localStorage` key `arblok-cpmi-demo-v1`
- Reset demo: klik "Reset seluruh demo" di Pengaturan (hanya admin P3MI)

### Supabase Mode
- Butuh Docker di WSL, CLI 2.122.0
- `supabase start -x studio,mailpit,imgproxy,edge-runtime,logflare,vector,supavisor,realtime,storage-api,postgres-meta`
- `.env.local` dengan `VITE_SUPABASE_URL` + `VITE_SUPABASE_PUBLISHABLE_KEY`
- Jangan pernah commit `.env.local` atau secret key

## 2. Checklist Harian (sebelum demo ke stakeholder)

- [ ] `npm run dev` berjalan tanpa error konsol
- [ ] Login 6 peran berhasil (quick-login cards di halaman login)
- [ ] Dashboard tiap role menampilkan metrik benar
- [ ] Buat referral baru (3-step wizard) → muncul di inbox P3MI
- [ ] P3MI accept referral → kandidat masuk pipeline, ledger created on milestone
- [ ] Upload dokumen (PDF/JPG/PNG < 3MB) → review approve/reject
- [ ] Akses dokumen → dialog alasan → audit log tercatat
- [ ] Status pipeline transisi (P3MI only) → notifikasi ke CPMI & agen
- [ ] Fee approval (admin P3MI) → pembayaran FIFO allocation
- [ ] Pengaduan dibuat → assign ke P3MI → resolved
- [ ] Notifikasi badge count benar
- [ ] Mobile bottom nav & sidebar responsive
- [ ] PWA install prompt muncul (produksi build)

## 3. Troubleshooting Cepat

| Gejala | Penyebab | Solusi |
|---|---|---|
| Halaman putih / error chunk | Cache Vite/PWA | `npm run build` bersih, hapus `node_modules/.vite`, `dist` |
| Login gagal "email tidak terdaftar" | Typo email / demo data reset | Gunakan email dari tabel di README; cek `localStorage` |
| Referral duplikat tidak muncul | Phone normalize beda | `normalizePhone` mengubah `08xx` → `628xx`; bandingkan format |
| Fee tidak muncul di komisi | Milestone belum ter-trigger | Cek status kandidat: `employer_handover`, `departed`, `working` |
| Pembayaran error "melebihi outstanding" | FIFO allocation | Outstanding = sum(amount-paid) status earned/approved/due/partially_paid |
| Dokumen tidak bisa di-upload | MIME/size | Hanya PDF, JPEG, PNG ≤ 3MB; demo `is_dummy=true` |
| RLS error di Supabase | Policy salah / user bukan member | Cek `organization_memberships`, role, status active |
| Notifikasi tidak muncul | Belum login / user_id salah | `notifications` filter by `user_id = auth.uid()` |

## 4. Reset & Seed Ulang

### Demo (localStorage)
```javascript
// Di console browser
localStorage.removeItem('arblok-cpmi-demo-v1')
location.reload()
```
Atau klik "Reset seluruh demo" di `/p3mi/pengaturan` (butuh role `p3mi_admin`).

### Supabase (WSL)
```bash
supabase db reset
# Menghapus data, jalankan 0001-0003 migrasi ulang
```

## 5. Menambah Data Demo Baru

Edit `src/lib/seed.ts`:
1. Tambah entry di array `candidates`, `referrals`, `agents`, `organizations`, dll.
2. Ikuti pola `id` prefix: `cand-`, `ref-`, `ag-`, `org-`, `acc-`, `kms-`, `pay-`
3. Gunakan helper `at(daysAgo, hour, minute)` untuk timestamp relatif
4. `npm run build` untuk verifikasi TypeScript
5. Data baru akan muncul setelah reset demo

## 6. Migrasi Schema Baru

1. Buat file `supabase/migrations/0004_nama_fitur.sql`
2. Tulis SQL (DDL + RLS + RPC jika perlu)
3. `supabase db reset` (di WSL)
4. `npx vitest run src/lib/sql-backend.test.ts`
5. Update `src/lib/types.ts` kalau ada type baru
6. Update `src/lib/seed.ts` kalau perlu data demo
7. Commit migration file

## 7. Debugging Umum

### React DevTools
- Components, Profiler, Hook inspection
- Filter `useAppState` untuk lihat store snapshot

### Network Tab
- Cek request ke Supabase (jika mode Supabase)
- Demo mode: tidak ada request jaringan kecuali font/asset

### Console Logs
- Store actions log ke console (lihat `mutate` di `store.ts`)
- Audit events tercatat di `state.auditEvents`

### TypeScript Errors
```bash
npm run typecheck
# Atau di VS Code: Ctrl+Shift+P → "TypeScript: Restart TS Server"
```

## 8. Performa Build

- Chunk utama ~850 KB gzipped ~218 KB
- Code-split per route: belum dikonfigurasi (lazy load bisa ditambah)
- Font: Plus Jakarta Sans variable (preload di `index.html`)
- PWA: 10 entries precache ~947 KB

## 9. Kontak Escalation

- Platform: ARBLOK Digital (support@arblok.id — contoh)
- P3MI Pilot: PT Mitra Bhayangkara Nusantara, Tasikmalaya
- Jam kerja: Senin–Jumat, 08.00–16.00 WIB

---

**Catatan:** Runbook ini untuk tim internal. Jangan bagikan kredensial demo ke pihak luar.