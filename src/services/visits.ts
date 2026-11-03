import {
  scheduleVisit,
  setVisitStatus,
  requestHandover,
  respondHandover,
  type ActionResult,
} from '@/lib/store'
import {
  setVisitStatusRemote,
  respondHandoverRemote,
} from '@/lib/data/supabase-adapter'
import { isSupabaseConfigured } from '@/lib/supabase'

export type VisitResult = ActionResult

export function scheduleVisitService(
  candidateId: string,
  scheduledAt: string,
  locationLabel: string,
  notes?: string,
): Promise<VisitResult> {
  if (isSupabaseConfigured) {
    return Promise.resolve({ ok: false, error: 'Supabase schedule visit not yet implemented' })
  }
  return Promise.resolve(scheduleVisit(candidateId, scheduledAt, locationLabel, notes))
}

export function setVisitStatusService(
  visitId: string,
  status: 'confirmed' | 'attended' | 'no_show' | 'cancelled',
  notes?: string,
): Promise<VisitResult> {
  if (isSupabaseConfigured) {
    return setVisitStatusRemote(visitId, status, notes)
  }
  return Promise.resolve(setVisitStatus(visitId, status, notes))
}

export function requestHandoverService(candidateId: string, notes?: string): Promise<VisitResult> {
  if (isSupabaseConfigured) {
    return Promise.resolve({ ok: false, error: 'Supabase request handover not yet implemented' })
  }
  return Promise.resolve(requestHandover(candidateId, notes))
}

export function respondHandoverService(
  handoverId: string,
  accept: boolean,
  notes?: string,
): Promise<VisitResult> {
  if (isSupabaseConfigured) {
    return respondHandoverRemote(handoverId, accept, notes)
  }
  return Promise.resolve(respondHandover(handoverId, accept, notes))
}