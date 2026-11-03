import { Loader2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import type { LinkProps } from 'react-router-dom'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger' | 'success' | 'subtle'
type Size = 'sm' | 'md' | 'lg' | 'icon'

const variants: Record<Variant, string> = {
  primary:
    'bg-brand text-white hover:bg-brand-mid active:bg-brand-deep shadow-sm disabled:bg-slate-400',
  accent:
    'bg-accent text-brand-deep hover:bg-[#f0b45c] active:bg-accent-deep shadow-sm disabled:bg-slate-300',
  secondary:
    'border border-line bg-surface text-ink hover:border-slate-300 hover:bg-slate-50 disabled:text-slate-400',
  ghost: 'text-ink hover:bg-slate-100 disabled:text-slate-400',
  danger: 'bg-red-700 text-white hover:bg-red-800 disabled:bg-red-300',
  success: 'bg-emerald-700 text-white hover:bg-emerald-800 disabled:bg-emerald-300',
  subtle: 'bg-brand-soft text-brand hover:bg-[#dfe9f6] disabled:text-slate-400',
}

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3 text-xs gap-1.5 rounded-lg',
  md: 'h-11 px-4 text-sm gap-2 rounded-xl',
  lg: 'h-12 px-5 text-sm gap-2 rounded-xl',
  icon: 'h-10 w-10 rounded-xl',
}

function classes(variant: Variant, size: Size, className?: string) {
  return cn(
    'focus-ring inline-flex select-none items-center justify-center font-semibold transition-colors disabled:cursor-not-allowed',
    variants[variant],
    sizes[size],
    className,
  )
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: ReactNode
}

export function Button({
  className,
  variant = 'primary',
  size = 'md',
  loading,
  icon,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      className={classes(variant, size, className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : icon}
      {children}
    </button>
  )
}

export function LinkButton({
  to,
  variant = 'primary',
  size = 'md',
  icon,
  children,
  className,
  ...props
}: Omit<LinkProps, 'className'> & {
  variant?: Variant
  size?: Size
  icon?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <Link to={to} className={classes(variant, size, className)} {...props}>
      {icon}
      {children}
    </Link>
  )
}
