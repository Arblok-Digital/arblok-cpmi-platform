import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  ArrowLeft,
  ArrowRight,
  AlertTriangle,
  BriefcaseBusiness,
  CheckCircle2,
  FileText,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react'
import { useSession } from '@/app/session'
import {
  CONSENT_PURPOSE,
  EDUCATION_OPTIONS,
  NOTICE_VERSION,
  REGION_OPTIONS,
  STATUS_META,
} from '@/lib/constants'
import { createReferral } from '@/lib/store'
import { formatCurrency, normalizePhone } from '@/lib/format'
import { PageHeader, InfoNote } from '@/components/shared/page'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox, Field, Input, Select, Textarea } from '@/components/ui/form'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'

const schema = z
  .object({
    fullName: z.string().min(3, 'Nama minimal 3 karakter'),
    phone: z
      .string()
      .min(8, 'Nomor telepon wajib diisi')
      .refine((value) => normalizePhone(value).length >= 10, 'Nomor telepon tidak valid'),
    region: z.string().min(1, 'Wilayah wajib dipilih'),
    birthDate: z.string().optional(),
    gender: z.enum(['P', 'L']).optional(),
    education: z.string().optional(),
    vacancyId: z.string().optional(),
    address: z.string().optional(),
    notes: z.string().optional(),
    agreeProcessing: z.boolean(),
    agreeSharing: z.boolean(),
    confirmTruth: z.boolean(),
  })
  .refine((data) => data.agreeProcessing, {
    path: ['agreeProcessing'],
    message: 'Persetujuan pemrosesan data wajib dicatat',
  })
  .refine((data) => data.agreeSharing, {
    path: ['agreeSharing'],
    message: 'Persetujuan pembagian data kepada P3MI wajib dicatat',
  })
  .refine((data) => data.confirmTruth, {
    path: ['confirmTruth'],
    message: 'Konfirmasi kebenaran data wajib dicentang',
  })

type FormValues = z.infer<typeof schema>

const steps = [
  { id: 1, label: 'Data kandidat', icon: UserRound },
  { id: 2, label: 'Persetujuan', icon: ShieldCheck },
  { id: 3, label: 'Tinjau & kirim', icon: FileText },
]

export function NewReferralPage() {
  const { state, account } = useSession()
  const navigate = useNavigate()
  const toast = useToast()
  const [step, setStep] = useState(1)
  const [created, setCreated] = useState<{ referralId: string; code: string; duplicate: boolean } | null>(
    null,
  )
  const [submitError, setSubmitError] = useState<string | null>(null)
  // Guards against a click landing on the submit button that replaces "Lanjut"
  // in the same spot right after the step changes, which would skip the review step.
  const stepChangeAtRef = useRef(0)

  const {
    register,
    handleSubmit,
    trigger,
    watch,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: {
      fullName: '',
      phone: '',
      region: 'Tasikmalaya Kota',
      birthDate: '',
      gender: 'P',
      education: 'SMA/SMK',
      vacancyId: '',
      address: '',
      notes: '',
      agreeProcessing: false,
      agreeSharing: false,
      confirmTruth: false,
    },
  })

  if (!account) return null
  const vacancies = state.vacancies.filter((v) => v.status === 'published')
  const org = state.organizations.find((o) => o.id === account.orgId)
  const values = watch()
  const selectedVacancy = vacancies.find((v) => v.id === values.vacancyId)

  const next = async () => {
    const fields: (keyof FormValues)[][] = [
      ['fullName', 'phone', 'region', 'birthDate', 'gender', 'education', 'vacancyId', 'address'],
      ['agreeProcessing', 'agreeSharing', 'confirmTruth'],
    ]
    const ok = await trigger(fields[step - 1])
    if (ok) {
      stepChangeAtRef.current = Date.now()
      setStep((s) => Math.min(3, s + 1))
    }
  }

  const onSubmit = (data: FormValues) => {
    setSubmitError(null)
    // Only the review step may submit, and never from a click that started on
    // the previous step's "Lanjut" button.
    if (step !== 3 || Date.now() - stepChangeAtRef.current < 400) return
    const result = createReferral({
      fullName: data.fullName,
      phone: data.phone,
      region: data.region,
      birthDate: data.birthDate || undefined,
      gender: data.gender,
      education: data.education,
      vacancyId: data.vacancyId || undefined,
      address: data.address,
      notes: data.notes,
      consent: {
        dataProcessing: data.agreeProcessing,
        dataSharing: data.agreeSharing,
        purpose: CONSENT_PURPOSE,
        recipient: org?.legalName ?? 'P3MI mitra',
        noticeVersion: NOTICE_VERSION,
      },
    })
    if (!result.ok) {
      setSubmitError(result.error)
      toast.error('Referral belum terkirim', result.error)
      return
    }
    setCreated(result.data)
    toast.success('Referral terkirim', `${result.data.code} menunggu respons P3MI.`)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (created) {
    return (
      <div className="page-pad">
        <PageHeader
          backTo="/agen/kandidat"
          backLabel="Kembali ke kandidat"
          title="Referral terkirim"
          description="P3MI akan meninjau data dan persetujuan sebelum menerima atau menolak referral."
        />
        <div className="mx-auto max-w-2xl">
          <Card className="overflow-hidden">
            <div className="bg-radial-brand px-6 py-7 text-center text-white">
              <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300 ring-8 ring-emerald-400/10">
                <CheckCircle2 className="h-7 w-7" />
              </span>
              <p className="mt-4 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-200">
                Kode referral
              </p>
              <p className="mt-1 font-mono text-2xl font-extrabold tracking-wide">{created.code}</p>
              <p className="mt-2 text-[11px] text-white/55">
                Simpan kode ini. Kode dipakai untuk komunikasi dengan P3MI.
              </p>
            </div>
            <CardContent className="space-y-4 p-5">
              {created.duplicate ? (
                <InfoNote tone="warning" title="Peringatan duplikat">
                  Sistem menemukan nomor telepon yang cocok dengan kandidat lain pada tenant ini.
                  Referral tetap dikirim dan ditandai untuk ditinjau P3MI. Jangan membuat referral
                  kedua untuk orang yang sama.
                </InfoNote>
              ) : (
                <InfoNote tone="success" title="Tidak ada peringatan duplikat">
                  Nomor telepon belum cocok dengan kandidat lain pada tenant ini.
                </InfoNote>
              )}
              <div className="rounded-xl border border-line bg-slate-50 p-3.5">
                <p className="text-[11px] font-bold text-ink">Apa yang terjadi berikutnya?</p>
                <ol className="mt-2 space-y-1.5 text-[10px] leading-4 text-muted">
                  <li>1. P3MI meninjau data, consent, dan kemungkinan duplikat.</li>
                  <li>2. Status awal kandidat: {STATUS_META.lead_registered.label}.</li>
                  <li>3. Bila diterima, P3MI menjadwalkan kunjungan dan mengambil alih verifikasi.</li>
                  <li>4. Anda tetap dapat melihat status, tetapi tidak mengubah keputusan P3MI.</li>
                </ol>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  className="flex-1"
                  onClick={() => navigate(`/agen/kandidat/${resultCandidateId(state, created.referralId)}`)}
                  icon={<ArrowRight className="h-4 w-4" />}
                >
                  Lihat detail kandidat
                </Button>
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => {
                    reset()
                    setCreated(null)
                    setStep(1)
                    setSubmitError(null)
                  }}
                  icon={<Sparkles className="h-4 w-4" />}
                >
                  Buat referral lain
                </Button>
              </div>
              <Link to="/agen/kandidat" className="block text-center text-[10px] font-bold text-brand hover:underline">
                Kembali ke daftar kandidat
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="page-pad">
      <PageHeader
        backTo="/agen/kandidat"
        backLabel="Kembali ke kandidat"
        eyebrow="Referral baru"
        title="Daftarkan kandidat CPMI"
        description="Isi data minimal yang benar-benar dibutuhkan. Jangan meminta NIK, paspor, atau dokumen sensitif pada tahap ini."
        meta={
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-[10px] font-semibold text-amber-800">
            <ShieldCheck className="h-3 w-3" /> Data yang dimasukkan akan dibagikan ke {org?.shortName}
          </span>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <Card>
            <div className="border-b border-line px-4 py-4 sm:px-5">
              <ol className="flex items-center gap-1 sm:gap-2">
                {steps.map((s, index) => {
                  const Icon = s.icon
                  const done = step > s.id
                  const active = step === s.id
                  return (
                    <li key={s.id} className="flex flex-1 items-center gap-1 sm:gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (s.id < step) setStep(s.id)
                        }}
                        className={cn(
                          'focus-ring flex min-w-0 flex-1 items-center gap-1.5 rounded-lg px-1 py-1 text-left sm:gap-2 sm:px-2',
                          s.id > step && 'cursor-default',
                        )}
                      >
                        <span
                          className={cn(
                            'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-bold sm:h-8 sm:w-8',
                            done
                              ? 'bg-emerald-100 text-emerald-700'
                              : active
                                ? 'bg-brand text-white'
                                : 'bg-slate-100 text-slate-400',
                          )}
                        >
                          {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                        </span>
                        <span
                          className={cn(
                            'hidden truncate text-[10px] font-bold sm:block',
                            active ? 'text-ink' : 'text-muted',
                          )}
                        >
                          {s.label}
                        </span>
                      </button>
                      {index < steps.length - 1 ? (
                        <span className={cn('h-px w-3 shrink-0 sm:w-6', done ? 'bg-emerald-300' : 'bg-line')} />
                      ) : null}
                    </li>
                  )
                })}
              </ol>
              <p className="mt-2 text-[10px] text-muted sm:hidden">
                Langkah {step} dari 3 — {steps[step - 1].label}
              </p>
            </div>

            <CardContent className="min-h-[360px]">
              {step === 1 ? (
                <div className="animate-fade-in">
                  <h2 className="text-sm font-bold text-ink">Data kandidat</h2>
                  <p className="mt-0.5 text-[11px] text-muted">
                    Cukup data untuk menghubungi dan mencocokkan minat lowongan.
                  </p>
                  <div className="mt-4 grid gap-4 sm:grid-cols-2">
                    <Field
                      label="Nama lengkap"
                      htmlFor="fullName"
                      required
                      error={errors.fullName?.message}
                      className="sm:col-span-2"
                    >
                      <Input
                        id="fullName"
                        placeholder="Sesuai kartu identitas"
                        autoComplete="name"
                        {...register('fullName')}
                      />
                    </Field>
                    <Field
                      label="Nomor telepon / WhatsApp"
                      htmlFor="phone"
                      required
                      hint="Contoh: 0812 3456 7890"
                      error={errors.phone?.message}
                    >
                      <Input
                        id="phone"
                        inputMode="tel"
                        placeholder="08xx xxxx xxxx"
                        autoComplete="tel"
                        {...register('phone')}
                      />
                    </Field>
                    <Field label="Wilayah" htmlFor="region" required error={errors.region?.message}>
                      <Select id="region" {...register('region')}>
                        {REGION_OPTIONS.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Tanggal lahir" htmlFor="birthDate" hint="Opsional pada tahap referral">
                      <Input id="birthDate" type="date" {...register('birthDate')} />
                    </Field>
                    <Field label="Jenis kelamin" htmlFor="gender">
                      <Select id="gender" {...register('gender')}>
                        <option value="P">Perempuan</option>
                        <option value="L">Laki-laki</option>
                      </Select>
                    </Field>
                    <Field label="Pendidikan terakhir" htmlFor="education">
                      <Select id="education" {...register('education')}>
                        {EDUCATION_OPTIONS.map((e) => (
                          <option key={e} value={e}>
                            {e}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Minat lowongan" htmlFor="vacancyId" hint="Boleh dikosongkan">
                      <Select id="vacancyId" {...register('vacancyId')}>
                        <option value="">Belum menentukan</option>
                        {vacancies.map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.title} — {v.country}
                          </option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Alamat singkat" htmlFor="address" className="sm:col-span-2" hint="Kecamatan/kota saja, bukan alamat lengkap">
                      <Input id="address" placeholder="Kec. ..., Kab./Kota ..." {...register('address')} />
                    </Field>
                    <Field
                      label="Catatan untuk P3MI"
                      htmlFor="notes"
                      className="sm:col-span-2"
                      hint="Jangan menuliskan NIK, nomor rekening, atau data kesehatan."
                    >
                      <Textarea id="notes" placeholder="Kebutuhan khusus, preferensi negara, dsb." {...register('notes')} />
                    </Field>
                  </div>
                </div>
              ) : null}

              {step === 2 ? (
                <div className="animate-fade-in">
                  <h2 className="text-sm font-bold text-ink">Persetujuan CPMI</h2>
                  <p className="mt-0.5 text-[11px] text-muted">
                    Persetujuan pembagian data kepada P3MI harus terpisah dan eksplisit. Jangan
                    menganggap persetujuan komisi agen sebagai persetujuan CPMI.
                  </p>
                  <div className="mt-4 space-y-2.5">
                    <Checkbox
                      id="agreeProcessing"
                      checked={values.agreeProcessing}
                      onChange={(v) => setValue('agreeProcessing', v, { shouldValidate: true })}
                      label="CPMI menyetujui pemrosesan data untuk pra-penempatan"
                      description="Tujuan: pemrosesan data awal, pencocokan lowongan, dan komunikasi operasional dengan P3MI."
                    />
                    {errors.agreeProcessing ? (
                      <p className="text-xs font-medium text-red-600">{errors.agreeProcessing.message}</p>
                    ) : null}
                    <Checkbox
                      id="agreeSharing"
                      checked={values.agreeSharing}
                      onChange={(v) => setValue('agreeSharing', v, { shouldValidate: true })}
                      label={`CPMI menyetujui pembagian data kepada ${org?.shortName ?? 'P3MI mitra'}`}
                      description="Penerima: P3MI pilot. Persetujuan ini dicatat terpisah dari perjanjian komisi agen."
                    />
                    {errors.agreeSharing ? (
                      <p className="text-xs font-medium text-red-600">{errors.agreeSharing.message}</p>
                    ) : null}
                    <Checkbox
                      id="confirmTruth"
                      checked={values.confirmTruth}
                      onChange={(v) => setValue('confirmTruth', v, { shouldValidate: true })}
                      label="Saya mengonfirmasi data yang diisi benar dan sudah diketahui CPMI"
                      description="Agen mencatat persetujuan melalui onboarding terbantu. Bukti digital bukan pengganti perjanjian yang sah."
                    />
                    {errors.confirmTruth ? (
                      <p className="text-xs font-medium text-red-600">{errors.confirmTruth.message}</p>
                    ) : null}
                  </div>
                  <InfoNote tone="warning" title="Versi pemberitahuan" icon={<ShieldCheck className="h-4 w-4" />}>
                    Pemberitahuan {NOTICE_VERSION}. Tujuan: {CONSENT_PURPOSE} Dokumen pendukung
                    hanya diminta setelah P3MI menentukan kebutuhannya.
                  </InfoNote>
                </div>
              ) : null}

              {step === 3 ? (
                <div className="animate-fade-in">
                  <h2 className="text-sm font-bold text-ink">Tinjau sebelum mengirim</h2>
                  <p className="mt-0.5 text-[11px] text-muted">
                    Periksa kembali. Setelah dikirim, sumber referral akan dikunci bila P3MI menerima.
                  </p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl border border-line p-3.5">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-muted">Kandidat</p>
                      <p className="mt-1 text-sm font-bold text-ink">{values.fullName || '—'}</p>
                      <p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted">
                        <Phone className="h-3 w-3" /> {values.phone || '—'}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted">
                        <MapPin className="h-3 w-3" /> {values.region} · {values.education}
                      </p>
                      {values.birthDate ? (
                        <p className="mt-0.5 text-[10px] text-muted">
                          Lahir {new Date(values.birthDate).toLocaleDateString('id-ID', { dateStyle: 'medium' })}
                        </p>
                      ) : null}
                    </div>
                    <div className="rounded-xl border border-line p-3.5">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-muted">Lowongan</p>
                      {selectedVacancy ? (
                        <>
                          <p className="mt-1 text-sm font-bold text-ink">{selectedVacancy.title}</p>
                          <p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted">
                            <BriefcaseBusiness className="h-3 w-3" /> {selectedVacancy.country} ·{' '}
                            {selectedVacancy.sector}
                          </p>
                          <p className="mt-1 text-[10px] font-semibold text-brand">
                            {formatCurrency(selectedVacancy.wageMin, selectedVacancy.wageCurrency)} –{' '}
                            {formatCurrency(selectedVacancy.wageMax, selectedVacancy.wageCurrency)} /{' '}
                            {selectedVacancy.wageType}
                          </p>
                        </>
                      ) : (
                        <p className="mt-2 text-[10px] text-muted">Belum memilih lowongan.</p>
                      )}
                    </div>
                    <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 sm:col-span-2">
                      <p className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-800">
                        <ShieldCheck className="h-3.5 w-3.5" /> Persetujuan tercatat
                      </p>
                      <p className="mt-1 text-[10px] leading-4 text-emerald-900/70">
                        Pemrosesan data dan pembagian data kepada {org?.shortName}. Versi
                        pemberitahuan {NOTICE_VERSION}. Bukti akan tercatat pada jejak audit.
                      </p>
                    </div>
                    {values.notes ? (
                      <div className="rounded-xl border border-line p-3.5 sm:col-span-2">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-muted">Catatan</p>
                        <p className="mt-1 text-[10px] leading-5 text-slate-600">{values.notes}</p>
                      </div>
                    ) : null}
                  </div>
                  {submitError ? (
                    <p className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                      {submitError}
                    </p>
                  ) : null}
                  <InfoNote tone="info" title="Setelah dikirim">
                    Referral akan berstatus <strong>{STATUS_META.lead_registered.label}</strong>.
                    P3MI memutuskan penerimaan; agen tidak dapat mengubah sumber setelah diterima.
                  </InfoNote>
                </div>
              ) : null}
            </CardContent>

            <div className="flex items-center justify-between gap-3 border-t border-line bg-slate-50/70 px-4 py-3 sm:px-5">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setStep((s) => Math.max(1, s - 1))}
                disabled={step === 1}
                icon={<ArrowLeft className="h-4 w-4" />}
              >
                Kembali
              </Button>
              {step < 3 ? (
                <Button type="button" onClick={next} icon={<ArrowRight className="h-4 w-4" />}>
                  Lanjut
                </Button>
              ) : (
                <Button type="submit" variant="accent" loading={isSubmitting} icon={<CheckCircle2 className="h-4 w-4" />}>
                  Kirim referral
                </Button>
              )}
            </div>
          </Card>
        </form>

        <aside className="space-y-4">
          <Card>
            <CardHeader
              title="Ringkasan"
              description="Perubahan tersimpan di form ini."
              icon={<UserRound className="h-4 w-4" />}
            />
            <CardContent className="space-y-2 pt-2">
              <div className="flex justify-between gap-3 text-[10px]">
                <span className="text-muted">Nama</span>
                <span className="text-right font-semibold text-ink">{values.fullName || '—'}</span>
              </div>
              <div className="flex justify-between gap-3 text-[10px]">
                <span className="text-muted">Telepon</span>
                <span className="text-right font-semibold text-ink">{values.phone || '—'}</span>
              </div>
              <div className="flex justify-between gap-3 text-[10px]">
                <span className="text-muted">Wilayah</span>
                <span className="text-right font-semibold text-ink">{values.region}</span>
              </div>
              <div className="flex justify-between gap-3 text-[10px]">
                <span className="text-muted">Lowongan</span>
                <span className="text-right font-semibold text-ink">
                  {selectedVacancy?.title ?? 'Belum dipilih'}
                </span>
              </div>
              <div className="flex justify-between gap-3 text-[10px]">
                <span className="text-muted">Consent</span>
                <span
                  className={cn(
                    'text-right font-semibold',
                    values.agreeProcessing && values.agreeSharing ? 'text-emerald-700' : 'text-amber-700',
                  )}
                >
                  {values.agreeProcessing && values.agreeSharing ? 'Lengkap' : 'Belum lengkap'}
                </span>
              </div>
            </CardContent>
          </Card>

          <InfoNote tone="warning" title="Batas peran agen">
            Agen tidak memverifikasi keabsahan dokumen, tidak menyatakan lowongan sah, dan tidak
            memproses visa/kontrak. Semua keputusan penempatan berada pada P3MI.
          </InfoNote>

          <div className="rounded-xl border border-line bg-surface p-3.5">
            <p className="flex items-center gap-1.5 text-[10px] font-bold text-ink">
              <AlertTriangle className="h-3.5 w-3.5 text-amber-600" /> Peringatan duplikat
            </p>
            <p className="mt-1 text-[9px] leading-4 text-muted">
              Sistem memeriksa nomor telepon dalam tenant yang sama. Bila cocok, referral tetap
              dikirim dengan tanda khusus untuk ditinjau P3MI — bukan dihapus otomatis.
            </p>
          </div>
        </aside>
      </div>
    </div>
  )
}

function resultCandidateId(state: ReturnType<typeof useSession>['state'], referralId: string) {
  return state.referrals.find((r) => r.id === referralId)?.candidateId ?? ''
}
