import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useFetch } from '../hooks/useFetch'
import { employeeService, salaryService, payrollService } from '../services'
import { errorMessage } from '../services/api'
import { useToast } from '../context/ToastContext'
import { fmtDate, fmtMonth, money } from '../utils/format'
import EmployeeForm from '../components/EmployeeForm'
import { Button, Card, ConfirmDialog, DataTable, EmptyState, ErrorState, LoadingState, PageHeader, StatusBadge } from '../components/ui'

export default function EmployeeDetail() {
  const { id } = useParams()
  const toast = useToast()
  const [edit, setEdit] = useState(false)
  const [confirm, setConfirm] = useState(false)
  // Backend has no GET /employees/{id}: load the list and pick the record.
  const emp = useFetch(() => employeeService.list().then((l) => l.find((e) => e.id === Number(id)) || null), [id])
  const sal = useFetch(() => salaryService.list({ employee_id: Number(id) }), [id])
  const pay = useFetch(() => payrollService.list({ employee_id: Number(id) }), [id])

  if (emp.loading) return <LoadingState />
  if (emp.error) return <ErrorState message={emp.error} onRetry={emp.reload} />
  if (!emp.data) return <EmptyState title="Employee not found" action={<Link to="/employees">Back to employees</Link>} />
  const e = emp.data

  const deactivate = async () => {
    try { await employeeService.deactivate(e.id); toast.success('Employee deactivated'); setConfirm(false); emp.reload() }
    catch (err) { toast.error(errorMessage(err)); setConfirm(false) }
  }
  return (
    <>
      <PageHeader title={e.name} subtitle={<><Link to="/employees">← Employees</Link> · {e.employee_id}</>}
        actions={<><Button variant="secondary" onClick={() => setEdit(true)}>Edit</Button>
          {e.is_active && <Button variant="secondary" onClick={() => setConfirm(true)}>Deactivate</Button>}</>} />
      <div className="stack">
        <Card title="Details"><dl className="dl">
          <dt>Employee ID</dt><dd>{e.employee_id}</dd><dt>Email</dt><dd>{e.email}</dd><dt>Department</dt><dd>{e.department}</dd>
          <dt>Joining date</dt><dd>{fmtDate(e.joining_date)}</dd><dt>Status</dt><dd><StatusBadge status={e.employment_status} /></dd></dl></Card>
        <Card title="Salary history" actions={<Link to="/salary">Manage salary</Link>} pad={false}>
          <DataTable rows={sal.data} loading={sal.loading} error={sal.error} onRetry={sal.reload} empty={<EmptyState title="No salary structure" />}
            columns={[{ header: 'From', render: (s) => fmtDate(s.effective_from) }, { header: 'To', render: (s) => (s.effective_to ? fmtDate(s.effective_to) : 'Current') },
              { header: 'Basic', className: 'right', render: (s) => money(s.basic_salary) }, { header: 'Allowances', className: 'right', render: (s) => money(s.allowances) },
              { header: 'Bonuses', className: 'right', render: (s) => money(s.bonuses) }, { header: 'Deductions', className: 'right', render: (s) => money(s.deductions) }]} />
        </Card>
        <Card title="Payroll history" pad={false}>
          <DataTable rows={pay.data} loading={pay.loading} error={pay.error} onRetry={pay.reload} empty={<EmptyState title="No payroll yet" />}
            columns={[{ header: 'Month', render: (p) => <Link to={`/payroll/${p.id}`}>{fmtMonth(p.payroll_month)}</Link> },
              { header: 'Gross', className: 'right', render: (p) => money(p.gross_salary) }, { header: 'Net', className: 'right', render: (p) => money(p.net_salary) },
              { header: 'Status', render: (p) => <StatusBadge status={p.status} /> }]} />
        </Card>
      </div>
      {edit && <EmployeeForm employee={e} onClose={() => setEdit(false)} onSaved={() => { setEdit(false); emp.reload() }} />}
      {confirm && <ConfirmDialog danger title="Deactivate employee" confirmLabel="Deactivate" onCancel={() => setConfirm(false)} onConfirm={deactivate} message={`Deactivate ${e.name}?`} />}
    </>
  )
}
