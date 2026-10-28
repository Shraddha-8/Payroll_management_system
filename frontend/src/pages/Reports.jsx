import { useState } from 'react'
import { useFetch } from '../hooks/useFetch'
import { reportService } from '../services/report'
import { errorMessage } from '../services/api'
import { useToast } from '../context/ToastContext'
import { currentMonth, fmtMonth, money, monthToDate } from '../utils/format'
import { Alert, Button, Card, DataTable, EmptyState, ErrorState, FormField, LoadingState, PageHeader, SummaryCard } from '../components/ui'

export default function Reports() {
  const toast = useToast()
  const [month, setMonth] = useState(currentMonth())
  const [busy, setBusy] = useState(false)
  const date = monthToDate(month)
  const q = useFetch(async () => {
    const [summary, departments] = await Promise.all([reportService.summary(date), reportService.departments(date)])
    return { summary, departments }
  }, [date], !!month)

  const exportCsv = async () => {
    setBusy(true)
    try { await reportService.downloadCsv(date); toast.success('CSV downloaded') } catch (e) { toast.error(errorMessage(e)) } finally { setBusy(false) }
  }
  const s = q.data?.summary
  return (
    <>
      <PageHeader title="Reports" subtitle="Monthly summaries of finalized payroll" actions={<Button variant="secondary" loading={busy} disabled={!month} onClick={exportCsv}>Export CSV</Button>} />
      <div className="stack">
        <Card><div style={{ maxWidth: 240 }}><FormField label="Payroll month"><input type="month" value={month} onChange={(e) => setMonth(e.target.value)} /></FormField></div></Card>
        {q.loading ? <LoadingState /> : q.error ? <ErrorState message={q.error} onRetry={q.reload} /> : s && (<>
          <div className="grid g4">
            <SummaryCard icon="users" label="Employees paid" value={s.total_employees} />
            <SummaryCard icon="wallet" tone="blue" label="Total gross" value={money(s.total_gross_salary)} />
            <SummaryCard icon="alert" tone="amber" label="Total deductions" value={money(s.total_deductions)} hint={`Unpaid leave ${money(s.total_unpaid_leave_deduction)}`} />
            <SummaryCard icon="check" tone="green" label="Total net" value={money(s.total_net_salary)} />
          </div>
          {s.total_employees === 0 && <Alert tone="info">No <b>Finalized</b> payroll for {fmtMonth(date)}. Reports only include finalized payroll.</Alert>}
          <Card title="Department totals" pad={false}>
            <DataTable rows={q.data.departments.map((d) => ({ ...d, id: d.department }))} empty={<EmptyState title="No department data" />}
              columns={[{ header: 'Department', render: (d) => <b>{d.department}</b> }, { header: 'Employees', className: 'right', key: 'total_employees' },
                { header: 'Gross', className: 'right mono', render: (d) => money(d.total_gross_salary) }, { header: 'Deductions', className: 'right mono', render: (d) => money(d.total_deductions) },
                { header: 'Net', className: 'right mono', render: (d) => <b>{money(d.total_net_salary)}</b> }]} />
          </Card></>)}
      </div>
    </>
  )
}
