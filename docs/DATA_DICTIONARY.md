# Data Dictionary — ARBLOK CPMI Platform (Pilot)

> Sumber kebenaran: `src/lib/types.ts` + `supabase/migrations/0001_schema.sql`.
> Semua tabel memiliki `organization_id` (tenant isolation) dan `created_at`/`updated_at`.

---

## 1. Identity & Tenancy

### `organizations` (public)
| Kolom | Tipe | Nullable | Default | Constraints | Deskripsi |
|---|---|---|---|---|---|
| id | uuid | N | gen_random_uuid() | PK | Tenant ID |
| legal_name | text | N | — | — | Nama legal P3MI |
| short_name | text | N | — | — | Nama singkat (UI) |
| slug | text | N | — | UNIQUE | URL-friendly identifier |
| status | text | N | 'onboarding' | CHECK (active,onboarding,suspended) | Status kerja sama |
| city | text | Y | — | — | Kota |
| province | text | Y | — | — | Provinsi |
| joined_at | timestamptz | N | now() | — | Bergabung |
| plan | text | N | 'pilot' | — | Paket langganan |
| contact_email | text | Y | — | — | Email operasional |
| quota | jsonb | N | '{}' | — | {storageUsedMb, storageLimitMb, dbUsedMb, dbLimitMb, members} |
| created_at | timestamptz | N | now() | — | |
| updated_at | timestamptz | N | now() | — | Trigger `set_updated_at` |

### `profiles` (public)
| Kolom | Tipe | Nullable | Default | Constraints | Deskripsi |
|---|---|---|---|---|---|
| user_id | uuid | N | — | PK, FK→auth.users(id) | Auth user ID |
| display_name | text | N | — | — | Nama tampil |
| phone | text | Y | — | — | Telepon |
| email | text | Y | — | — | Email (denormalisasi) |
| status | text | N | 'active' | CHECK (active,invited,suspended) | Status akun |
| created_at | timestamptz | N | now() | — | |
| updated_at | timestamptz | N | now() | — | Trigger |

### `organization_memberships` (public)
| Kolom | Tipe | Nullable | Default | Constraints | Deskripsi |
|---|---|---|---|---|---|
| id | uuid | N | gen_random_uuid() | PK | |
| organization_id | uuid | N | — | FK→organizations(id) | Tenant |
| user_id | uuid | N | — | FK→auth.users(id) | User |
| role | text | N | — | CHECK (6 roles) | Peran |
| status | text | N | 'active' | CHECK (active,invited,suspended) | Status keanggotaan |
| created_at | timestamptz | N | now() | — | |
| **UNIQUE** | (organization_id, user_id) | | | | Satu membership per org |

---

## 2. Agents & Agreements

### `agents` (public)
| Kolom | Tipe | Nullable | Default | Constraints | Deskripsi |
|---|---|---|---|---|---|
| id | uuid | N | gen_random_uuid() | PK | |
| organization_id | uuid | N | — | FK→organizations(id) | Tenant |
| user_id | uuid | Y | — | FK→auth.users(id) | Akun login agen |
| name | text | N | — | — | Nama agen |
| code | text | N | — | UNIQUE(org_id, code) | Kode agen (AGT-xxx) |
| region | text | N | — | — | Wilayah kerja |
| phone | text | Y | — | — | Telepon |
| status | text | N | 'pending' | CHECK (active,pending,inactive) | Status kemitraan |
| coordinator_id | uuid | Y | — | FK→agents(id) | Koordinator (self-ref) |
| joined_at | timestamptz | N | now() | — | Bergabung |
| agreement_number | text | Y | — | — | No. perjanjian |
| agreement_valid_until | date | Y | — | — | Berlaku sampai |
| note | text | Y | — | — | Catatan admin |
| created_at | timestamptz | N | now() | — | |

### `agent_agreements` (public) — Riwayat perjanjian
| Kolom | Tipe | Nullable | Default | Constraints | Deskripsi |
|---|---|---|---|---|---|
| id | uuid | N | gen_random_uuid() | PK | |
| organization_id | uuid | N | — | FK→organizations(id) | |
| agent_id | uuid | N | — | FK→agents(id) | |
| agreement_number | text | N | — | UNIQUE(org_id, agreement_number) | |
| valid_from | date | N | — | — | Mulai berlaku |
| valid_until | date | Y | — | — | Berakhir |
| storage_path | text | Y | — | — | Path dokumen (Supabase Storage) |
| status | text | N | 'active' | CHECK (draft,active,ended) | |
| created_at | timestamptz | N | now() | — | |

---

## 3. Vacancies

### `job_orders` (public) — Surat pesanan kerja (JO)
| Kolom | Tipe | Nullable | Default | Constraints | Deskripsi |
|---|---|---|---|---|---|
| id | uuid | N | gen_random_uuid() | PK | |
| organization_id | uuid | N | — | FK→organizations(id) | |
| reference_code | text | N | — | UNIQUE(org_id, reference_code) | Kode JO (JO-2026-XX-xxx) |
| country | text | N | — | — | Negara tujuan |
| sector | text | N | — | — | Sektor |
| employer_label | text | N | — | — | Label employer (boleh anonymized) |
| status | text | N | 'draft' | CHECK (draft,verified,closed) | |
| verified_at | timestamptz | Y | — | — | Tgl verifikasi |
| source_document_id | uuid | Y | — | — | Ref dokumen sumber |
| created_at | timestamptz | N | now() | — | |

### `vacancies` (public) — Lowongan per JO
| Kolom | Tipe | Nullable | Default | Constraints | Deskripsi |
|---|---|---|---|---|---|
| id | uuid | N | gen_random_uuid() | PK | |
| organization_id | uuid | N | — | FK→organizations(id) | |
| job_order_id | uuid | N | — | FK→job_orders(id) | |
| title | text | N | — | — | Judul lowongan |
| country | text | N | — | — | Negara |
| sector | text | N | — | — | Sektor |
| requirements | text[] | N | '{}' | — | Array syarat |
| wage_currency | text | N | 'IDR' | — | Mata uang upah |
| wage_min | numeric(14,2) | Y | — | — | Min upah |
| wage_max | numeric(14,2) | Y | — | — | Max upah |
| wage_type | text | N | 'bulanan' | CHECK (bulanan, per jam) | |
| published_at | timestamptz | Y | — | — | Tgl publish |
| status | text | N | 'draft' | CHECK (published,draft,closed) | |
| slots | int | N | 0 | CHECK (>=0) | Kuota |
| created_at | timestamptz | N | now() | — | |

---

## 4. Candidates, Consents, Referrals

### `candidates` (public) — **Tabel sentral**
| Kolom | Tipe | Nullable | Default | Constraints | Deskripsi |
|---|---|---|---|---|---|
| id | uuid | N | gen_random_uuid() | PK | |
| organization_id | uuid | N | — | FK→organizations(id) | Tenant |
| account_id | uuid | Y | — | FK→auth.users(id) | Login CPMI (opsional) |
| full_name | text | N | — | — | Nama lengkap |
| nickname | text | Y | — | — | Nama panggilan |
| phone | text | N | — | — | Telepon asli input |
| phone_normalized | text | N | — | — | `normalizePhone()` → 62xx (dedup key) |
| birth_date | date | Y | — | — | Tgl lahir |
| gender | text | Y | — | CHECK (P,L) | Jenis kelamin |
| education | text | Y | — | — | Pendidikan terakhir |
| region | text | N | — | — | Wilayah (kota/kab) |
| address | text | Y | — | — | Alamat domisili |
| status | text | N | 'lead_registered' | CHECK (19 status) | **Pipeline utama** |
| branch_status | text | Y | — | CHECK (5 status) | Status cabang (on_hold, revision_required, rejected, withdrawn, closed) |
| branch_reason | text | Y | — | — | Alasan cabang |
| agent_id | uuid | Y | — | FK→agents(id) | Agen sumber |
| created_at | timestamptz | N | now() | — | Dibuat |
| created_by | uuid | Y | — | — | User pembuat |
| source | text | N | 'agent' | CHECK (agent,p3mi,walk_in) | Sumber |
| internal_note | text | Y | — | — | Catatan internal P3MI |
| last_activity_at | timestamptz | N | now() | — | Terakhir aktif (sorting) |
| candidate_code | text | N | — | UNIQUE | Kode kandidat (CP-YYYY-NNNNN) |

**19 Pipeline Status (urutan):**
1. `lead_registered` — Lead terdaftar
2. `referral_acknowledged` — Referral dikui P3MI
3. `office_visit_confirmed` — Kunjungan kantor terkonfirmasi
4. `initial_verification` — Verifikasi awal
5. `candidate_screening` — Screening kandidat
6. `job_matching` — Pencocokan lowongan
7. `overseas_partner_review` — Review mitra luar
8. `employer_selection` — Seleksi employer
9. `employer_approved` — Disetujui employer
10. `placement_agreement` — Perjanjian penempatan
11. `employment_contract` — Kontrak kerja
12. `visa_work_permit` — Visa/izin kerja
13. `pre_departure` — Pra-berangkatan
14. `departure_approved` — Berangkat disetujui
15. `departed` — **Sudah diberangkatkan** → milestone `departed`
16. `arrived` — Tiba tujuan
17. `employer_handover` — **Serah terima employer** → milestone `handover`
18. `working` — **Mulai bekerja (30 hari)** → milestone `working`
19. `monitoring` — Pemantauan pasca penempatan

**5 Branch Status:**
- `on_hold` — Ditunda
- `revision_required` — Perlu revisi dokumen
- `rejected` — Ditolak
- `withdrawn` — Ditarik kandidat
- `closed` — Selesai/tutup

### `candidate_consents` (public)
| Kolom | Tipe | Nullable | Default | Constraints | Deskripsi |
|---|---|---|---|---|---|
| id | uuid | N | gen_random_uuid() | PK | |
| candidate_id | uuid | N | — | FK→candidates(id) | |
| organization_id | uuid | N | — | FK→organizations(id) | |
| consent_type | text | N | — | CHECK (data_processing, data_sharing) | Jenis consent |
| purpose | text | N | — | — | Tujuan pemrosesan |
| recipient | text | N | — | — | Penerima data |
| notice_version | text | N | — | — | Versi kebijakan privasi |
| consented_at | timestamptz | N | now() | — | Waktu consent |
| revoked_at | timestamptz | Y | — | — | Waktu tarik consent |
| evidence | text | N | — | — | Bukti consent (teks) |
| recorded_by | uuid | Y | — | — | User pencatat |
| created_at | timestamptz | N | now() | — | |
| **UNIQUE** | (candidate_id, consent_type, notice_version) | | | | Versi per notice |

### `referrals` (public)
| Kolom | Tipe | Nullable | Default | Constraints | Deskripsi |
|---|---|---|---|---|---|
| id | uuid | N | gen_random_uuid() | PK | |
| organization_id | uuid | N | — | FK→organizations(id) | |
| candidate_id | uuid | N | — | FK→candidates(id) | |
| agent_id | uuid | N | — | FK→agents(id) | Agen pembuat |
| vacancy_id | uuid | Y | — | FK→vacancies(id) | Lowongan (opsional) |
| code | text | N | — | UNIQUE | Kode referral (RF-YYYY-NNNNNN) |
| submitted_at | timestamptz | Y | — | — | Diajukan |
| accepted_at | timestamptz | Y | — | — | Diterima P3MI |
| decided_at | timestamptz | Y | — | — | Keputusan final |
| status | text | N | 'submitted' | CHECK (draft,submitted,accepted,rejected,disputed,withdrawn) | |
| rejection_reason | text | Y | — | — | Alasan tolak/dispute |
| duplicate_of_id | uuid | Y | — | FK→candidates(id) | Kandidat duplikat (phone match) |
| duplicate_warning | boolean | N | false | — | Flag duplikat |
| attribution_locked | boolean | N | false | — | Sumber terkunci setelah accepted |
| created_at | timestamptz | N | now() | — | |

### `referral_events` (public) — Audit trail referral
| Kolom | Tipe | Nullable | Default | Constraints | Deskripsi |
|---|---|---|---|---|---|
| id | uuid | N | gen_random_uuid() | PK | |
| referral_id | uuid | N | — | FK→referrals(id) | |
| event_type | text | N | — | CHECK (7 jenis) | submitted, duplicate_warning, accepted, rejected, disputed, withdrawn, source_locked |
| actor_user_id | uuid | Y | — | — | Aktor |
| actor_name | text | Y | — | — | Nama aktor |
| reason | text | Y | — | — | Alasan |
| metadata | jsonb | Y | — | — | Data tambahan |
| created_at | timestamptz | N | now() | — | |

### `referral_disputes` (public)
| Kolom | Tipe | Nullable | Default | Constraints | Deskripsi |
|---|---|---|---|---|---|
| id | uuid | N | gen_random_uuid() | PK | |
| referral_id | uuid | N | — | FK→referrals(id) | |
| organization_id | uuid | N | — | FK→organizations(id) | |
| opened_by | uuid | Y | — | — | User pembuka |
| reason | text | N | — | — | Alasan dispute |
| evidence_path | text | Y | — | — | Path bukti |
| status | text | N | 'open' | CHECK (open,resolved,rejected) | |
| resolved_by | uuid | Y | — | — | User resolver |
| resolution | text | Y | — | — | Ringkasan resolusi |
| created_at | timestamptz | N | now() | — | |
| resolved_at | timestamptz | Y | — | — | |

---

## 5. Visits & Handovers

### `visits` (public) — Kunjungan ke kantor P3MI
| Kolom | Tipe | Nullable | Default | Constraints | Deskripsi |
|---|---|---|---|---|---|
| id | uuid | N | gen_random_uuid() | PK | |
| organization_id | uuid | N | — | FK→organizations(id) | |
| candidate_id | uuid | N | — | FK→candidates(id) | |
| referral_id | uuid | Y | — | FK→referrals(id) | |
| scheduled_at | timestamptz | N | — | — | Jadwal |
| location_label | text | N | — | — | Label lokasi |
| status | text | N | 'proposed' | CHECK (proposed,confirmed,attended,no_show,cancelled) | |
| confirmed_by | uuid | Y | — | — | User konfirmasi |
| notes | text | Y | — | — | Catatan |
| created_by | uuid | Y | — | — | User pembuat |
| created_at | timestamptz | N | now() | — | |

### `handovers` (public) — Serah terima antar agen
| Kolom | Tipe | Nullable | Default | Constraints | Deskripsi |
|---|---|---|---|---|---|
| id | uuid | N | gen_random_uuid() | PK | |
| organization_id | uuid | N | — | FK→organizations(id) | |
| candidate_id | uuid | N | — | FK→candidates(id) | |
| referral_id | uuid | N | — | FK→referrals(id) | |
| from_agent_id | uuid | N | — | FK→agents(id) | Agen asal |
| received_by | uuid | Y | — | — | User penerima (P3MI) |
| requested_at | timestamptz | N | now() | — | Diminta |
| accepted_at | timestamptz | Y | — | — | Diterima |
| proof_reference | text | Y | — | — | Ref bukti (foto/dok) |
| notes | text | Y | — | — | Catatan |
| status | text | N | 'requested' | CHECK (requested,accepted,declined) | |
| created_at | timestamptz | N | now() | — | |

---

## 6. Documents

### `candidate_documents` (public)
| Kolom | Tipe | Nullable | Default | Constraints | Deskripsi |
|---|---|---|---|---|---|
| id | uuid | N | gen_random_uuid() | PK | |
| candidate_id | uuid | N | — | FK→candidates(id) | |
| organization_id | uuid | N | — | FK→organizations(id) | |
| document_type | text | N | — | CHECK (7 jenis) | ktp, kartu_keluarga, ijazah, skck, paspor, foto, sertifikat |
| file_name | text | N | — | — | Nama file asli |
| storage_path | text | N | — | — | Path Supabase Storage |
| mime_type | text | N | — | CHECK (pdf, jpeg, png) | |
| size_bytes | bigint | N | — | CHECK (>0 AND <=3145728) | Max 3MB |
| sha256 | text | Y | — | — | Hash integritas |
| version | int | N | — | CHECK (>0) | Versi dokumen |
| status | text | N | 'pending_review' | CHECK (uploaded,pending_review,approved,revision_required,rejected) | |
| uploaded_by | uuid | Y | — | — | User uploader |
| uploaded_at | timestamptz | N | now() | — | |
| reviewed_at | timestamptz | Y | — | — | Tgl review |
| is_dummy | boolean | N | true | — | **Demo: true (tidak simpan fisik)** |
| **UNIQUE** | (candidate_id, document_type, version) | | | | Satu versi per tipe |

### `document_reviews` (public)
| Kolom | Tipe | Nullable | Default | Constraints | Deskripsi |
|---|---|---|---|---|---|
| id | uuid | N | gen_random_uuid() | PK | |
| document_id | uuid | N | — | FK→candidate_documents(id) | |
| reviewer_user_id | uuid | Y | — | — | Reviewer |
| reviewer_name | text | Y | — | — | Nama reviewer |
| decision | text | N | — | CHECK (approved,revision_required,rejected) | |
| reason | text | Y | — | — | Alasan |
| created_at | timestamptz | N | now() | — | |

### `candidate_status_events` (public) — Riwayat status pipeline
| Kolom | Tipe | Nullable | Default | Constraints | Deskripsi |
|---|---|---|---|---|---|
| id | uuid | N | gen_random_uuid() | PK | |
| candidate_id | uuid | N | — | FK→candidates(id) | |
| organization_id | uuid | N | — | FK→organizations(id) | |
| from_status | text | Y | — | — | Status asal |
| to_status | text | N | — | — | Status tujuan (pipeline/branch) |
| actor_user_id | uuid | Y | — | — | Aktor |
| actor_name | text | Y | — | — | Nama aktor |
| reason | text | Y | — | — | Alasan |
| visibility | text | N | 'candidate' | CHECK (internal,candidate) | Visibilitas CPMI |
| created_at | timestamptz | N | now() | — | |

---

## 7. Commission

### `commission_agreements` (public) — Skema fee per agen
| Kolom | Tipe | Nullable | Default | Constraints | Deskripsi |
|---|---|---|---|---|---|
| id | uuid | N | gen_random_uuid() | PK | |
| organization_id | uuid | N | — | FK→organizations(id) | |
| agent_id | uuid | N | — | FK→agents(id) | |
| agreement_number | text | N | — | UNIQUE(org_id, agreement_number) | |
| agreement_type | text | N | 'fixed' | CHECK (fixed,tiered) | Tipe skema |
| trigger_definition | text | N | — | — | Definisi trigger fee |
| milestones | jsonb | N | '[]' | — | Array {code,label,amount,currency} |
| valid_from | date | N | — | — | Berlaku dari |
| valid_until | date | Y | — | — | Berlaku sampai |
| status | text | N | 'draft' | CHECK (draft,active,ended) | |
| document_path | text | Y | — | — | Path perjanjian |
| signed_at | timestamptz | Y | — | — | Tgl tanda tangan |
| created_at | timestamptz | N | now() | — | |

**Milestone Codes (trigger fee):**
- `handover` → status `employer_handover`
- `departed` → status `departed`
- `working` → status `working`

### `commission_ledger` (public) — Hak tagih per milestone
| Kolom | Tipe | Nullable | Default | Constraints | Deskripsi |
|---|---|---|---|---|---|
| id | uuid | N | gen_random_uuid() | PK | |
| organization_id | uuid | N | — | FK→organizations(id) | |
| agreement_id | uuid | N | — | FK→commission_agreements(id) | |
| referral_id | uuid | N | — | FK→referrals(id) | |
| agent_id | uuid | N | — | FK→agents(id) | |
| code | text | N | — | UNIQUE(org_id, code) | Kode ledger (KMS-YYYY-NNNNN) |
| milestone_code | text | N | — | — | handover/departed/working |
| label | text | N | — | — | Deskripsi (milestone + nama kandidat) |
| amount | numeric(14,2) | N | — | CHECK (>=0) | Nominal fee |
| currency | text | N | 'IDR' | — | Mata uang |
| earned_at | timestamptz | N | now() | — | Jadi hak tagih |
| due_at | timestamptz | Y | — | — | Jatuh tempo (default +14 hari) |
| status | text | N | 'earned' | CHECK (11 status) | pending,earned,submitted,under_review,approved,due,partially_paid,paid,disputed,cancelled |
| paid_amount | numeric(14,2) | N | 0 | CHECK (0..amount) | Terbayar |
| source_event_id | uuid | Y | — | — | Ref status_event trigger |
| note | text | Y | — | — | Catatan |
| created_at | timestamptz | N | now() | — | |
| **UNIQUE** | (agreement_id, referral_id, milestone_code) | | | | **Idempotency key** |

### `commission_payments` (public) — Pembayaran yang dicatat
| Kolom | Tipe | Nullable | Default | Constraints | Deskripsi |
|---|---|---|---|---|---|
| id | uuid | N | gen_random_uuid() | PK | |
| organization_id | uuid | N | — | FK→organizations(id) | |
| agent_id | uuid | N | — | FK→agents(id) | |
| reference | text | N | — | UNIQUE(org_id, reference) | No. pembayaran (BAYAR-YYYY-NNNN) |
| paid_at | timestamptz | N | — | — | Tanggal bayar |
| amount | numeric(14,2) | N | — | CHECK (>0) | Total bayar |
| currency | text | N | 'IDR' | — | |
| recorded_by | uuid | Y | — | — | Admin P3MI |
| proof_path | text | Y | — | — | Path bukti transfer |
| created_at | timestamptz | N | now() | — | |

### `commission_payment_allocations` (public) — Alokasi FIFO
| Kolom | Tipe | Nullable | Default | Constraints | Deskripsi |
|---|---|---|---|---|---|
| id | uuid | N | gen_random_uuid() | PK | |
| payment_id | uuid | N | — | FK→commission_payments(id) | |
| ledger_id | uuid | N | — | FK→commission_ledger(id) | |
| allocated_amount | numeric(14,2) | N | — | CHECK (>0) | Jumlah alokasi |
| created_at | timestamptz | N | now() | — | |
| **UNIQUE** | (payment_id, ledger_id) | | | | Satu alokasi per ledger per bayar |

---

## 8. Complaints, Notifications, Audit

### `complaints` (public)
| Kolom | Tipe | Nullable | Default | Constraints | Deskripsi |
|---|---|---|---|---|---|
| id | uuid | N | gen_random_uuid() | PK | |
| organization_id | uuid | N | — | FK→organizations(id) | |
| candidate_id | uuid | N | — | FK→candidates(id) | |
| code | text | N | — | UNIQUE(org_id, code) | Kode (ADU-YYYY-NNNNNN) |
| category | text | N | — | CHECK (biaya,dokumen,jadwal,komunikasi,lainnya) | |
| description | text | N | — | — | Uraian |
| urgency | text | N | 'medium' | CHECK (low,medium,high) | |
| status | text | N | 'open' | CHECK (open,in_progress,resolved,closed) | |
| assigned_to | uuid | Y | — | — | P3MI penangan |
| resolution | text | Y | — | — | Ringkasan penyelesaian |
| created_at | timestamptz | N | now() | — | |
| created_by | uuid | Y | — | — | Pelapor |
| created_by_name | text | Y | — | — | Nama pelapor |
| resolved_at | timestamptz | Y | — | — | Tgl selesai |

### `notifications` (public) — In-app notifikasi
| Kolom | Tipe | Nullable | Default | Constraints | Deskripsi |
|---|---|---|---|---|---|
| id | uuid | N | gen_random_uuid() | PK | |
| user_id | uuid | N | — | FK→auth.users(id) | Penerima |
| organization_id | uuid | N | — | FK→organizations(id) | |
| title | text | N | — | — | Judul |
| body | text | N | — | — | Isi |
| link_path | text | Y | — | — | Deep link |
| read_at | timestamptz | Y | — | — | Dibaca |
| kind | text | N | 'info' | CHECK (info,action,success,warning) | Tipe |
| created_at | timestamptz | N | now() | — | |

### `audit_events` (public) — Audit trail platform
| Kolom | Tipe | Nullable | Default | Constraints | Deskripsi |
|---|---|---|---|---|---|
| id | uuid | N | gen_random_uuid() | PK | |
| organization_id | uuid | Y | — | FK→organizations(id) | Null = platform-wide |
| actor_user_id | uuid | Y | — | — | Aktor |
| actor_name | text | Y | — | — | Nama aktor |
| action | text | N | — | — | Aksi (dot notation: referral.submitted, document.view, dll.) |
| entity_type | text | N | — | — | Tipe entitas |
| entity_id | text | Y | — | — | ID entitas |
| entity_label | text | Y | — | — | Label readable |
| metadata | jsonb | Y | — | — | Detail tambahan |
| created_at | timestamptz | N | now() | — | |

### `data_access_events` (public) — Log akses dokumen (wajib alasan)
| Kolom | Tipe | Nullable | Default | Constraints | Deskripsi |
|---|---|---|---|---|---|
| id | uuid | N | gen_random_uuid() | PK | |
| organization_id | uuid | N | — | FK→organizations(id) | |
| actor_user_id | uuid | Y | — | — | Aktor |
| actor_name | text | Y | — | — | Nama aktor |
| candidate_id | uuid | N | — | FK→candidates(id) | |
| document_id | uuid | N | — | FK→candidate_documents(id) | |
| action | text | N | — | CHECK (view,download) | |
| reason | text | N | — | — | **Wajib diisi** |
| created_at | timestamptz | N | now() | — | |

---

## 9. Helper Functions (app schema)

| Fungsi | Deskripsi |
|---|---|
| `app.next_code(prefix, seq, pad)` | Generate kode berurutan (RF-, CP-, KMS-, BAYAR-, ADU-) |
| `app.normalize_phone(p)` | '08xx'→'628xx', '8xx'→'628xx', strip non-digit |
| `app.set_updated_at()` | Trigger update `updated_at` = now() |
| `app.current_user_id()` | `auth.uid()` (security definer) |
| `app.org_role(p_org)` | Role user di org tertentu |
| `app.is_org_member(p_org)` | Boolean member aktif |
| `app.is_p3mi(p_org)` | Boolean role p3mi_admin/reviewer |
| `app.is_p3mi_admin(p_org)` | Boolean role p3mi_admin |
| `app.is_platform_admin()` | Boolean role arblok_admin (cross-org) |
| `app.shares_org(p_user)` | Boolean same org dengan current user |
| `app.agent_id_for(p_org)` | Agent ID milik current user di org |
| `app.is_coordinator_of(p_agent)` | Boolean current user koordinator agent tsb |
| `app.can_access_candidate(p_candidate)` | Boolean akses kandidat (P3MI/owner/agent/coordinator) |
| `app.can_access_referral(p_referral)` | Boolean akses referral |
| `app.can_access_document(p_document)` | Boolean akses dokumen (via kandidat) |

---

## 10. RPC Transaksional (public schema)

| RPC | Deskripsi |
|---|---|
| `create_referral(...)` | Buat kandidat + 2 consent + referral + events + audit + notif |
| `respond_referral(p_referral_id, p_decision, p_reason)` | Accept/reject/dispute referral → update pipeline, lock attribution |
| `transition_candidate_status(p_candidate_id, p_to_status, p_reason)` | P3MI update status 19-tahap → auto create ledger di milestone |
| `review_candidate_document(p_document_id, p_decision, p_reason)` | Approve/revision/reject dokumen → update branch_status |
| `log_document_access(p_document_id, p_action, p_reason)` | Catat view/download + audit (wajib alasan) |
| `approve_commission_entry(p_entry_id)` | Admin P3MI approve ledger (earned→approved) |
| `record_commission_payment(p_agent_id, p_amount, p_reference, p_paid_at)` | FIFO allocation ke ledger terbuka |
| `set_visit_status(p_visit_id, p_status, p_notes)` | P3MI update jadwal kunjungan |
| `respond_handover(p_handover_id, p_accept, p_proof_reference)` | P3MI terima/tolak serah terima agen |
| `create_complaint(p_candidate_id, p_category, p_urgency, p_description)` | Agent/CPMI buat pengaduan → assign ke P3MI |
| `update_complaint(p_complaint_id, p_status, p_resolution)` | P3MI tindaklanjuti pengaduan |

---

## 11. Seed Data Keys (Pilot)

| Entity | IDs | Count |
|---|---|---|
| Organizations | `org-bhayangkara`, `org-karya` | 2 |
| Accounts | `acc-arblok`, `acc-p3mi`, `acc-reviewer`, `acc-coord`, `acc-agent-asep`, `acc-agent-neng`, `acc-cpmi-siti` | 7 |
| Agents | `ag-coord`, `ag-asep`, `ag-neng`, `ag-enceng` | 4 |
| Job Orders | `jo-jp-care`, `jo-tw-manuf`, `jo-my-sawit`, `jo-hk-dom` | 4 |
| Vacancies | `vac-care-jp`, `vac-manuf-tw`, `vac-sawit-my`, `vac-dom-hk` | 4 |
| Candidates | `cand-siti`, `cand-rina`, `cand-diah`, `cand-wulan`, `cand-nengyul`, `cand-ai`, `cand-euis`, `cand-tuti`, `cand-iis`, `cand-mira`, `cand-nuraeni`, `cand-yani`, `cand-eni` | 13 |
| Referrals | `ref-cand-*` (13) | 13 |
| Commission Agreements | `ca-asep`, `ca-neng` | 2 |
| Ledger Entries | `kms-ai-handover`, `kms-ai-departed`, `kms-tuti-handover`, `kms-tuti-departed`, `kms-tuti-working`, `kms-mira-handover` | 6 |
| Payments | `pay-2026-0041`, `pay-2026-0031`, `pay-2026-0033` | 3 |
| Complaints | `cmp-001`, `cmp-002` | 2 |
| Documents | `doc-siti-ktp`, `doc-siti-ijazah`, `doc-siti-skck`, `doc-siti-foto`, `doc-rina-ktp`, `doc-rina-ijazah`, `doc-diah-ktp`, `doc-diah-ijazah`, `doc-iis-ktp`, `doc-iis-ijazah`, `doc-mira-ktp`, `doc-mira-paspor`, `doc-nuraeni-paspor` | 13 |

---

**Catatan:** Dictionary ini sinkron dengan migrasi SQL. Perubahan schema → update migrasi + dictionary ini + `src/lib/types.ts`.