import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Label({
  htmlFor,
  children,
  required,
  className,
}: {
  htmlFor?: string
  children: ReactNode
  required?: boolean
  className?: string
}) {
  return (
    <label htmlFor={htmlFor} className={cn('mb-1.5 block text-xs font-semibold text-slate-700', className)}>
      {children}
      {required ? <span className="ml-0.5 text-red-600">*</span> : null}
    </label>
  )
}

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
  className,
}: {
  label?: string
  htmlFor?: string
  hint?: string
  error?: string
  required?: boolean
  children: ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      {label ? (
        <Label htmlFor={htmlFor} required={required}>
          {label}
        </Label>
      ) : null}
      {children}
      {error ? (
        <p className="mt-1.5 text-xs font-medium text-red-600">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs leading-5 text-muted">{hint}</p>
      ) : null}
    </div>
  )
}

const base =
  'focus-ring w-full rounded-xl border border-line bg-surface px-3.5 text-sm text-ink placeholder:text-slate-400 transition-colors hover:border-slate-300 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500'

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(base, 'h-11', className)} {...props} />
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn(base, 'min-h-[104px] py-3 leading-6', className)} {...props} />
}

export function Select({ className, children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={cn(base, 'h-11 appearance-none pr-9', className)} {...props}>
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
        aria-hidden
      />
    </div>
  )
}

export function Checkbox({
  checked,
  onChange,
  label,
  description,
  disabled,
  id,
  tone = 'default',
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: ReactNode
  description?: ReactNode
  disabled?: boolean
  id?: string
  tone?: 'default' | 'light'
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition-colors',
        checked
          ? 'border-brand/30 bg-brand-soft/70'
          : tone === 'light'
            ? 'border-white/15 bg-white/5 hover:border-white/30'
            : 'border-line bg-surface hover:border-slate-300',
        disabled && 'cursor-not-allowed opacity-60',
      )}
    >
      <span className="relative mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
          className="peer h-5 w-5 appearance-none rounded-md border border-slate-300 bg-white checked:border-brand checked:bg-brand"
        />
        <Check
          className="pointer-events-none absolute h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100"
          aria-hidden
        />
      </span>
      <span className="min-w-0">
        <span className={cn('block text-sm font-semibold', tone === 'light' ? 'text-white' : 'text-ink')}>
          {label}
        </span>
        {description ? (
          <span
            className={cn(
              'mt-1 block text-xs leading-5',
              tone === 'light' ? 'text-white/65' : 'text-muted',
            )}
          >
            {description}
          </span>
        ) : null}
      </span>
    </label>
  )
}
