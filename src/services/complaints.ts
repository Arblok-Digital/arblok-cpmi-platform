import type { ComplaintStatus } from '@/lib/types'
import {
  createComplaint,
  updateComplaint,
  type ActionResult,
} from '@/lib/store'
import {
  createComplaintRemote,
  updateComplaintRemote,
} from '@/lib/data/supabase-adapter'
import { isSupabaseConfigured } from '@/lib/supabase'

export type ComplaintResult<T = null> = ActionResult<T>

export function createComplaintService(
  candidateId: string,
  category: 'biaya' | 'dokumen' | 'jadwal' | 'komunikasi' | 'lainnya',
  urgency: 'low' | 'medium' | 'high',
  description: string,
): Promise<ComplaintResult<{ code: string }>> {
  if (isSupabaseConfigured) {
    return createComplaintRemote(candidateId, category, urgency, description)
  }
  return Promise.resolve(createComplaint(candidateId, category, urgency, description))
}

export function updateComplaintService(
  complaintId: string,
  status: ComplaintStatus,
  resolution?: string,
): Promise<ComplaintResult> {
  if (isSupabaseConfigured) {
    return updateComplaintRemote(complaintId, status, resolution)
  }
  return Promise.resolve(updateComplaint(complaintId, status, resolution))
}