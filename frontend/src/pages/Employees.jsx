import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useFetch } from '../hooks/useFetch'
import { employeeService } from '../services/employee'
import { errorMessage } from '../services/api'
import { useToast } from '../context/ToastContext'
import { fmtDate } from '../utils/format'
import EmployeeForm from '../components/EmployeeForm'
import { Button, Card, ConfirmDialog, DataTable, EmptyState, PageHeader, StatusBadge } from '../components/ui'

export default function Employees() {
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [department, setDepartment] = useState('')
  const [status, setStatus] = useState('')
  const [form, setForm] = useState(null) // null | {} (create) | employee (edit)
  const [confirm, setConfirm] = useState(null)

  useEffect(() => { const t = setTimeout(() => setDebounced(search.trim()), 350); return () => clearTimeout(t) }, [search])
  const params = { search: debounced || undefined, department: department || undefined, employment_status: status || undefined }
  const q = useFetch(() => employeeService.list(params), [debounced, department, status])
  const all = useFetch(() => employeeService.list(), [])
  const departments = [...new Set((all.data || []).map((e) => e.department))].sort()
  const filtered = !!(debounced || department || status)

  const deactivate = async () => {
    try { await employeeService.deactivate(confirm.id); toast.success(`${confirm.name} deactivated`); setConfirm(null); q.reload(); all.reload() }
    catch (e) { toast.error(errorMessage(e)); setConfirm(null) }
  }
  const cols = [
    { header: 'Emp. ID', render: (e) => <Link to={`/employees/${e.id}`}>{e.employee_id}</Link> },
    { header: 'Name', render: (e) => <b>{e.name}</b> },
    { header: 'Email', key: 'email' },
    { header: 'Department', key: 'department' },
    { header: 'Joined', render: (e) => fmtDate(e.joining_date) },
    { header: 'Status', render: (e) => <StatusBadge status={e.employment_status} /> },
    { header: 'Actions', className: 'right', render: (e) => (
      <div className="row" style={{ justifyContent: 'flex-end' }}>
        <Button variant="secondary" className="btn-sm" onClick={() => setForm(e)}>Edit</Button>
        {e.is_active && <Button variant="secondary" className="btn-sm" onClick={() => setConfirm(e)}>Deactivate</Button>}
      </div>) },
  ]
  return (
    <>
      <PageHeader title="Employees" subtitle="Manage employee records" actions={<Button onClick={() => setForm({})}>+ Add employee</Button>} />
      <Card pad={false}>
        <div className="toolbar">
          <input type="search" placeholder="Search name, ID or email…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <select value={department} onChange={(e) => setDepartment(e.target.value)}><option value="">All departments</option>{departments.map((d) => <option key={d}>{d}</option>)}</select>
          <select value={status} onChange={(e) => setStatus(e.target.value)}><option value="">All statuses</option><option>Active</option><option>Inactive</option></select>
        </div>
        <DataTable columns={cols} rows={q.data} loading={q.loading} error={q.error} onRetry={q.reload}
          empty={<EmptyState title={filtered ? 'No matching employees' : 'No employees yet'} text={filtered ? 'Try different filters.' : 'Add your first employee to get started.'} />} />
      </Card>
      {form && <EmployeeForm employee={form.id ? form : null} onClose={() => setForm(null)} onSaved={() => { setForm(null); q.reload(); all.reload() }} />}
      {confirm && <ConfirmDialog danger title="Deactivate employee" confirmLabel="Deactivate" onCancel={() => setConfirm(null)} onConfirm={deactivate}
        message={`Deactivate ${confirm.name}? Their status becomes Inactive and no new payroll can be created for them.`} />}
    </>
  )
}
