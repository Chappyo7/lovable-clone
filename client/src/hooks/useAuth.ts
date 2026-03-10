import { useState, useCallback, useEffect, useRef } from 'react'
import type { ServerEvent } from './useWebSocket'

export interface AuthState {
  cliFound: boolean
  authenticated: boolean
  account?: string
  loginInProgress: boolean
  checked: boolean
}

const initialState: AuthState = {
  cliFound: false,
  authenticated: false,
  loginInProgress: false,
  checked: false,
}

export function useAuth(
  send: (msg: Record<string, unknown>) => void,
  connected: boolean,
) {
  const [state, setState] = useState<AuthState>(initialState)
  const checkedRef = useRef(false)

  const checkAuth = useCallback(() => {
    send({ type: 'check_auth' })
  }, [send])

  const startLogin = useCallback((email?: string) => {
    send({ type: 'start_login', email })
  }, [send])

  const cancelLogin = useCallback(() => {
    send({ type: 'cancel_login' })
  }, [send])

  const handleAuthEvent = useCallback((event: ServerEvent) => {
    switch (event.type) {
      case 'auth_status':
        setState({
          cliFound: event.cliFound,
          authenticated: event.authenticated,
          account: event.account,
          loginInProgress: false,
          checked: true,
        })
        break
      case 'login_started':
        setState((prev) => ({ ...prev, loginInProgress: true }))
        break
      case 'login_cancelled':
        setState((prev) => ({ ...prev, loginInProgress: false }))
        break
      case 'login_timeout':
        setState((prev) => ({ ...prev, loginInProgress: false }))
        break
    }
  }, [])

  // Check auth when connected
  useEffect(() => {
    if (connected && !checkedRef.current) {
      checkedRef.current = true
      checkAuth()
    }
  }, [connected, checkAuth])

  return {
    ...state,
    checkAuth,
    startLogin,
    cancelLogin,
    handleAuthEvent,
  }
}
