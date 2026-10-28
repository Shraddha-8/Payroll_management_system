import { useFetch } from '../hooks/useFetch'
import { adminService } from '../services/admin'
import { Alert, Card, ErrorState, LoadingState, PageHeader, SummaryCard } from '../components/ui'

export default function Admin() {
  const q = useFetch(async () => {
    const [health, access] = await Promise.all([adminService.health(), adminService.check()])
    return { health, access }
  }, [])
  return (
    <>
      <PageHeader title="Administration" subtitle="System status" />
      <div className="stack">
        {q.loading ? <LoadingState /> : q.error ? <ErrorState message={q.error} onRetry={q.reload} /> : (
          <div className="grid g4">
            <SummaryCard icon="check" tone="green" label="API health" value={q.data.health.status} />
            <SummaryCard icon="shield" label="Admin access" value="Granted" hint={q.data.access.user} />
          </div>)}
        <Card title="Not available in the backend"><ul style={{ margin: 0, paddingLeft: 18 }}>
          <li>User management (create/deactivate users, assign roles) — only the <code>create_admin.py</code> script exists.</li>
          <li>Linking a login to an employee record (<code>employees.user_id</code>) — no endpoint.</li>
          <li>Payroll correction, payroll preview, attendance register and password change.</li></ul></Card>
        <Alert tone="info">Audit logs are under <b>Audit Logs</b> in the sidebar.</Alert>
      </div>
    </>
  )
}
