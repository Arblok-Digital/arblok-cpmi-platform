import type { DocumentStatus, DocumentTypeId } from '@/lib/types'
import {
  uploadDocument,
  reviewDocument,
  logDocumentAccess,
  type ActionResult,
} from '@/lib/store'
import {
  reviewDocumentRemote,
  logDocumentAccessRemote,
} from '@/lib/data/supabase-adapter'
import { isSupabaseConfigured } from '@/lib/supabase'

export type DocumentResult<T = null> = ActionResult<T>

export function uploadDocumentService(
  candidateId: string,
  documentType: DocumentTypeId,
  file: { name: string; size: number; type: string },
): Promise<DocumentResult<{ documentId: string }>> {
  if (isSupabaseConfigured) {
    return Promise.resolve({ ok: false, error: 'Supabase document upload not yet implemented' })
  }
  return Promise.resolve(uploadDocument(candidateId, documentType, file))
}

export function reviewDocumentService(
  documentId: string,
  decision: Exclude<DocumentStatus, 'uploaded' | 'pending_review'>,
  reason?: string,
): Promise<DocumentResult> {
  if (isSupabaseConfigured) {
    return reviewDocumentRemote(documentId, decision, reason)
  }
  return Promise.resolve(reviewDocument(documentId, decision, reason))
}

export function logDocumentAccessService(
  documentId: string,
  action: 'view' | 'download',
  reason: string,
): Promise<DocumentResult> {
  if (isSupabaseConfigured) {
    return logDocumentAccessRemote(documentId, action, reason)
  }
  return Promise.resolve(logDocumentAccess(documentId, action, reason))
}