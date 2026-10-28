import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useFetch } from '../hooks/useFetch'
import { useEmployees } from '../hooks/useEmployees'
import { payrollService } from '../services/payroll'
import { errorMessage } from '../services/api'
import { useToast } from '../context/ToastContext'
import { currentMonth, fmtMonth, money, monthToDate } from '../utils/format'
import { Alert, Button, Card, ConfirmDialog, DataTable, EmptyState, FormField, Modal, PageHeader, StatusBadge, SummaryCard } from '../components/ui'

function GenerateModal({ emps, onClose, onDone }) {
  const toast = useToast()
  const [employeeId, setEmployeeId] = useState('')
  const [month, setMonth] = useState(currentMonth())
  const [err, setErr] = useState({})
  const [serverErr, setServerErr] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    const v = {}
    if (!(Number(employeeId) > 0)) v.employee = 'Employee is required'
    if (!month) v.month = 'Month is required'
    setErr(v)
    if (Object.keys(v).length) return
    setBusy(true); setServerErr('')
    try {
      const p = await payrollService.create({ employee_id: Number(employeeId), payroll_month: monthToDate(month) })
      toast.success('Payroll calculated'); onDone(p)
    } catch (e2) { setServerErr(errorMessage(e2)) } finally { setBusy(false) }
  }
  return (
    <Modal title="Generate payroll" onClose={onClose} footer={<><Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button><Button loading={busy} onClick={submit}>Calculate payroll</Button></>}>
      <form className="stack" onSubmit={submit} noValidate>
        {serverErr && <Alert tone="error">{serverErr}</Alert>}
        <Alert tone="info">Payroll is calculated immediately from the salary structure, attendance and approved leave, and starts as <b>Calculated</b>.</Alert>
        <FormField label="Employee" required error={err.employee}>
          {emps.allowed
            ? <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}><option value="">Select employee…</option>{emps.employees.filter((x) => x.is_active).map((x) => <option key={x.id} value={x.id}>{x.name} ({x.employee_id})</option>)}</select>
            : <input type="number" min="1" placeholder="Employee numeric ID" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} />}
        </FormField>
        <FormField label="Payroll month" required error={err.month}><input type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></FormField>
        <button type="submit" hidden />
      </form>
    </Modal>
  )
}

function BulkModal({ emps, onClose, onDone }) {
  const [month, setMonth] = useState(currentMonth())
  const [busy, setBusy] = useState(false)
  const [res, setRes] = useState(null)
  const run = async () => {
    setBusy(true)
    const active = emps.employees.filter((e) => e.is_active)
    const out = { ok: 0, failed: [] }
    for (const e of active) { // sequential: each call is a real POST /payroll/
      try { await payrollService.create({ employee_id: e.id, payroll_month: monthToDate(month) }); out.ok++ }
      catch (err) { out.failed.push({ id: e.id, name: e.name, reason: errorMessage(err) }) }
    }
    setRes(out); setBusy(false); onDone()
  }
  return (
    <Modal title="Generate for all active employees" onClose={onClose} wide footer={res ? <Button onClick={onClose}>Close</Button> : <><Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button><Button loading={busy} onClick={run}>Run</Button></>}>
      {!res ? (<div className="stack"><p>Creates one payroll per active employee for the chosen month. Employees with an existing payroll or no salary structure are reported and skipped.</p>
        <FormField label="Payroll month"><input type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></FormField></div>) : (
        <div className="stack"><Alert tone={res.failed.length ? 'warn' : 'success'} title={`${res.ok} created, ${res.failed.length} skipped`} />
          {res.failed.length > 0 && <div className="table-wrap"><table className="table"><thead><tr><th>Employee</th><th>Reason</th></tr></thead><tbody>{res.failed.map((f) => <tr key={f.id}><td>{f.name}</td><td>{f.reason}</td></tr>)}</tbody></table></div>}</div>)}
    </Modal>
  )
}

export default function PayrollList() {
  const emps = useEmployees()
  const [month, setMonth] = useState('')
  const [status, setStatus] = useState('')
  const [empId, setEmpId] = useState('')
  const [gen, setGen] = useState(false)
  const [bulk, setBulk] = useState(false)
  const params = { payroll_month: month ? monthToDate(month) : undefined, payroll_status: status || undefined, employee_id: empId ? Number(empId) : undefined }
  const q = useFetch(() => payrollService.list(params), [month, status, empId])
  const rows = q.data || []
  const sum = (k) => rows.reduce((a, r) => a + Number(r[k]), 0)
  const count = (s) => rows.filter((r) => r.status === s).length

  const cols = [
    { header: 'ID', render: (p) => <Link to={`/payroll/${p.id}`}>#{p.id}</Link> },
    { header: 'Employee', render: (p) => <b>{emps.label(p.employee_id)}</b> },
    { header: 'Month', render: (p) => fmtMonth(p.payroll_month) },
    { header: 'Gross', className: 'right mono', render: (p) => money(p.gross_salary) },
    { header: 'Deductions', className: 'right mono', render: (p) => money(Number(p.deductions) + Number(p.unpaid_leave_deduction)) },
    { header: 'Net', className: 'right mono', render: (p) => <b>{money(p.net_salary)}</b> },
    { header: 'Status', render: (p) => <StatusBadge status={p.status} /> },
    { header: '', className: 'right', render: (p) => <Link to={`/payroll/${p.id}`}>Open →</Link> },
  ]
  return (
    <>
      <PageHeader title="Payroll" subtitle="Calculate, review, approve and finalize" actions={<>
        {emps.allowed && <Button variant="secondary" onClick={() => setBulk(true)}>Generate for all</Button>}
        <Button onClick={() => setGen(true)}>+ Generate payroll</Button></>} />
      <div className="grid g4" style={{ marginBottom: 20 }}>
        <SummaryCard icon="cash" label="Records (filtered)" value={rows.length} />
        <SummaryCard icon="wallet" tone="blue" label="Total gross" value={money(sum('gross_salary'))} />
        <SummaryCard icon="check" tone="green" label="Total net" value={money(sum('net_salary'))} />
        <SummaryCard icon="file" tone="amber" label="Awaiting action" value={count('Calculated') + count('Pending Approval') + count('Approved')} hint={`${count('Pending Approval')} pending approval`} />
      </div>
      <Card pad={false}>
        <div className="toolbar">
          <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} aria-label="Month" />
          <select value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All statuses</option>{['Calculated', 'Pending Approval', 'Approved', 'Finalized', 'Rejected'].map((s) => <option key={s}>{s}</option>)}</select>
          {emps.allowed
            ? <select value={empId} onChange={(e) => setEmpId(e.target.value)}><option value="">All employees</option>{emps.employees.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
            : <input type="number" min="1" placeholder="Employee ID" value={empId} onChange={(e) => setEmpId(e.target.value)} />}
          {(month || status || empId) && <Button variant="secondary" onClick={() => { setMonth(''); setStatus(''); setEmpId('') }}>Clear</Button>}
        </div>
        <DataTable columns={cols} rows={q.data} loading={q.loading} error={q.error} onRetry={q.reload} empty={<EmptyState title="No payroll records" text="Generate payroll for an employee and month to begin." />} />
      </Card>
      {gen && <GenerateModal emps={emps} onClose={() => setGen(false)} onDone={() => { setGen(false); q.reload() }} />}
      {bulk && <BulkModal emps={emps} onClose={() => setBulk(false)} onDone={q.reload} />}
    </>
  )
}
