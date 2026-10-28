import { useState } from 'react'
import { Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { errorMessage } from '../services/api'
import { Alert, Button, FormField } from '../components/ui'

export default function Login() {
  const { user, login, notice } = useAuth()
  const nav = useNavigate()
  const loc = useLocation()
  const [form, setForm] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState({})
  const [serverError, setServerError] = useState('')
  const [busy, setBusy] = useState(false)

  if (user) return <Navigate to={loc.state?.from || '/'} replace />

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    const errs = {}
    if (!form.email.trim()) errs.email = 'Email is required'
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = 'Enter a valid email address'
    if (!form.password) errs.password = 'Password is required'
    setErrors(errs)
    if (Object.keys(errs).length) return
    setBusy(true); setServerError('')
    try {
      await login(form.email.trim(), form.password)
      nav(loc.state?.from || '/', { replace: true })
    } catch (err) {
      const s = err.response?.status
      setServerError(s === 401 ? 'Invalid email or password.' : s === 403 ? 'Your account is inactive. Contact an administrator.' : errorMessage(err))
    } finally { setBusy(false) }
  }

  return (
    <div className="login-wrap">
      <div className="login-hero">
        <div className="brand"><span className="brand-mark">₹</span><span>PayrollPro</span></div>
        <h1>Payroll, attendance and approvals in one place.</h1>
        <p>Calculate, review, approve and finalize payroll with a full audit trail.</p>
      </div>
      <div className="login-panel">
        <form className="login-card" onSubmit={submit} noValidate>
          <div><h1>Sign in</h1><p className="muted">Use your company account to continue.</p></div>
          {notice && <Alert tone="warn">{notice}</Alert>}
          {serverError && <Alert tone="error">{serverError}</Alert>}
          <FormField label="Email" required error={errors.email}>
            <input type="email" autoComplete="username" autoFocus value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          </FormField>
          <FormField label="Password" required error={errors.password}>
            <input type="password" autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          </FormField>
          <Button type="submit" loading={busy}>{busy ? 'Signing in…' : 'Sign in'}</Button>
        </form>
      </div>
    </div>
  )
}
