import { useRef, useState } from 'react'
import { attendanceService } from '../services/attendance'
import { errorMessage } from '../services/api'
import { useToast } from '../context/ToastContext'
import { download } from '../utils/format'
import { Alert, Button, Card, DataTable, PageHeader, SummaryCard } from '../components/ui'

const TEMPLATE = 'employee_id,attendance_date,status,remarks\n1,2026-10-01,Present,\n1,2026-10-02,Absent,Sick\n'

export default function Attendance() {
  const toast = useToast()
  const input = useRef(null)
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const pick = (e) => {
    const f = e.target.files?.[0]
    setResult(null); setError('')
    if (f && !f.name.toLowerCase().endsWith('.csv')) { setFile(null); setError('Only .csv files are allowed.'); return }
    setFile(f || null)
  }
  const upload = async () => {
    if (!file || busy) return
    setBusy(true); setError(''); setResult(null)
    try {
      const r = await attendanceService.importCsv(file)
      setResult(r)
      if (r.success) toast.success(`${r.imported} attendance record(s) imported`)
      else toast.error(r.message)
      setFile(null); if (input.current) input.current.value = ''
    } catch (e) { setError(errorMessage(e)) } finally { setBusy(false) }
  }

  return (
    <>
      <PageHeader title="Attendance import" subtitle="Bulk-load attendance from a CSV file" actions={<Button variant="secondary" onClick={() => download('attendance_template.csv', TEMPLATE)}>Download template</Button>} />
      <div className="stack">
        <Card title="Upload CSV">
          <div className="stack">
            <p className="muted">Required columns: <code>employee_id</code> (numeric database ID), <code>attendance_date</code> (YYYY-MM-DD), <code>status</code> (Present, Absent, Half Day, Holiday, Leave) and <code>remarks</code>. UTF-8 only. Existing dates are skipped and reported.</p>
            {error && <Alert tone="error">{error}</Alert>}
            <div className="row"><input ref={input} type="file" accept=".csv,text/csv" onChange={pick} style={{ maxWidth: 360 }} />
              <Button disabled={!file} loading={busy} onClick={upload}>{busy ? 'Importing…' : 'Import'}</Button></div>
          </div>
        </Card>
        {result && (<>
          {!result.success && <Alert tone="error" title="Import failed">{result.message}</Alert>}
          <div className="grid g4"><SummaryCard icon="check" tone="green" label="Imported" value={result.imported} />
            <SummaryCard icon="alert" tone={result.errors.length ? 'red' : 'green'} label="Rows with issues" value={result.errors.length} /></div>
          {result.errors.length > 0 && (
            <Card title="Attendance issues (rows skipped)" pad={false}>
              <DataTable rows={result.errors.map((e, i) => ({ ...e, id: i }))} pageSize={10}
                columns={[{ header: 'CSV row', key: 'row' }, { header: 'Problem', key: 'error' }]} />
            </Card>)}
        </>)}
        <Alert tone="info" title="What the backend supports">Attendance is write-only through this import. There is no endpoint to list or edit attendance, so "My Attendance" and an attendance register can't be shown. Missing-attendance exceptions are only reported when a payroll is submitted for approval (see the payroll detail page).</Alert>
      </div>
    </>
  )
}
