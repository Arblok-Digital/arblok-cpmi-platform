import type { Account } from '@/lib/types'
import { login, logout, currentAccount, useAppState } from '@/lib/store'
import {
  signInRemote,
  signOutRemote,
  currentUserIdRemote,
  currentMembershipRemote,
} from '@/lib/data/supabase-adapter'
import { isSupabaseConfigured } from '@/lib/supabase'
import type { Role } from '@/lib/types'

export type AuthResult<T = null> =
  | { ok: true; data: T }
  | { ok: false; error: string }

export function useAuth() {
  const state = useAppState()
  const account = currentAccount(state)
  const mode = isSupabaseConfigured ? 'supabase' : 'demo'
  return { state, account, mode, isSupabaseConfigured }
}

export async function signIn(
  email: string,
  password: string,
): Promise<AuthResult<{ account: Account }>> {
  if (isSupabaseConfigured) {
    const result = await signInRemote(email, password)
    if (!result.ok) return { ok: false, error: result.error }
    const membership = await currentMembershipRemote()
    if (!membership.ok) return { ok: false, error: membership.error }
    return {
      ok: true,
      data: {
        account: {
          id: result.data.userId,
          email,
          name: email.split('@')[0],
          role: membership.data.role as Role,
          orgId: membership.data.orgId,
          phone: '',
          title: '',
          status: 'active',
        },
      },
    }
  }
  const result = login(email, password)
  if (!result.ok) return { ok: false, error: result.error }
  return { ok: true, data: { account: result.data } }
}

export async function signOut(): Promise<void> {
  if (isSupabaseConfigured) {
    await signOutRemote()
  } else {
    logout()
  }
}

export async function getCurrentUserId(): Promise<string | null> {
  if (isSupabaseConfigured) {
    return currentUserIdRemote()
  }
  const state = useAppState()
  const account = currentAccount(state)
  return account?.id ?? null
}