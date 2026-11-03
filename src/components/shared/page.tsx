import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Info, ShieldCheck, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/utils'

export function PageHeader({
  title,
  description,
  actions,
  backTo,
  backLabel = 'Kembali',
  meta,
  eyebrow,
  className,
}: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
  backTo?: string
  backLabel?: string
  meta?: ReactNode
  eyebrow?: string
  className?: string
}) {
  return (
    <header className={cn('mb-5', className)}>
      {backTo ? (
        <Link
          to={backTo}
          className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-brand"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {backLabel}
        </Link>
      ) : null}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow ? <p className="eyebrow mb-1">{eyebrow}</p> : null}
          <h1 className="text-xl font-extrabold tracking-tight text-ink sm:text-2xl">{title}</h1>
          {description ? (
            <p className="mt-1 max-w-2xl text-xs leading-5 text-muted sm:text-sm sm:leading-6">
              {description}
            </p>
          ) : null}
          {meta ? <div className="mt-2 flex flex-wrap items-center gap-2">{meta}</div> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  )
}

export function InfoNote({
  children,
  tone = 'info',
  title,
  icon,
}: {
  children: ReactNode
  tone?: 'info' | 'warning' | 'success' | 'brand'
  title?: string
  icon?: ReactNode
}) {
  const styles = {
    info: 'border-sky-200 bg-sky-50 text-sky-900',
    warning: 'border-amber-200 bg-amber-50 text-amber-900',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
    brand: 'border-brand/15 bg-brand-soft text-brand',
  }
  return (
    <div className={cn('flex items-start gap-2.5 rounded-xl border px-3.5 py-3', styles[tone])}>
      <span className="mt-0.5 shrink-0">
        {icon ??
          (tone === 'warning' ? (
            <TriangleAlert className="h-4 w-4" />
          ) : tone === 'success' ? (
            <ShieldCheck className="h-4 w-4" />
          ) : (
            <Info className="h-4 w-4" />
          ))}
      </span>
      <div className="min-w-0">
        {title ? <p className="text-xs font-bold">{title}</p> : null}
        <div className="text-xs leading-5 opacity-90">{children}</div>
      </div>
    </div>
  )
}

export function DataRow({
  label,
  value,
  className,
}: {
  label: ReactNode
  value: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex items-start justify-between gap-4 py-2', className)}>
      <dt className="shrink-0 text-xs text-muted">{label}</dt>
      <dd className="min-w-0 text-right text-xs font-semibold text-ink">{value}</dd>
    </div>
  )
}

export function SectionTitle({
  title,
  description,
  action,
  className,
}: {
  title: string
  description?: string
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('mb-3 flex items-end justify-between gap-3', className)}>
      <div>
        <h2 className="text-sm font-bold text-ink">{title}</h2>
        {description ? <p className="mt-0.5 text-xs text-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  )
}
