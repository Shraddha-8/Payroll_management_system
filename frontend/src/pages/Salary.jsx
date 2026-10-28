import { useState } from 'react'
import { useFetch } from '../hooks/useFetch'
import { useEmployees } from '../hooks/useEmployees'
import { salaryService } from '../services/salary'
import { errorMessage } from '../services/api'
import { useToast } from '../context/ToastContext'
import { fmtDate, money } from '../utils/format'
import { Alert, Button, Card, DataTable, EmptyState, FormField, Modal, PageHeader, StatusBadge } from '../components/ui'

const blank = { employee_id: '', basic_salary: '', allowances: '0', bonuses: '0', deductions: '0', effective_from: '', effective_to: '' }

function SalaryForm({ revise, employees, canPick, onClose, onSaved }) {
  const toast = useToast()
  const [f, setF] = useState(revise
    ? { ...blank, employee_id: String(revise.employee_id), basic_salary: revise.basic_salary, allowances: revise.allowances, bonuses: revise.bonuses, deductions: revise.deductions }
    : blank)
  const [errs, setErrs] = useState({})
  const [serverErr, setServerErr] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const num = (v) => v !== '' && !isNaN(Number(v)) && Number(v) >= 0

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    const v = {}
    if (!f.employee_id || !(Number(f.employee_id) > 0)) v.employee_id = 'Employee is required'
    ;['basic_salary', 'allowances', 'bonuses', 'deductions'].forEach((k) => { if (!num(f[k])) v[k] = 'Enter a number ≥ 0' })
    if (!f.effective_from) v.effective_from = 'Effective date is required'
    else if (revise && f.effective_from <= revise.effective_from) v.effective_from = `Must be after ${revise.effective_from}`
    if (f.effective_to && f.effective_to < f.effective_from) v.effective_to = 'Cannot be before effective-from'
    setErrs(v)
    if (Object.keys(v).length) return
    setBusy(true); setServerErr('')
    const body = { employee_id: Number(f.employee_id), basic_salary: f.basic_salary, allowances: f.allowances, bonuses: f.bonuses, deductions: f.deductions, effective_from: f.effective_from, effective_to: f.effective_to || null }
    try {
      if (revise) await salaryService.revise(revise.id, body); else await salaryService.create(body)
      toast.success(revise ? 'Salary revised' : 'Salary structure created')
      onSaved()
    } catch (err) { setServerErr(errorMessage(err)) } finally { setBusy(false) }
  }
  return (
    <Modal title={revise ? 'Revise salary' : 'New salary structure'} wide onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button><Button loading={busy} onClick={submit}>{revise ? 'Apply revision' : 'Create'}</Button></>}>
      <form className="form-grid" onSubmit={submit} noValidate>
        {serverErr && <div className="full"><Alert tone="error">{serverErr}</Alert></div>}
        {revise && <div className="full"><Alert tone="info">The current structure will be closed on the new effective date and a new one created.</Alert></div>}
        <div className="full"><FormField label="Employee" required error={errs.employee_id}>
          {canPick && !revise ? (
            <select value={f.employee_id} onChange={set('employee_id')}><option value="">Select employee…</option>
              {employees.filter((x) => x.is_active).map((x) => <option key={x.id} value={x.id}>{x.name} ({x.employee_id})</option>)}</select>
          ) : <input type="number" min="1" value={f.employee_id} onChange={set('employee_id')} disabled={!!revise} placeholder="Employee numeric ID" />}
        </FormField></div>
        <FormField label="Basic salary (₹)" required error={errs.basic_salary}><input type="number" step="0.01" min="0" value={f.basic_salary} onChange={set('basic_salary')} /></FormField>
        <FormField label="Allowances (₹)" error={errs.allowances}><input type="number" step="0.01" min="0" value={f.allowances} onChange={set('allowances')} /></FormField>
        <FormField label="Bonuses (₹)" error={errs.bonuses}><input type="number" step="0.01" min="0" value={f.bonuses} onChange={set('bonuses')} /></FormField>
        <FormField label="Deductions (₹)" error={errs.deductions}><input type="number" step="0.01" min="0" value={f.deductions} onChange={set('deductions')} /></FormField>
        <FormField label="Effective from" required error={errs.effective_from}><input type="date" value={f.effective_from} onChange={set('effective_from')} /></FormField>
        <FormField label="Effective to" error={errs.effective_to} hint="Optional"><input type="date" value={f.effective_to} onChange={set('effective_to')} /></FormField>
        <button type="submit" hidden />
      </form>
    </Modal>
  )
}

export default function Salary() {
  const emps = useEmployees()
  const [empFilter, setEmpFilter] = useState('')
  const [form, setForm] = useState(null) // {} create | structure (revise)
  const q = useFetch(() => salaryService.list(empFilter ? { employee_id: Number(empFilter) } : undefined), [empFilter])

  const cols = [
    { header: 'Employee', render: (s) => <b>{emps.label(s.employee_id)}</b> },
    { header: 'Basic', className: 'right mono', render: (s) => money(s.basic_salary) },
    { header: 'Allowances', className: 'right mono', render: (s) => money(s.allowances) },
    { header: 'Bonuses', className: 'right mono', render: (s) => money(s.bonuses) },
    { header: 'Deductions', className: 'right mono', render: (s) => money(s.deductions) },
    { header: 'Effective', render: (s) => `${fmtDate(s.effective_from)} → ${s.effective_to ? fmtDate(s.effective_to) : 'open'}` },
    { header: 'State', render: (s) => <StatusBadge status={s.effective_to ? 'Inactive' : 'Active'} /> },
    { header: '', className: 'right', render: (s) => !s.effective_to && <Button variant="secondary" className="btn-sm" onClick={() => setForm(s)}>Revise</Button> },
  ]
  return (
    <>
      <PageHeader title="Salary structures" subtitle="Create structures and record revisions" actions={<Button onClick={() => setForm({})}>+ New structure</Button>} />
      {!emps.allowed && <div style={{ marginBottom: 16 }}><Alert tone="info">Employee names are only available to HR/Admin; employees are shown by numeric ID.</Alert></div>}
      <Card pad={false}>
        <div className="toolbar">
          {emps.allowed
            ? <select value={empFilter} onChange={(e) => setEmpFilter(e.target.value)}><option value="">All employees</option>{emps.employees.map((x) => <option key={x.id} value={x.id}>{x.name} ({x.employee_id})</option>)}</select>
            : <input type="number" min="1" placeholder="Filter by employee ID" value={empFilter} onChange={(e) => setEmpFilter(e.target.value)} />}
        </div>
        <DataTable columns={cols} rows={q.data} loading={q.loading} error={q.error} onRetry={q.reload} empty={<EmptyState title="No salary structures" text="Create one so payroll can be calculated." />} />
      </Card>
      {form && <SalaryForm revise={form.id ? form : null} employees={emps.employees} canPick={emps.allowed} onClose={() => setForm(null)} onSaved={() => { setForm(null); q.reload() }} />}
    </>
  )
}
