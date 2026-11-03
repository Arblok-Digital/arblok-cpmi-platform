import type { NewReferralInput } from '@/lib/types'
import {
  createReferral,
  respondReferral,
  type ActionResult,
} from '@/lib/store'
import {
  createReferralRemote,
  respondReferralRemote,
} from '@/lib/data/supabase-adapter'
import { isSupabaseConfigured } from '@/lib/supabase'

export type ReferralResult<T = null> = ActionResult<T>

export type ReferralDecision = 'accepted' | 'rejected' | 'disputed'

export function createReferralService(
  input: NewReferralInput,
): Promise<ReferralResult<{ referralId: string; code: string; duplicate: boolean }>> {
  if (isSupabaseConfigured) {
    return createReferralRemote(input)
  }
  return Promise.resolve(createReferral(input))
}

export function respondReferralService(
  referralId: string,
  decision: ReferralDecision,
  reason?: string,
): Promise<ReferralResult> {
  if (isSupabaseConfigured) {
    return respondReferralRemote(referralId, decision, reason)
  }
  return Promise.resolve(respondReferral(referralId, decision, reason))
}