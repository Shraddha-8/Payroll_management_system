import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useFetch } from '../hooks/useFetch'
import { payslipService } from '../services/payslip'
import { errorMessage } from '../services/api'
import { useToast } from '../context/ToastContext'
import { fmtDateTime } from '../utils/format'
import { Alert, Button, Card, DataTable, EmptyState, PageHeader } from '../components/ui'

export default function MyPayslips() {
  const toast = useToast()
  const { setEmployeeLink } = useAuth()
  const q = useFetch(() => payslipService.mine().then((rows) => { if (rows.length) setEmployeeLink({ status: 'ok', id: rows[0].employee_id }); return rows }), [])
  const [busyId, setBusyId] = useState(null)
  const dl = async (p) => {
    setBusyId(p.id)
    try { await payslipService.download(p.id, `payslip_${p.id}.pdf`) } catch (e) { toast.error(errorMessage(e)) } finally { setBusyId(null) }
  }
  const unlinked = q.error?.toLowerCase().includes('profile not found')
  return (
    <>
      <PageHeader title="My payslips" subtitle="Download payslips for finalized payroll" />
      {unlinked && <div style={{ marginBottom: 16 }}><Alert tone="warn" title="Employee profile not linked">Your login isn't linked to an employee record. Contact HR/Admin.</Alert></div>}
      <Card pad={false}>
        <DataTable rows={q.data} loading={q.loading} error={unlinked ? null : q.error} onRetry={q.reload}
          empty={<EmptyState title={unlinked ? 'No payslips' : 'No payslips yet'} text="Payslips appear here once your payroll is finalized and a payslip is generated." />}
          columns={[{ header: 'Payslip', render: (p) => `#${p.id}` }, { header: 'Payroll', render: (p) => `#${p.payroll_id}` }, { header: 'Generated', render: (p) => fmtDateTime(p.generated_at) },
            { header: '', className: 'right', render: (p) => <Button variant="secondary" className="btn-sm" loading={busyId === p.id} onClick={() => dl(p)}>Download PDF</Button> }]} />
      </Card>
    </>
  )
}
