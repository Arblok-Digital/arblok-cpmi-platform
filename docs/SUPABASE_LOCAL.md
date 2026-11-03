# Supabase Lokal (WSL) — Panduan Operasional

Dokumen ini adalah **sumber kebenaran** untuk menjalankan, menghubungkan, dan
mengubah database lokal project ini. Tujuannya agar agen/tim lain tidak menebak
port, container, atau nama project.

Terakhir diverifikasi: 2 November 2026, stack berjalan dengan CLI 2.122.0.

---

## 0. Identitas project (jangan diubah tanpa koordinasi)

| Item | Nilai |
|---|---|
| Project ID | `arblok-cpmi` |
| Workdir (Windows) | `C:\Users\ARBLOK\Documents\CPMI platfrom\arblok-cpmi-platform` |
| Workdir (WSL) | `/mnt/c/Users/ARBLOK/Documents/CPMI platfrom/arblok-cpmi-platform` |
| Container DB | `supabase_db_arblok-cpmi` |
| Container Auth | `supabase_auth_arblok-cpmi` |
| Container REST | `supabase_rest_arblok-cpmi` |
| Container Gateway | `supabase_kong_arblok-cpmi` |
| Volume | `supabase_db_arblok-cpmi` |
| Network | `supabase_network_arblok-cpmi` |
| Database | `postgres` (user `postgres`, password `postgres`) |
| DB URL | `postgresql://postgres:postgres@127.0.0.1:56322/postgres` |
| API URL | `http://127.0.0.1:56321` |

Nama workdir mengandung **spasi**. Selalu kutip path di shell.

---

## 1. Lingkungan yang dipakai

- Docker Engine berjalan **di dalam WSL (Ubuntu)**, bukan Docker Desktop.
- CLI yang benar: binary Linux `/usr/local/bin/supabase` + `/usr/local/bin/supabase-go`, versi **2.122.0**.
- CLI Windows di `C:\Users\ARBLOK\AppData\Roaming\npm\supabase` (2.106.0) **tidak bisa** menjangkau Docker di WSL. Jangan pakai `npx supabase` dari PowerShell/Git Bash untuk `start`/`stop`/`db reset`.
- Jalankan semua perintah Supabase dari dalam WSL:

```bash
wsl.exe -e bash -lc "cd '/mnt/c/Users/ARBLOK/Documents/CPMI platfrom/arblok-cpmi-platform' && supabase status"
```

---

## 2. Peta port (WAJIB unik per project)

| Port | Fungsi | Status |
|---|---|---|
| 56320 | Shadow DB (db diff/reset) | aktif internal |
| 56321 | API / Kong (REST, Auth, GraphQL) | aktif |
| 56322 | PostgreSQL | aktif |
| 56323 | Studio | belum dijalankan |
| 56324 | Inbucket (email lokal) | belum dijalankan |
| 56325 | SMTP | dikomentari di config |
| 56326 | POP3 | dikomentari di config |
| 56327 | Analytics | belum dijalankan |
| 56329 | Connection pooler | dinonaktifkan |

Blok port project lain di mesin ini — **jangan dipakai**:

| Project | API | DB | Shadow |
|---|---|---|---|
| `bengkel-pos` | 55321 | 55322 | 55320 |
| `fakturku` | 54321 | 54322 | 54320 |

Jika butuh port baru, ambil dari blok **5632x** yang belum terpakai, lalu ubah
`supabase/config.toml`, `supabase/README.md`, dan dokumen ini sekaligus.

---

## 3. Aturan isolasi (hard rules)

1. Satu project = satu `project_id` = satu volume + satu network + satu set container.
2. Jangan menyalin `config.toml` dari project lain tanpa mengganti `project_id` **dan** seluruh port.
3. Jangan mengubah `project_id` project ini. Mengubahnya membuat volume baru dan data lama seolah hilang.
4. Jangan memakai `docker stop`, `docker rm`, atau `docker restart` pada container project lain.
5. Jangan menjalankan `docker system prune`, apalagi dengan `--volumes`.
6. `supabase stop` hanya menghentikan project di direktori kerja saat ini. Jalankan dari folder project ini.
7. Jangan `supabase link` atau `supabase db push` tanpa instruksi eksplisit. Status saat ini **Not linked** dan tidak ada `project-ref`.
8. Jangan menaruh secret/service key di variabel `VITE_*`.

Cek kepemilikan container sebelum menyentuhnya:

```bash
docker inspect supabase_db_arblok-cpmi \
  --format '{{index .Config.Labels "com.supabase.cli.project"}} | {{index .Config.Labels "com.supabase.cli.workdir"}}'
# arblok-cpmi | /mnt/c/Users/ARBLOK/Documents/CPMI platfrom/arblok-cpmi-platform
```

---

## 4. Menjalankan stack

Service minimal (db, auth, rest, kong) — inilah yang dipakai sehari-hari dan
image-nya sudah ada di cache:

```bash
cd "/mnt/c/Users/ARBLOK/Documents/CPMI platfrom/arblok-cpmi-platform"
supabase start \
  -x studio,mailpit,imgproxy,edge-runtime,logflare,vector,supavisor,realtime,storage-api,postgres-meta
```

Seluruh service (butuh unduhan image besar: Storage, Realtime, Studio, dsb.):

```bash
supabase start
```

Hentikan **hanya** project ini:

```bash
supabase stop
```

Catatan WSL: VM dimatikan saat idle. Container ikut hidup lagi otomatis saat
perintah WSL berikutnya, tetapi butuh 5–20 detik sampai sehat. Data tetap ada di
volume. Jangan menganggap stack langsung siap setelah WSL bangun.

---

## 5. Migrasi dan reset

Sumber kebenaran schema adalah file SQL, bukan database:

```
supabase/migrations/0001_schema.sql   # 25 tabel, constraint, sequence
supabase/migrations/0002_rls.sql      # helper akses + RLS semua tabel
supabase/migrations/0003_rpc.sql      # 11 RPC transaksional
```

- Saat `supabase start` pertama kali, migrasi otomatis diterapkan.
- Setelah menambah/mengubah migrasi, terapkan ulang dari nol:

```bash
supabase db reset
```

`db reset` **menghapus data lokal project ini** lalu menjalankan ulang semua
migrasi (+ `seed.sql` bila ada). Tidak menyentuh project lain.

Alur perubahan schema:

1. Buat file baru bernomor, mis. `supabase/migrations/0004_add_x.sql`.
2. `supabase db reset`.
3. `npx vitest run src/lib/sql-backend.test.ts` (dari Windows atau WSL).
4. Verifikasi query di bagian 7.

Jangan mengubah database lewat psql/Studio sebagai satu-satunya sumber
perubahan; tulis ke migrasi.

---

## 6. Menghubungkan frontend

```bash
cd "/mnt/c/Users/ARBLOK/Documents/CPMI platfrom/arblok-cpmi-platform"
supabase status
```

Salin **Project URL** dan **Publishable key** (bukan Secret key) ke `.env.local`:

```
VITE_SUPABASE_URL=http://127.0.0.1:56321
VITE_SUPABASE_PUBLISHABLE_KEY=<publishable-key>
```

- `.env.local` sudah di-ignore oleh `.gitignore` (`*.local`, `.env.*`).
- Restart `npm run dev` setelah mengubah env.
- Tanpa dua variabel itu, aplikasi tetap di **Demo Mode** (`localStorage`).
- Kode koneksi: `src/lib/supabase.ts`, `src/lib/data/supabase-adapter.ts`.
- Secret key hanya untuk server/CLI. Jangan pernah masuk bundle browser.

Mengubah konfigurasi `[auth]` (mis. `site_url`) baru berlaku setelah restart:

```bash
supabase stop && supabase start -x ...
```

---

## 7. Verifikasi wajib setelah start

```bash
# 1. Status ringkas
supabase status

# 2. Endpoint hidup
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:56321/auth/v1/health   # 200
curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:56321/rest/v1/        # 200

# 3. Schema dan RLS
docker exec supabase_db_arblok-cpmi psql -h 127.0.0.1 -U postgres -d postgres -Atc \
  "select count(*) from information_schema.tables where table_schema='public'"    # 25

docker exec supabase_db_arblok-cpmi psql -h 127.0.0.1 -U postgres -d postgres -Atc \
  "select count(*) from pg_tables where schemaname='public' and rowsecurity"       # 25

docker exec supabase_db_arblok-cpmi psql -h 127.0.0.1 -U postgres -d postgres -Atc \
  "select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public'"  # 11
```

`psql` di dalam container **wajib** memakai `-h 127.0.0.1`; tanpa itu ia mencari
socket Unix yang tidak ada.

Uji isolasi silang (keduanya harus `0`):

```bash
# bengkel tidak boleh punya tabel kandidat kita
docker exec supabase_db_bengkel-pos psql -h 127.0.0.1 -U postgres -d postgres -Atc \
  "select count(*) from information_schema.tables where table_schema='public' and table_name='candidates'"

# kita tidak boleh punya tabel milik bengkel
docker exec supabase_db_arblok-cpmi psql -h 127.0.0.1 -U postgres -d postgres -Atc \
  "select count(*) from information_schema.tables where table_schema='public' and table_name='outlets'"
```

---

## 8. Troubleshooting

| Gejala | Penyebab | Tindakan |
|---|---|---|
| `container is not ready: starting` | WSL baru bangun / container restart | Tunggu 10–20 detik, ulangi `supabase status` |
| Pull macet di `Pulling fs layer` | Versi CLI meminta image berbeda | Pastikan CLI 2.122.0; image cache: postgres 17.11.0.006, gotrue 2.197.0, postgrest v16.5, kong 2.8.1 |
| `Cannot connect to the Docker daemon` | Perintah dijalankan dari Windows | Jalankan via `wsl.exe -e bash -lc "..."` |
| `port is already allocated` | Port dipakai proses/project lain | `ss -ltn | grep 5632`; pilih port kosong di blok 5632x, jangan memakai blok project lain |
| Auth restart loop | DB belum siap / config berubah | `docker logs supabase_auth_arblok-cpmi --tail 50`, lalu restart stack |
| `supabase status` kosong/error | Container sedang start | Tunggu, ulangi; cek `docker ps` |
| `Not linked` | Normal untuk lokal | Jangan `link`/`db push` tanpa instruksi |

Jangan memperbaiki masalah dengan menghapus volume, container project lain, atau
menjalankan prune.

---

## 9. Checklist sebelum menyerahkan pekerjaan

- [ ] `supabase status` menunjukkan project `arblok-cpmi` dan port 5632x.
- [ ] Auth health dan REST merespons 200.
- [ ] 25 tabel, 25 RLS aktif, 11 fungsi `public`.
- [ ] Uji isolasi silang menghasilkan `0` dan `0`.
- [ ] `npx vitest run` hijau.
- [ ] Tidak ada kredensial secret di file yang di-commit.
- [ ] `bengkel-pos` (dan project lain) tetap berjalan tanpa perubahan.

---

## 10. Referensi

- Konfigurasi: `supabase/config.toml`
- Migrasi: `supabase/migrations/`
- Ringkasan backend: `supabase/README.md`
- Klien & adapter: `src/lib/supabase.ts`, `src/lib/data/supabase-adapter.ts`
- Uji SQL: `src/lib/sql-backend.test.ts`
