import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useFetch } from '../hooks/useFetch'
import { employeeService, leaveService, payrollService, payslipService, notificationService } from '../services'
import { ROLES } from '../utils/roles'
import { money } from '../utils/format'
import { Alert, Card, ErrorState, LoadingState, PageHeader, StatusBadge, SummaryCard } from '../components/ui'

const settle = (p) => p.then((v) => ({ ok: true, v })).catch(() => ({ ok: false, v: null }))

export default function Dashboard() {
  const { user, role, employeeLink } = useAuth()
  const isStaff = role !== ROLES.EMPLOYEE
  const canEmp = role === ROLES.ADMIN || role === ROLES.HR

  const q = useFetch(async () => {
    const [emps, leaves, payrolls, notifs, slips] = await Promise.all([
      canEmp ? settle(employeeService.list()) : { ok: false },
      canEmp ? settle(leaveService.list({ request_status: 'Pending' })) : { ok: false },
      isStaff ? settle(payrollService.list()) : { ok: false },
      settle(notificationService.list()),
      role === ROLES.EMPLOYEE ? settle(payslipService.mine()) : { ok: false },
    ])
    return { emps, leaves, payrolls, notifs, slips }
  }, [role])

  if (q.loading) return <LoadingState />
  if (q.error) return <ErrorState message={q.error} onRetry={q.reload} />
  const { emps, leaves, payrolls, notifs, slips } = q.data
  const unread = notifs.ok ? notifs.v.filter((n) => !n.is_read).length : '—'
  const pay = payrolls.ok ? payrolls.v : []
  const by = (s) => pay.filter((p) => p.status === s).length
  const recent = pay.slice(0, 5)

  return (
    <>
      <PageHeader title={`Welcome back, ${user.name.split(' ')[0]}`} subtitle={`${role} dashboard`} />
      {role === ROLES.EMPLOYEE && employeeLink.status === 'unlinked' && (
        <div style={{ marginBottom: 16 }}><Alert tone="warn" title="Employee profile not linked">Your login is not linked to an employee record yet, so payslips and leave data are unavailable. Ask HR/Admin to link your account.</Alert></div>
      )}
      <div className="grid g4" style={{ marginBottom: 20 }}>
        {canEmp && emps.ok && <SummaryCard icon="users" label="Active employees" value={emps.v.filter((e) => e.is_active).length} hint={`${emps.v.length} total`} />}
        {canEmp && leaves.ok && <SummaryCard icon="plane" tone="amber" label="Pending leave requests" value={leaves.v.length} />}
        {isStaff && payrolls.ok && <>
          <SummaryCard icon="cash" tone="blue" label="Calculated payrolls" value={by('Calculated')} hint="Ready to submit" />
          <SummaryCard icon="file" tone="amber" label="Pending approval" value={by('Pending Approval')} />
          <SummaryCard icon="check" tone="green" label="Approved (to finalize)" value={by('Approved')} />
        </>}
        {role === ROLES.EMPLOYEE && slips.ok && <SummaryCard icon="file" label="My payslips" value={slips.v.length} />}
        <SummaryCard icon="bell" tone="red" label="Unread notifications" value={unread} />
      </div>
      {isStaff && (
        <Card title="Recent payroll" actions={<Link to="/payroll">View all</Link>} pad={false}>
          {!payrolls.ok ? <div className="card-body"><Alert tone="error">Payroll data could not be loaded.</Alert></div> :
            recent.length === 0 ? <div className="state"><p>No payroll records yet.</p></div> : (
            <div className="table-wrap"><table className="table"><thead><tr><th>ID</th><th>Employee</th><th>Month</th><th className="right">Net</th><th>Status</th></tr></thead>
              <tbody>{recent.map((p) => (<tr key={p.id}><td><Link to={`/payroll/${p.id}`}>#{p.id}</Link></td><td>#{p.employee_id}</td><td>{p.payroll_month.slice(0, 7)}</td><td className="right mono">{money(p.net_salary)}</td><td><StatusBadge status={p.status} /></td></tr>))}</tbody></table></div>)}
        </Card>
      )}
    </>
  )
}
