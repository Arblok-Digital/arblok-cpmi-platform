import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { AlertTriangle, CheckCircle2, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type ToastTone = 'success' | 'error' | 'info' | 'warning'

type ToastItem = {
  id: number
  title: string
  description?: string
  tone: ToastTone
}

type ToastApi = {
  toast: (input: { title: string; description?: string; tone?: ToastTone }) => void
  success: (title: string, description?: string) => void
  error: (title: string, description?: string) => void
  info: (title: string, description?: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)

const toneStyles: Record<ToastTone, string> = {
  success: 'border-emerald-200 bg-white text-ink',
  error: 'border-red-200 bg-white text-ink',
  info: 'border-sky-200 bg-white text-ink',
  warning: 'border-amber-200 bg-white text-ink',
}

const toneIcon: Record<ToastTone, ReactNode> = {
  success: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
  error: <AlertTriangle className="h-4 w-4 text-red-600" />,
  info: <Info className="h-4 w-4 text-sky-600" />,
  warning: <AlertTriangle className="h-4 w-4 text-amber-600" />,
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const counter = useRef(0)

  const remove = useCallback((id: number) => {
    setItems((current) => current.filter((t) => t.id !== id))
  }, [])

  const toast = useCallback<ToastApi['toast']>(({ title, description, tone = 'info' }) => {
    const id = ++counter.current
    setItems((current) => [...current.slice(-2), { id, title, description, tone }])
    window.setTimeout(() => {
      setItems((current) => current.filter((t) => t.id !== id))
    }, 4500)
  }, [])

  const api = useMemo<ToastApi>(
    () => ({
      toast,
      success: (title, description) => toast({ title, description, tone: 'success' }),
      error: (title, description) => toast({ title, description, tone: 'error' }),
      info: (title, description) => toast({ title, description, tone: 'info' }),
    }),
    [toast],
  )

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-4 bottom-20 z-[100] flex flex-col items-center gap-2 sm:bottom-6 sm:left-auto sm:right-6 sm:items-end"
      >
        {items.map((item) => (
          <div
            key={item.id}
            className={cn(
              'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-xl border px-4 py-3 shadow-float animate-fade-up',
              toneStyles[item.tone],
            )}
          >
            <span className="mt-0.5">{toneIcon[item.tone]}</span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold">{item.title}</p>
              {item.description ? (
                <p className="mt-0.5 text-xs leading-5 text-muted">{item.description}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => remove(item.id)}
              aria-label="Tutup notifikasi"
              className="rounded p-1 text-muted hover:bg-slate-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used inside ToastProvider')
  return context
}

export function useDelayedFlag(delay = 300) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const timer = window.setTimeout(() => setReady(true), delay)
    return () => window.clearTimeout(timer)
  }, [delay])
  return ready
}
