# Catatan Privasi & Kepatuhan — ARBLOK CPMI Platform (Pilot)

> **Status:** DRAFT — Wajib ditinjau Legal & DPO sebelum produksi dengan data nyata.

## 1. Prinsip Dasar

| Prinsip | Implementasi Pilot | Catatan Produksi |
|---|---|---|
| **Data Minimization** | Hanya field operasional (nama, telp, wilayah, status) | Tinjau setiap field: apakah benar diperlukan? |
| **Purpose Limitation** | Consent terpisah: `data_processing` + `data_sharing` | Konsentemen spesifik per tujuan; tidak *bundling* |
| **Storage Limitation** | `localStorage` perangkat; Supabase lokal (WSL) | Retensi: min. 5 tahun audit, dokumen per SOP+UU PDP |
| **Integrity & Confidentiality** | RLS per tenant; dokumen akses butuh alasan | Enkripsi at-rest + in-transit; bucket privat + signed URL |
| **Accountability** | Audit trail append-only; access log wajib alasan | DPIA, ROPA, DPO assignment, breach notification SOP |

## 2. Data Pribadi yang Diproses (Pilot)

| Kategori | Field | Sumber | Retensi Usulan | Catatan |
|---|---|---|---|---|
| Identitas | `full_name`, `nickname`, `birth_date`, `gender` | Kandidat (via agen) | 5 thn setelah proses selesai | Nama lengkap wajib; nickname opsional |
| Kontak | `phone`, `email` (akun), `address` | Kandidat / Agen | 5 thn | Phone dinormalisasi (62xx) untuk dedup |
| Pendidikan | `education` | Kandidat | 5 thn | Pilihan terbatas (SD–S3) |
| Proses | `status`, `branch_status`, `region`, `agent_id` | Sistem (P3MI/Agen) | 5 thn | Status pipeline 19 tahap + 5 cabang |
| Consent | `consent_type`, `purpose`, `recipient`, `notice_version`, `consented_at`, `revoked_at` | Kandidat (onboarding) | 5 thn + audit | Ganda: processing + sharing; revokasi dijeda |
| Dokumen | `document_type`, `file_name`, `mime_type`, `size_bytes`, `sha256`, `version`, `status` | Kandidat upload / P3MI scan | Sesuai SOP + UU PDP | **Demo: dummy, tidak disimpan fisik** |
| Finansial | `amount`, `currency`, `paid_amount`, `milestone_code` | P3MI (fee agreement) | 10 thn (pajak) | Komisi per milestone; FIFO allocation |
| Audit | `action`, `entity_type`, `entity_id`, `actor_name`, `metadata`, `created_at` | Sistem (otomatis) | ≥ 5 thn | Append-only; tidak bisa dihapus UI |
| Akses Dokumen | `action` (view/download), `reason`, `candidate_id`, `document_id` | Pengguna (manual) | ≥ 5 thn | Wajib alasan; log terpisah dari audit umum |

## 3. Legal Basis (UU PDP / GDPR-inspired)

| Aktivitas | Legal Basis Pilot | Legal Basis Produksi (Usulan) |
|---|---|---|
| Referral intake + profil kandidat | **Consent** (explicit, ganda) | Consent + *Legitimate Interest* (kontrak agen–P3MI) |
| Pembagian data ke P3MI | **Consent** (terpisah) | Consent + *Contract Performance* |
| Status pipeline & notifikasi | **Legitimate Interest** (operasional) | Contract Performance + Legitimate Interest |
| Fee ledger & pembayaran | **Contract** (perjanjian komisi) | Contract + *Legal Obligation* (pajak) |
| Audit & access log | **Legal Obligation** (keamanan) | Legal Obligation + Legitimate Interest |
| Pengaduan | **Legitimate Interest** (proteksi hak) | Legitimate Interest + Consent (opsional) |

> **Peringatan:** Pilot memakai *consent* sebagai basis utama untuk keamanan. Produksi perlu matriks *legal basis* per aktivitas + *Record of Processing Activities (ROPA)*.

## 4. Hak Subjek Data (UU PDP Ps. 5–14)

| Hak | Implementasi Pilot | Gap ke Produksi |
|---|---|---|
| **Akses** | CPMI lihat data sendiri di `/cpmi/data` | Ekspor portable (JSON/CSV) lengkap |
| **Koreksi** | CPMI edit phone/address/education/region | Workflow verifikasi P3MI untuk field inti (nama, tgl lahir) |
| **Penghapusan** | Tidak ada (hanya revoke consent) | Prosedur *Right to be Forgotten* + pengecualian retensi hukum |
| **Portabilitas** | Ekspor JSON tenant (admin P3MI) | Format standar (JSON/CSV) + API |
| **Keberatan** | Revoke consent → proses dijeda | Proses *objection handling* formal |
| **Otomasi** | Tidak ada keputusan otomatis | Pastikan tidak ada *profiling* signifikan tanpa human-in-the-loop |

## 5. Consent Management

- **Dua jenis consent** per kandidat:
  1. `data_processing` — pemrosesan internal P3MI
  2. `data_sharing` — pembagian ke P3MI (pihak ketiga)
- **Notice version** dicatat (versi kebijakan privasi saat consent)
- **Evidence** teks bukti consent (demo: string statis)
- **Revokasi** → `revoked_at` diset, proses dijeda, audit tetap
- **Tidak ada** *granular consent* per field (produksi: pertimbangkan)

## 6. Keamanan Teknis

| Layer | Pilot | Produksi Target |
|---|---|---|
| **Transport** | HTTPS (dev: localhost, prod: TLS 1.3) | TLS 1.3, HSTS, CSP ketat |
| **Auth** | Demo password statis / Supabase Auth | Supabase Auth + MFA (admin), passwordless (opsional) |
| **Authorization** | RLS (Supabase) / client-side guards (demo) | RLS + API gateway + WAF |
| **Data at Rest** | localStorage / PostgreSQL lokal | PostgreSQL + TDE / Supabase managed |
| **Dokumen** | Dummy (tidak disimpan) | Private bucket + signed URL (TTL 15 menit), virus scan |
| **Audit** | Memori + localStorage / tabel `audit_events` | Append-only log (immutable), SIEM integration |
| **Backup** | Manual export JSON | Otomatis harian + point-in-time recovery (PITR) |
| **Incident** | Manual | Runbook breach notification ≤ 72 jam (UU PDP) |

## 7. Retensi & Penghapusan (Usulan)

| Data | Retensi Minimal | Trigger Penghapusan | Metode |
|---|---|---|---|
| Audit events | 5 tahun | Masa retensi berakhir | Soft delete → purge batch bulanan |
| Access log dokumen | 5 tahun | Masa retensi berakhir | Sama |
| Dokumen kandidat | Per SOP P3MI + UU PDP | Proses selesai + retensi hukum | Hapus file storage + DB reference |
| Fee ledger | 10 tahun (pajak) | Masa retensi berakhir | Arsip cold storage |
| Profil kandidat | 5 tahun setelah status `monitoring`/`closed` | Retensi berakhir | Anonimisasi atau hapus |
| Consent record | 5 tahun + audit | Retensi berakhir | Arsip |

> **Catatan:** Retensi harus disepakati dengan P3MI & Legal. Jangan hapus data yang masih dalam sengketa/pengadilan.

## 8. Transfer Data (Cross-border)

- Pilot: Tidak ada (semua lokal Indonesia)
- Produksi: Jika employer luar negeri (Jepang, Taiwan, Malaysia, HK)
  - Perlu *Standard Contractual Clauses* (SCC) / *Adequacy Decision*
  - Catat di ROPA: negara tujuan, mekanisme transfer, DPIA jika high-risk

## 9. Third Parties (Pilot)

| Pihak | Peran | Data Diberikan | Perjanjian |
|---|---|---|---|
| Supabase (lokal) | Database/Auth | Semua data operasional | DPA (Data Processing Addendum) — lokal WSL tidak perlu |
| Docker/WSL | Runtime | Tidak ada data aplikasi | N/A |
| FontSource / CDN | Font | Tidak ada data pribadi | N/A |

Produksi: Cloud Supabase / AWS / GCP → wajib DPA + SCC.

## 10. DPIA (Data Protection Impact Assessment)

**Pilot:** Tidak diperlukan (data sintetis, skala kecil, lokal).
**Produksi:** **WAJIB** sebelum go-live karena:
- Pemrosesan skala besar data sensitif (pekerja migran)
- Profiling/penilaian otomatis (matching vacancy, fee calculation)
- Monitoring sistematik (pipeline 19 tahap, akses dokumen)
- Transfer cross-border (employer luar negeri)

Langkah DPIA:
1. Deskripsi pemrosesan (flowchart data)
2. Ases kebutuhan & proporsionalitas
3. Identifikasi risiko (kebakaran, kebocoran, penyalahgunaan, diskriminasi)
4. Mitigasi (enkripsi, akses minimal, audit, training)
5. Konsultasi DPO & subjek data (sampel)
6. Dokumentasi & persetujuan manajemen

## 11. Checklist Go-Live (Privacy Gate)

- [ ] DPIA selesai & disetujui
- [ ] ROPA terisi lengkap
- [ ] DPA dengan semua processor (Supabase cloud, dll.) ditandatangani
- [ ] Kebijakan privasi *published* & *versioned* (notice_version)
- [ ] Consent form terpisah processing vs sharing, bahasa Indonesia jelas
- [ ] Prosedur hak subjek (akses, koreksi, hapus, portabilitas, keberatan) terdokumentasi & diuji
- [ ] Retensi schedule disepakati Legal & P3MI
- [ ] Breach notification runbook (≤ 72 jam) siap
- [ ] Security: MFA admin, bucket privat, signed URL, virus scan, CSP, rate limit
- [ ] Penetration test / vulnerability scan bersih
- [ ] Training tim ops (P3MI admin, reviewer, agen) selesai
- [ ] Data sintetis **dihapus total** dari lingkungan produksi

---

**Disclaimer:** Dokumen ini **bukan nasihat hukum**. Konsultasikan dengan Legal Counsel & DPO sebelum produksi. Pilot ini hanya demonstrasi arsitektur, bukan sistem siap regulasi.