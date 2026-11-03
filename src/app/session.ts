import { useAppState, currentAccount } from '@/lib/store'

export function useSession() {
  const state = useAppState()
  const account = currentAccount(state)
  return { state, account }
}
