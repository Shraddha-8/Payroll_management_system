import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useFetch } from '../hooks/useFetch'
import { useEmployees } from '../hooks/useEmployees'
import { leaveService } from '../services/leave'
import { errorMessage } from '../services/api'
import { useToast } from '../context/ToastContext'
import { fmtDate } from '../utils/format'
import { Alert, Button, Card, ConfirmDialog, DataTable, EmptyState, FormField, LoadingState, Modal, PageHeader, StatusBadge } from '../components/ui'

function LeaveForm({ leave, fixedEmployeeId, employees, onClose, onSaved }) {
  const toast = useToast()
  const [f, setF] = useState({ employee_id: leave?.employee_id ?? fixedEmployeeId ?? '', start_date: leave?.start_date || '', end_date: leave?.end_date || '', reason: leave?.reason || '' })
  const [errs, setErrs] = useState({})
  const [serverErr, setServerErr] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    const v = {}
    if (!f.employee_id) v.employee_id = 'Employee is required'
    if (!f.start_date) v.start_date = 'Start date is required'
    if (!f.end_date) v.end_date = 'End date is required'
    else if (f.start_date && f.end_date < f.start_date) v.end_date = 'End date cannot be before start date'
    if (!f.reason.trim()) v.reason = 'Reason is required'
    setErrs(v)
    if (Object.keys(v).length) return
    setBusy(true); setServerErr('')
    try {
      if (leave) await leaveService.update(leave.id, { start_date: f.start_date, end_date: f.end_date, reason: f.reason.trim() })
      else await leaveService.create({ employee_id: Number(f.employee_id), start_date: f.start_date, end_date: f.end_date, reason: f.reason.trim() })
      toast.success(leave ? 'Leave request updated' : 'Leave request submitted')
      onSaved()
    } catch (err) { setServerErr(errorMessage(err)) } finally { setBusy(false) }
  }
  return (
    <Modal title={leave ? 'Edit leave request' : 'New leave request'} onClose={onClose}
      footer={<><Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button><Button loading={busy} onClick={submit}>{leave ? 'Save' : 'Submit request'}</Button></>}>
      <form className="stack" onSubmit={submit} noValidate>
        {serverErr && <Alert tone="error">{serverErr}</Alert>}
        {!fixedEmployeeId && <FormField label="Employee" required error={errs.employee_id}>
          <select value={f.employee_id} onChange={set('employee_id')} disabled={!!leave}><option value="">Select employee…</option>
            {employees.filter((x) => x.is_active).map((x) => <option key={x.id} value={x.id}>{x.name} ({x.employee_id})</option>)}</select></FormField>}
        <div className="form-grid"><FormField label="Start date" required error={errs.start_date}><input type="date" value={f.start_date} onChange={set('start_date')} /></FormField>
          <FormField label="End date" required error={errs.end_date}><input type="date" value={f.end_date} onChange={set('end_date')} /></FormField></div>
        <FormField label="Reason" required error={errs.reason}><textarea rows={3} maxLength={500} value={f.reason} onChange={set('reason')} /></FormField>
        <button type="submit" hidden />
      </form>
    </Modal>
  )
}

function RejectDialog({ onCancel, onSubmit }) {
  const [reason, setReason] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const go = async () => {
    if (!reason.trim()) { setErr('A rejection reason is required'); return }
    setBusy(true); try { await onSubmit(reason.trim()) } finally { setBusy(false) }
  }
  return (
    <Modal title="Reject leave request" onClose={onCancel} footer={<><Button variant="secondary" onClick={onCancel} disabled={busy}>Cancel</Button><Button variant="danger" loading={busy} onClick={go}>Reject</Button></>}>
      <FormField label="Reason" required error={err}><textarea rows={3} value={reason} onChange={(e) => { setReason(e.target.value); setErr('') }} /></FormField>
    </Modal>
  )
}

export default function Leaves({ mode }) {
  const manage = mode === 'manage'
  const toast = useToast()
  const { employeeLink } = useAuth()
  const emps = useEmployees()
  const [status, setStatus] = useState('')
  const [empFilter, setEmpFilter] = useState('')
  const [form, setForm] = useState(null)
  const [approve, setApprove] = useState(null)
  const [reject, setReject] = useState(null)

  const myId = employeeLink.id
  const ready = manage || employeeLink.status === 'ok'
  // Employees must always be scoped by employee_id: the backend would otherwise return everyone's leave.
  const params = manage ? { request_status: status || undefined, employee_id: empFilter ? Number(empFilter) : undefined } : { employee_id: myId, request_status: status || undefined }
  const q = useFetch(() => leaveService.list(params), [status, empFilter, myId], ready)

  const decide = async (l, decision, reason) => {
    try { await leaveService.decide(l.id, decision, reason); toast.success(`Leave ${decision.toLowerCase()}`); setApprove(null); setReject(null); q.reload() }
    catch (e) { toast.error(errorMessage(e)); setApprove(null); setReject(null) }
  }

  const cols = [
    ...(manage ? [{ header: 'Employee', render: (l) => <b>{emps.label(l.employee_id)}</b> }] : []),
    { header: 'From', render: (l) => fmtDate(l.start_date) }, { header: 'To', render: (l) => fmtDate(l.end_date) },
    { header: 'Reason', render: (l) => <span title={l.reason}>{l.reason.length > 50 ? `${l.reason.slice(0, 50)}…` : l.reason}</span> },
    { header: 'Status', render: (l) => <><StatusBadge status={l.status} />{l.rejection_reason && <div className="muted small">{l.rejection_reason}</div>}</> },
    { header: 'Actions', className: 'right', render: (l) => l.status !== 'Pending' ? null : (
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <Button variant="secondary" className="btn-sm" onClick={() => setForm(l)}>Edit</Button>
        {manage && <><Button variant="success" className="btn-sm" onClick={() => setApprove(l)}>Approve</Button><Button variant="danger" className="btn-sm" onClick={() => setReject(l)}>Reject</Button></>}
      </div>) },
  ]

  return (
    <>
      <PageHeader title={manage ? 'Leave requests' : 'My leaves'} subtitle={manage ? 'Review and decide on leave requests' : 'Your leave requests'}
        actions={ready && <Button onClick={() => setForm({ new: true })}>+ New request</Button>} />
      {!manage && employeeLink.status === 'loading' && <LoadingState />}
      {!manage && ['unlinked', 'unknown', 'idle'].includes(employeeLink.status) && (
        <Alert tone="warn" title="Your employee record couldn't be resolved">
          The backend gives employees no endpoint to look up their own record; it is only discoverable through your payslips. {employeeLink.status === 'unlinked' ? 'Your login is not linked to an employee record.' : 'You have no payslips yet.'} Ask HR to submit a leave request for you in the meantime.
        </Alert>)}
      {ready && (
        <Card pad={false}>
          <div className="toolbar">
            <select value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All statuses</option><option>Pending</option><option>Approved</option><option>Rejected</option></select>
            {manage && <select value={empFilter} onChange={(e) => setEmpFilter(e.target.value)}><option value="">All employees</option>{emps.employees.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>}
          </div>
          <DataTable columns={cols} rows={q.data} loading={q.loading} error={q.error} onRetry={q.reload} empty={<EmptyState title="No leave requests" />} />
        </Card>)}
      {form && <LeaveForm leave={form.id ? form : null} fixedEmployeeId={manage ? undefined : myId} employees={emps.employees} onClose={() => setForm(null)} onSaved={() => { setForm(null); q.reload() }} />}
      {approve && <ConfirmDialog title="Approve leave" confirmLabel="Approve" onCancel={() => setApprove(null)} onConfirm={() => decide(approve, 'Approved')} message={`Approve leave for ${emps.label(approve.employee_id)} (${fmtDate(approve.start_date)} – ${fmtDate(approve.end_date)})? Approved leave days are treated as unpaid in payroll.`} />}
      {reject && <RejectDialog onCancel={() => setReject(null)} onSubmit={(r) => decide(reject, 'Rejected', r)} />}
    </>
  )
}
