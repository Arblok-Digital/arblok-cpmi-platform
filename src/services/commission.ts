import {
  approveLedger,
  recordPayment,
  type ActionResult,
} from '@/lib/store'
import {
  approveLedgerRemote,
  recordPaymentRemote,
} from '@/lib/data/supabase-adapter'
import { isSupabaseConfigured } from '@/lib/supabase'

export type CommissionResult<T = null> = ActionResult<T>

export function approveLedgerService(entryId: string): Promise<CommissionResult> {
  if (isSupabaseConfigured) {
    return approveLedgerRemote(entryId)
  }
  return Promise.resolve(approveLedger(entryId))
}

export function recordPaymentService(
  agentId: string,
  amount: number,
  reference: string,
  paidAt: string,
): Promise<CommissionResult<{ paymentId: string; allocated: number }>> {
  if (isSupabaseConfigured) {
    return recordPaymentRemote(agentId, amount, reference, paidAt).then((r) => {
      if (!r.ok) return { ok: false, error: r.error }
      return { ok: true, data: { paymentId: r.data.paymentId, allocated: amount } }
    })
  }
  return Promise.resolve(recordPayment(agentId, amount, reference, paidAt))
}