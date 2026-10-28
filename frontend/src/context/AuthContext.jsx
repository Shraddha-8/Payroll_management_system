import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { authService } from '../services/auth'
import { payslipService } from '../services/payslip'
import { tokenStore, errorMessage } from '../services/api'
import { ROLES } from '../utils/roles'

const AuthCtx = createContext(null)
export const useAuth = () => useContext(AuthCtx)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [booting, setBooting] = useState(!!tokenStore.get())
  const [notice, setNotice] = useState('')
  // Employee self-service: the backend has no "my employee record" endpoint, so the employee
  // id is learned from GET /payslips/my (only works once the user is linked and has a payslip).
  const [employeeLink, setEmployeeLink] = useState({ status: 'idle', id: null })

  const clear = useCallback((msg = '') => {
    authService.logout()
    setUser(null)
    setEmployeeLink({ status: 'idle', id: null })
    setNotice(msg)
  }, [])

  const loadMe = useCallback(async () => {
    const me = await authService.me()
    if (!me.is_active) throw Object.assign(new Error('inactive'), { response: { status: 403, data: { detail: 'Your account is inactive.' } } })
    setUser(me)
    return me
  }, [])

  useEffect(() => {
    if (!tokenStore.get()) return
    loadMe()
      .catch((e) => clear(e.response?.status === 401 ? 'Your session has expired. Please sign in again.' : errorMessage(e)))
      .finally(() => setBooting(false))
  }, [loadMe, clear])

  useEffect(() => {
    const onUnauthorized = () => clear('Your session has expired. Please sign in again.')
    window.addEventListener('auth:unauthorized', onUnauthorized)
    return () => window.removeEventListener('auth:unauthorized', onUnauthorized)
  }, [clear])

  useEffect(() => {
    if (user?.role !== ROLES.EMPLOYEE) return
    setEmployeeLink({ status: 'loading', id: null })
    payslipService.mine()
      .then((rows) => setEmployeeLink(rows.length ? { status: 'ok', id: rows[0].employee_id } : { status: 'unknown', id: null }))
      .catch((e) => setEmployeeLink({ status: e.response?.status === 404 ? 'unlinked' : 'unknown', id: null }))
  }, [user])

  const login = useCallback(async (email, password) => {
    setNotice('')
    await authService.login(email, password)
    try { return await loadMe() } catch (e) { clear(); throw e }
  }, [loadMe, clear])

  const value = useMemo(
    () => ({ user, role: user?.role, booting, notice, employeeLink, login, logout: () => clear(), setEmployeeLink }),
    [user, booting, notice, employeeLink, login, clear],
  )
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}
