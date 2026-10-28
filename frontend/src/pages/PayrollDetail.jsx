import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useFetch } from '../hooks/useFetch'
import { useEmployees } from '../hooks/useEmployees'
import { payrollService } from '../services/payroll'
import { payslipService } from '../services/payslip'
import { errorMessage } from '../services/api'
import { useToast } from '../context/ToastContext'
import { fmtDate, fmtMonth, money } from '../utils/format'
import { ROLES } from '../utils/roles'
import { Alert, Button, Card, ConfirmDialog, EmptyState, ErrorState, FormField, LoadingState, Modal, PageHeader, StatusBadge, WorkflowStepper } from '../components/ui'

export default function PayrollDetail() {
  const { id } = useParams()
  const { role } = useAuth()
  const toast = useToast()
  const emps = useEmployees()
  // Backend has no GET /payroll/{id}: load the list and select the record.
  const q = useFetch(() => payrollService.list().then((l) => l.find((p) => p.id === Number(id)) || null), [id])
  const [dialog, setDialog] = useState(null) // submit | approve | finalize | reject | payslip
  const [reason, setReason] = useState('')
  const [reasonErr, setReasonErr] = useState('')
  const [exception, setException] = useState('')
  const [payslipMsg, setPayslipMsg] = useState('')

  if (q.loading) return <LoadingState />
  if (q.error) return <ErrorState message={q.error} onRetry={q.reload} />
  if (!q.data) return <EmptyState title="Payroll not found" action={<Link to="/payroll">Back to payroll</Link>} />
  const p = q.data
  const close = () => { setDialog(null); setReason(''); setReasonErr('') }

  const act = async (fn, okMsg, onErr) => {
    try { await fn(); toast.success(okMsg); close(); q.reload(); return true }
    catch (e) { const m = errorMessage(e); if (onErr) onErr(m); else toast.error(m); close(); return false }
  }
  const submit = () => act(() => payrollService.submit(p.id), 'Submitted for approval', (m) => { setException(m); toast.error('Submission blocked — see exception below') })
  const approve = () => act(() => payrollService.decide(p.id, 'Approved'), 'Payroll approved')
  const finalize = () => act(() => payrollService.finalize(p.id), 'Payroll finalized')
  const generatePayslip = async () => {
    try { const r = await payslipService.generate(p.id); setPayslipMsg(r.message); toast.success('Payslip generated') } catch (e) { toast.error(errorMessage(e)) }
    close()
  }
  const rejectGo = async () => {
    if (!reason.trim()) { setReasonErr('A rejection reason is required'); return }
    await act(() => payrollService.decide(p.id, 'Rejected', reason.trim()), 'Payroll rejected')
  }
  const canPayslip = (role === ROLES.ADMIN || role === ROLES.HR) && p.status === 'Finalized'

  return (
    <>
      <PageHeader title={`Payroll #${p.id}`} subtitle={<><Link to="/payroll">← Payroll</Link> · {emps.label(p.employee_id)} · {fmtMonth(p.payroll_month)}</>} actions={<StatusBadge status={p.status} />} />
      <div className="stack">
        <Card title="Workflow"><WorkflowStepper status={p.status} />
          <div className="row" style={{ marginTop: 20, justifyContent: 'center' }}>
            {p.status === 'Calculated' && <Button onClick={() => setDialog('submit')}>Submit for approval</Button>}
            {p.status === 'Pending Approval' && <><Button variant="success" onClick={() => setDialog('approve')}>Approve</Button><Button variant="danger" onClick={() => setDialog('reject')}>Reject</Button></>}
            {p.status === 'Approved' && <Button onClick={() => setDialog('finalize')}>Finalize payroll</Button>}
            {canPayslip && <Button variant="secondary" onClick={() => setDialog('payslip')}>Generate payslip</Button>}
          </div>
        </Card>
        {exception && <Alert tone="error" title="Payroll exception — submission blocked">{exception}<div className="small" style={{ marginTop: 6 }}>Import the missing attendance (Attendance → Import) and submit again.</div></Alert>}
        {p.status === 'Rejected' && <Alert tone="error" title="Rejected">{p.rejection_reason || 'No reason recorded.'}<div className="small" style={{ marginTop: 6 }}>The backend offers no way to recalculate or resubmit a rejected payroll.</div></Alert>}
        {p.status === 'Finalized' && <Alert tone="info" title="Finalized and locked">Finalized on {fmtDate(p.finalized_at)}. It can no longer change through normal actions. The backend has no payroll-correction endpoint yet, so corrections can't be started from the UI.</Alert>}
        {payslipMsg && <Alert tone="success">{payslipMsg}. The employee can download it from “My Payslips”.</Alert>}
        <Card title="Calculation"><dl className="dl">
          <dt>Basic salary</dt><dd className="mono">{money(p.basic_salary)}</dd><dt>Allowances</dt><dd className="mono">{money(p.allowances)}</dd><dt>Bonuses</dt><dd className="mono">{money(p.bonuses)}</dd>
          <dt>Gross salary</dt><dd className="mono"><b>{money(p.gross_salary)}</b></dd><dt>Deductions</dt><dd className="mono">{money(p.deductions)}</dd>
          <dt>Unpaid leave deduction</dt><dd className="mono">{money(p.unpaid_leave_deduction)}</dd><dt>Net salary</dt><dd className="mono"><b>{money(p.net_salary)}</b></dd></dl></Card>
      </div>

      {dialog === 'submit' && <ConfirmDialog title="Submit for approval" confirmLabel="Submit" onCancel={close} onConfirm={submit} message="Attendance is re-checked on submit. If working days are missing, submission is blocked." />}
      {dialog === 'approve' && <ConfirmDialog title="Approve payroll" confirmLabel="Approve" onCancel={close} onConfirm={approve} message={`Approve ${money(p.net_salary)} net pay for ${emps.label(p.employee_id)}?`} />}
      {dialog === 'finalize' && <ConfirmDialog title="Finalize payroll" confirmLabel="Finalize" danger onCancel={close} onConfirm={finalize} message="Finalizing locks this payroll. This cannot be undone from the UI." />}
      {dialog === 'payslip' && <ConfirmDialog title="Generate payslip" confirmLabel="Generate" onCancel={close} onConfirm={generatePayslip} message="Generate the PDF payslip for this finalized payroll? One payslip can exist per payroll." />}
      {dialog === 'reject' && (
        <Modal title="Reject payroll" onClose={close} footer={<><Button variant="secondary" onClick={close}>Cancel</Button><Button variant="danger" onClick={rejectGo}>Reject payroll</Button></>}>
          <FormField label="Rejection reason" required error={reasonErr}><textarea rows={4} value={reason} onChange={(e) => { setReason(e.target.value); setReasonErr('') }} /></FormField>
        </Modal>)}
    </>
  )
}
