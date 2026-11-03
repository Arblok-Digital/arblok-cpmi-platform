import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Database,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Network,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
  Wallet,
} from 'lucide-react'
import { accountsForLogin, currentAccount, login, roleHome, useAppState } from '@/lib/store'
import { DEMO_PASSWORD, ROLE_LABELS } from '@/lib/constants'
import { Avatar } from '@/components/ui/misc'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/toast'
import { cn } from '@/lib/utils'
import type { Role } from '@/lib/types'

const schema = z.object({
  email: z.email('Format email tidak valid'),
  password: z.string().min(6, 'Kata sandi minimal 6 karakter'),
})

type FormValues = z.infer<typeof schema>

const roleIcon: Record<Role, React.ReactNode> = {
  arblok_admin: <ShieldCheck className="h-4 w-4" />,
  p3mi_admin: <Building2 className="h-4 w-4" />,
  p3mi_reviewer: <CheckCircle2 className="h-4 w-4" />,
  agent_coordinator: <Network className="h-4 w-4" />,
  agent: <Users className="h-4 w-4" />,
  cpmi: <UserRound className="h-4 w-4" />,
}

const quickOrder: Role[] = [
  'p3mi_admin',
  'agent',
  'p3mi_reviewer',
  'cpmi',
  'agent_coordinator',
  'arblok_admin',
]

export function LoginPage() {
  const state = useAppState()
  const navigate = useNavigate()
  const toast = useToast()
  const account = currentAccount(state)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [pendingEmail, setPendingEmail] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: 'hendra@mitrabhayangkara.co.id', password: DEMO_PASSWORD },
  })

  useEffect(() => {
    if (account) navigate(roleHome(account.role), { replace: true })
  }, [account, navigate])

  const enter = (email: string) => {
    setError(null)
    setPendingEmail(email)
    const result = login(email, DEMO_PASSWORD)
    if (!result.ok) {
      setError(result.error)
      setPendingEmail(null)
      return
    }
    toast.success(`Selamat datang, ${result.data.name.split(' ')[0]}`)
    navigate(roleHome(result.data.role), { replace: true })
  }

  const onSubmit = (values: FormValues) => {
    setError(null)
    const result = login(values.email, values.password)
    if (!result.ok) {
      setError(result.error)
      return
    }
    toast.success(`Selamat datang, ${result.data.name.split(' ')[0]}`)
    navigate(roleHome(result.data.role), { replace: true })
  }

  const quickAccounts = accountsForLogin(state)
    .filter((a) => quickOrder.includes(a.role))
    .sort((a, b) => quickOrder.indexOf(a.role) - quickOrder.indexOf(b.role))

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_0.95fr]">
      <section className="relative overflow-hidden bg-radial-brand px-5 pb-8 pt-7 text-white sm:px-10 sm:pb-10 lg:flex lg:flex-col lg:justify-between lg:px-14 lg:py-10">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-40" />
        <div className="pointer-events-none absolute -right-24 top-10 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />

        <div className="relative">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-accent text-xl font-black text-brand-deep">
              A
            </span>
            <div>
              <p className="text-sm font-extrabold tracking-[0.12em]">ARBLOK</p>
              <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-white/50">
                CPMI Partner Platform
              </p>
            </div>
          </div>

          <div className="mt-10 max-w-xl lg:mt-16">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.06] px-3 py-1.5 text-[10px] font-bold text-amber-200">
              <Sparkles className="h-3 w-3" />
              Pilot Tasikmalaya · Sprint MVP
            </span>
            <h1 className="mt-5 text-3xl font-extrabold leading-[1.15] tracking-tight sm:text-4xl lg:text-[2.9rem]">
              Jembatan digital kepatuhan untuk jaringan rekrutmen CPMI.
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-6 text-white/65">
              Satu workspace untuk agen, P3MI, dan CPMI — dari referral dan persetujuan data,
              jadwal kunjungan, verifikasi dokumen, sampai rekonsiliasi fee. Tanpa mengklaim
              kewenangan yang bukan milik platform.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {[
                {
                  icon: <Network className="h-4 w-4" />,
                  title: 'Atribusi referral',
                  body: 'Kode unik, peringatan duplikat, source lock setelah diterima.',
                },
                {
                  icon: <ShieldCheck className="h-4 w-4" />,
                  title: 'Konsen & audit',
                  body: 'Persetujuan terpisah, jejak akses dokumen, audit event.',
                },
                {
                  icon: <Wallet className="h-4 w-4" />,
                  title: 'Fee terpisah',
                  body: 'Journey kandidat dan journey komisi tidak dicampur.',
                },
              ].map((item) => (
                <div key={item.title} className="rounded-xl border border-white/10 bg-white/[0.05] p-3.5">
                  <span className="text-accent">{item.icon}</span>
                  <p className="mt-2 text-[11px] font-bold">{item.title}</p>
                  <p className="mt-1 text-[10px] leading-4 text-white/50">{item.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="relative mt-10 lg:mt-16">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[9px] text-white/40">
            <span className="inline-flex items-center gap-1.5">
              <Database className="h-3 w-3" /> Data sintetis — bukan data CPMI asli
            </span>
            <span className="inline-flex items-center gap-1.5">
              <LockKeyhole className="h-3 w-3" /> Private bucket · signed URL
            </span>
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="h-3 w-3" /> RLS-ready
            </span>
          </div>
          <p className="mt-2 max-w-xl text-[9px] leading-4 text-white/30">
            Aplikasi adalah workspace administrasi referral dan pra-penempatan. Bukan sistem
            pemerintah, bukan pengganti Sisko P2MI/LTSA, dan tidak menjalankan proses visa,
            biometrik, atau penempatan.
          </p>
        </div>
      </section>

      <section className="flex items-center justify-center bg-canvas px-4 py-8 sm:px-8 lg:px-12">
        <div className="w-full max-w-md">
          <div className="mb-6">
            <p className="eyebrow">Masuk ke workspace</p>
            <h2
              className="mt-1 text-2xl font-extrabold tracking-tight text-ink"
              data-testid="login-form-title"
            >
              Selamat datang kembali
            </h2>
            <p className="mt-1.5 text-xs leading-5 text-muted">
              Akun pilot dibuat oleh admin — tidak ada pendaftaran publik. Gunakan salah satu akun
              demo di bawah untuk mencoba peran yang berbeda.
            </p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="card p-4 sm:p-5" noValidate>
            {error ? (
              <div
                role="alert"
                className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-xs font-medium text-red-700"
              >
                {error}
              </div>
            ) : null}

            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Email
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="username"
                    className="focus-ring h-11 w-full rounded-xl border border-line bg-surface pl-9 pr-3 text-sm text-ink placeholder:text-slate-400 hover:border-slate-300"
                    placeholder="nama@organisasi.id"
                    data-testid="login-email"
                    {...register('email')}
                  />
                </div>
                {errors.email ? (
                  <p className="mt-1.5 text-xs font-medium text-red-600">{errors.email.message}</p>
                ) : null}
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label htmlFor="password" className="text-xs font-semibold text-slate-700">
                    Kata sandi
                  </label>
                  <span className="text-[10px] font-medium text-muted">Demo: {DEMO_PASSWORD}</span>
                </div>
                <div className="relative">
                  <LockKeyhole className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    className="focus-ring h-11 w-full rounded-xl border border-line bg-surface pl-9 pr-11 text-sm text-ink hover:border-slate-300"
                    data-testid="login-password"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                    className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted hover:bg-slate-100"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password ? (
                  <p className="mt-1.5 text-xs font-medium text-red-600">{errors.password.message}</p>
                ) : null}
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full"
                loading={isSubmitting}
                icon={<ArrowRight className="h-4 w-4" />}
                data-testid="login-submit"
              >
                Masuk
              </Button>
            </div>
          </form>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between">
              <p className="eyebrow">Masuk cepat sebagai</p>
              <span className="text-[9px] text-muted">Klik untuk langsung masuk</span>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {quickAccounts.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => enter(a.email)}
                  disabled={Boolean(pendingEmail)}
                  className={cn(
                    'focus-ring flex items-center gap-2.5 rounded-xl border border-line bg-surface p-2.5 text-left transition-colors hover:border-brand/30 hover:bg-brand-soft/50',
                    pendingEmail === a.email && 'border-brand/40 bg-brand-soft',
                  )}
                >
                  <Avatar name={a.name} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1 text-[10px] font-bold text-ink">
                      <span className="text-brand">{roleIcon[a.role]}</span>
                      {ROLE_LABELS[a.role]}
                    </span>
                    <span className="mt-0.5 block truncate text-[9px] text-muted">{a.name}</span>
                  </span>
                </button>
              ))}
            </div>
          </div>

          <p className="mt-5 text-center text-[9px] leading-4 text-muted">
            Dengan masuk, Anda menggunakan data sintetis untuk evaluasi pilot. Jangan mengunggah
            KTP, paspor, atau dokumen pribadi asli pada mode demo.
          </p>
        </div>
      </section>
    </div>
  )
}
