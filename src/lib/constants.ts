import type {
  BranchStatus,
  CandidateStatus,
  ComplaintStatus,
  DocumentStatus,
  DocumentTypeId,
  LedgerStatus,
  ReferralStatus,
  Role,
} from './types'

export const DEMO_PASSWORD = 'demo1234'

export const ROLE_LABELS: Record<Role, string> = {
  arblok_admin: 'Admin Arblok',
  p3mi_admin: 'Admin P3MI',
  p3mi_reviewer: 'Reviewer P3MI',
  agent_coordinator: 'Koordinator Agen',
  agent: 'Agen Lokal',
  cpmi: 'CPMI',
}

export const ROLE_SHORT: Record<Role, string> = {
  arblok_admin: 'Arblok',
  p3mi_admin: 'P3MI Admin',
  p3mi_reviewer: 'Reviewer',
  agent_coordinator: 'Koordinator',
  agent: 'Agen',
  cpmi: 'CPMI',
}

export const STATUS_ORDER: CandidateStatus[] = [
  'lead_registered',
  'referral_acknowledged',
  'office_visit_confirmed',
  'initial_verification',
  'candidate_screening',
  'job_matching',
  'overseas_partner_review',
  'employer_selection',
  'employer_approved',
  'placement_agreement',
  'employment_contract',
  'visa_work_permit',
  'pre_departure',
  'departure_approved',
  'departed',
  'arrived',
  'employer_handover',
  'working',
  'monitoring',
]

export type StatusGroupId =
  | 'registrasi'
  | 'verifikasi'
  | 'seleksi'
  | 'dokumen'
  | 'keberangkatan'
  | 'purna'

export const STATUS_GROUPS: { id: StatusGroupId; label: string }[] = [
  { id: 'registrasi', label: 'Registrasi & referral' },
  { id: 'verifikasi', label: 'Kunjungan & verifikasi' },
  { id: 'seleksi', label: 'Seleksi & matching' },
  { id: 'dokumen', label: 'Dokumen & kontrak' },
  { id: 'keberangkatan', label: 'Keberangkatan' },
  { id: 'purna', label: 'Kedatangan & kerja' },
]

export const STATUS_META: Record<
  CandidateStatus,
  {
    label: string
    group: StatusGroupId
    cpmiLabel: string
    description: string
  }
> = {
  lead_registered: {
    label: 'Lead Registered',
    group: 'registrasi',
    cpmiLabel: 'Pendaftaran diterima',
    description: 'Referral baru dimasukkan oleh agen sumber.',
  },
  referral_acknowledged: {
    label: 'Referral Acknowledged',
    group: 'registrasi',
    cpmiLabel: 'Diterima P3MI',
    description: 'P3MI telah menerima dan mengakui referral.',
  },
  office_visit_confirmed: {
    label: 'Office Visit Confirmed',
    group: 'verifikasi',
    cpmiLabel: 'Jadwal kunjungan dikonfirmasi',
    description: 'Jadwal kunjungan ke kantor P3MI telah dikonfirmasi.',
  },
  initial_verification: {
    label: 'Initial Verification',
    group: 'verifikasi',
    cpmiLabel: 'Pemeriksaan awal',
    description: 'P3MI melakukan pemeriksaan awal data dan dokumen.',
  },
  candidate_screening: {
    label: 'Candidate Screening',
    group: 'verifikasi',
    cpmiLabel: 'Pemeriksaan kandidat',
    description: 'Pemeriksaan kandidat oleh P3MI.',
  },
  job_matching: {
    label: 'Job Matching',
    group: 'seleksi',
    cpmiLabel: 'Pencocokan lowongan',
    description: 'Pencocokan dengan referensi job order.',
  },
  overseas_partner_review: {
    label: 'Overseas Partner Review',
    group: 'seleksi',
    cpmiLabel: 'Review mitra luar negeri',
    description: 'Review oleh pihak mitra di luar negeri.',
  },
  employer_selection: {
    label: 'Employer Selection',
    group: 'seleksi',
    cpmiLabel: 'Seleksi pemberi kerja',
    description: 'Tahap seleksi oleh employer.',
  },
  employer_approved: {
    label: 'Employer Approved',
    group: 'seleksi',
    cpmiLabel: 'Disetujui pemberi kerja',
    description: 'Keputusan employer dicatat P3MI.',
  },
  placement_agreement: {
    label: 'Placement Agreement',
    group: 'dokumen',
    cpmiLabel: 'Perjanjian penempatan',
    description: 'Tahap perjanjian penempatan dicatat.',
  },
  employment_contract: {
    label: 'Employment Contract',
    group: 'dokumen',
    cpmiLabel: 'Kontrak kerja',
    description: 'Tahap perjanjian kerja dicatat.',
  },
  visa_work_permit: {
    label: 'Visa and Work Permit',
    group: 'dokumen',
    cpmiLabel: 'Pengurusan visa',
    description: 'Pengurusan dokumen kerja/izin dicatat P3MI.',
  },
  pre_departure: {
    label: 'Pre-Departure Process',
    group: 'keberangkatan',
    cpmiLabel: 'Persiapan keberangkatan',
    description: 'Persiapan pra-keberangkatan.',
  },
  departure_approved: {
    label: 'Departure Approved',
    group: 'keberangkatan',
    cpmiLabel: 'Keberangkatan disetujui',
    description: 'Persetujuan keberangkatan dicatat.',
  },
  departed: {
    label: 'Departed',
    group: 'keberangkatan',
    cpmiLabel: 'Sudah berangkat',
    description: 'Kandidat diberangkatkan.',
  },
  arrived: {
    label: 'Arrived in Destination',
    group: 'purna',
    cpmiLabel: 'Tiba di negara tujuan',
    description: 'Kedatangan dicatat P3MI.',
  },
  employer_handover: {
    label: 'Employer Handover',
    group: 'purna',
    cpmiLabel: 'Serah terima ke pemberi kerja',
    description: 'Serah terima kepada employer dicatat.',
  },
  working: {
    label: 'Working',
    group: 'purna',
    cpmiLabel: 'Sedang bekerja',
    description: 'Status bekerja dicatat.',
  },
  monitoring: {
    label: 'Monitoring',
    group: 'purna',
    cpmiLabel: 'Dalam pemantauan',
    description: 'Pemantauan sesuai SOP P3MI.',
  },
}

export const BRANCH_META: Record<
  BranchStatus,
  { label: string; tone: 'warning' | 'danger' | 'muted'; description: string }
> = {
  on_hold: {
    label: 'On Hold',
    tone: 'warning',
    description: 'Proses dijeda sementara dengan alasan yang dicatat.',
  },
  revision_required: {
    label: 'Perlu Revisi',
    tone: 'warning',
    description: 'Ada data atau dokumen yang perlu diperbaiki.',
  },
  rejected: {
    label: 'Ditolak',
    tone: 'danger',
    description: 'Referral atau proses kandidat ditolak.',
  },
  withdrawn: {
    label: 'Mengundurkan Diri',
    tone: 'muted',
    description: 'Kandidat mengundurkan diri dari proses.',
  },
  closed: {
    label: 'Ditutup',
    tone: 'muted',
    description: 'Proses ditutup sesuai SOP.',
  },
}

export const REFERRAL_META: Record<
  ReferralStatus,
  { label: string; tone: 'info' | 'warning' | 'success' | 'danger' | 'muted' }
> = {
  draft: { label: 'Draft', tone: 'muted' },
  submitted: { label: 'Menunggu respons P3MI', tone: 'info' },
  accepted: { label: 'Diterima P3MI', tone: 'success' },
  rejected: { label: 'Ditolak', tone: 'danger' },
  disputed: { label: 'Dispute', tone: 'warning' },
  withdrawn: { label: 'Ditarik', tone: 'muted' },
}

export const DOC_STATUS_META: Record<
  DocumentStatus,
  { label: string; tone: 'info' | 'warning' | 'success' | 'danger' | 'muted' }
> = {
  uploaded: { label: 'Diunggah', tone: 'muted' },
  pending_review: { label: 'Menunggu pemeriksaan', tone: 'info' },
  approved: { label: 'Disetujui', tone: 'success' },
  revision_required: { label: 'Perlu revisi', tone: 'warning' },
  rejected: { label: 'Ditolak', tone: 'danger' },
}

export const DOC_TYPES: {
  id: DocumentTypeId
  label: string
  required: boolean
  hint: string
}[] = [
  { id: 'ktp', label: 'Kartu Tanda Penduduk', required: true, hint: 'PDF/JPG/PNG, maks. 3 MB' },
  { id: 'kartu_keluarga', label: 'Kartu Keluarga', required: true, hint: 'PDF/JPG/PNG, maks. 3 MB' },
  { id: 'ijazah', label: 'Ijazah pendidikan terakhir', required: true, hint: 'PDF/JPG/PNG, maks. 3 MB' },
  { id: 'skck', label: 'SKCK', required: false, hint: 'Bila diminta P3MI' },
  { id: 'paspor', label: 'Paspor', required: false, hint: 'Bila sudah tersedia' },
  { id: 'foto', label: 'Pas foto', required: true, hint: 'Latar belakang polos' },
  { id: 'sertifikat', label: 'Sertifikat pelatihan', required: false, hint: 'Bila ada' },
]

export const LEDGER_META: Record<
  LedgerStatus,
  { label: string; tone: 'info' | 'warning' | 'success' | 'danger' | 'muted' }
> = {
  pending: { label: 'Menunggu milestone', tone: 'muted' },
  earned: { label: 'Menjadi hak tagih', tone: 'info' },
  submitted: { label: 'Diajukan', tone: 'info' },
  under_review: { label: 'Ditinjau', tone: 'warning' },
  approved: { label: 'Disetujui', tone: 'success' },
  due: { label: 'Jatuh tempo', tone: 'warning' },
  partially_paid: { label: 'Dibayar sebagian', tone: 'warning' },
  paid: { label: 'Dibayar', tone: 'success' },
  disputed: { label: 'Dispute', tone: 'danger' },
  cancelled: { label: 'Dibatalkan', tone: 'muted' },
}

export const COMPLAINT_META: Record<
  ComplaintStatus,
  { label: string; tone: 'info' | 'warning' | 'success' | 'muted' }
> = {
  open: { label: 'Baru', tone: 'info' },
  in_progress: { label: 'Ditindaklanjuti', tone: 'warning' },
  resolved: { label: 'Selesai', tone: 'success' },
  closed: { label: 'Ditutup', tone: 'muted' },
}

export const COMPLAINT_CATEGORY: Record<string, string> = {
  biaya: 'Informasi biaya',
  dokumen: 'Dokumen',
  jadwal: 'Jadwal',
  komunikasi: 'Komunikasi',
  lainnya: 'Lainnya',
}

export const VISIT_META: Record<
  string,
  { label: string; tone: 'info' | 'warning' | 'success' | 'danger' | 'muted' }
> = {
  proposed: { label: 'Menunggu konfirmasi', tone: 'warning' },
  confirmed: { label: 'Terkonfirmasi', tone: 'info' },
  attended: { label: 'Hadir', tone: 'success' },
  no_show: { label: 'Tidak hadir', tone: 'danger' },
  cancelled: { label: 'Dibatalkan', tone: 'muted' },
}

export const HANDOVER_META: Record<
  string,
  { label: string; tone: 'info' | 'warning' | 'success' | 'danger' }
> = {
  requested: { label: 'Menunggu konfirmasi P3MI', tone: 'warning' },
  accepted: { label: 'Diterima P3MI', tone: 'success' },
  declined: { label: 'Ditolak', tone: 'danger' },
}

export const EDUCATION_OPTIONS = [
  'SD',
  'SMP',
  'SMA/SMK',
  'D1',
  'D2',
  'D3',
  'D4/S1',
  'S2',
]

export const REGION_OPTIONS = [
  'Tasikmalaya Kota',
  'Tasikmalaya Kabupaten',
  'Ciamis',
  'Garut',
  'Banjar',
  'Cilacap',
  'Lainnya',
]

export const NOTICE_VERSION = 'v1.0 — 2 Nov 2026'

export const CONSENT_PURPOSE =
  'Pemrosesan data untuk pra-penempatan CPMI dan pembagian data kepada P3MI mitra yang dipilih.'

export const PILOT_ORG_ID = 'org-bhayangkara'
