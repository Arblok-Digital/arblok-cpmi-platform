import type { CandidateStatus } from '@/lib/types'
import {
  transitionStatus,
  setBranchStatus,
  clearBranchStatus,
  type ActionResult,
} from '@/lib/store'
import { transitionStatusRemote } from '@/lib/data/supabase-adapter'
import { isSupabaseConfigured } from '@/lib/supabase'

export type PipelineResult = ActionResult

export function transitionStatusService(
  candidateId: string,
  toStatus: CandidateStatus,
  reason?: string,
): Promise<PipelineResult> {
  if (isSupabaseConfigured) {
    return transitionStatusRemote(candidateId, toStatus, reason)
  }
  return Promise.resolve(transitionStatus(candidateId, toStatus, reason))
}

export function setBranchStatusService(
  candidateId: string,
  branch: string,
  reason: string,
): Promise<PipelineResult> {
  if (isSupabaseConfigured) {
    return Promise.resolve({ ok: false, error: 'Supabase branch status not yet implemented' })
  }
  return Promise.resolve(setBranchStatus(candidateId, branch as any, reason))
}

export function clearBranchStatusService(
  candidateId: string,
  reason?: string,
): Promise<PipelineResult> {
  if (isSupabaseConfigured) {
    return Promise.resolve({ ok: false, error: 'Supabase clear branch not yet implemented' })
  }
  return Promise.resolve(clearBranchStatus(candidateId, reason))
}