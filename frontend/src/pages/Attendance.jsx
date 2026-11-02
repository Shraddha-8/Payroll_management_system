import { useEffect, useRef, useState } from 'react'
import { attendanceService } from '../services/attendance'
import { employeeService } from '../services/employee'
import { errorMessage } from '../services/api'
import { useToast } from '../context/ToastContext'
import { download } from '../utils/format'

import {
  Alert,
  Button,
  Card,
  DataTable,
  PageHeader,
  SummaryCard,
} from '../components/ui'

const TEMPLATE =
  'employee_id,attendance_date,status,remarks\n' +
  '1,2026-10-01,Present,\n' +
  '1,2026-10-02,Absent,Sick\n'

const STATUSES = [
  'Present',
  'Absent',
  'Half Day',
  'Holiday',
  'Leave',
]

export default function Attendance() {
  const toast = useToast()
  const input = useRef(null)

  const [employees, setEmployees] = useState([])
  const [records, setRecords] = useState([])

  const [employeeId, setEmployeeId] = useState('')
  const [attendanceDate, setAttendanceDate] = useState('')
  const [status, setStatus] = useState('Present')
  const [remarks, setRemarks] = useState('')

  const [busy, setBusy] = useState(false)
  const [loadingEmployees, setLoadingEmployees] = useState(false)
  const [loadingRecords, setLoadingRecords] = useState(false)

  const [file, setFile] = useState(null)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  // ============================================================
  // LOAD EMPLOYEES
  // ============================================================

  useEffect(() => {
    loadEmployees()
  }, [])

  const loadEmployees = async () => {
    setLoadingEmployees(true)
    setError('')

    try {
      // Your actual employee.js exposes list(), not listAll().
      const data = await employeeService.list()

      // Backend may return either:
      // 1. direct array
      // 2. { items: [...] }
      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.items)
          ? data.items
          : []

      setEmployees(list)

      // Keep dropdown valid if current employee was removed/deactivated.
      if (
        employeeId &&
        !list.some((employee) => String(employee.id) === String(employeeId))
      ) {
        setEmployeeId('')
        setRecords([])
      }
    } catch (e) {
      const message = errorMessage(e)
      setError(message)
      toast.error(message)
    } finally {
      setLoadingEmployees(false)
    }
  }

  // ============================================================
  // LOAD ATTENDANCE FOR SELECTED EMPLOYEE
  // ============================================================

  const loadAttendance = async () => {
    if (!employeeId) {
      setRecords([])
      return
    }

    setLoadingRecords(true)
    setError('')

    try {
      const data = await attendanceService.forEmployee(employeeId)

      const list = Array.isArray(data)
        ? data
        : Array.isArray(data?.items)
          ? data.items
          : []

      setRecords(list)
    } catch (e) {
      const message = errorMessage(e)
      setError(message)
    } finally {
      setLoadingRecords(false)
    }
  }

  useEffect(() => {
    loadAttendance()
  }, [employeeId])

  // ============================================================
  // MARK / UPDATE ATTENDANCE
  // ============================================================

  const saveAttendance = async () => {
    if (!employeeId || !attendanceDate || !status) {
      setError(
        'Employee, date and attendance status are required.'
      )
      return
    }

    setBusy(true)
    setError('')

    try {
      await attendanceService.upsert({
        employee_id: Number(employeeId),
        attendance_date: attendanceDate,
        status,
        remarks: remarks.trim() || null,
      })

      toast.success('Attendance saved successfully.')

      setRemarks('')

      await loadAttendance()
    } catch (e) {
      const message = errorMessage(e)
      setError(message)
      toast.error(message)
    } finally {
      setBusy(false)
    }
  }

  // ============================================================
  // CSV FILE PICK
  // ============================================================

  const pick = (e) => {
    const selectedFile = e.target.files?.[0]

    setResult(null)
    setError('')

    if (
      selectedFile &&
      !selectedFile.name.toLowerCase().endsWith('.csv')
    ) {
      setFile(null)
      setError('Only .csv files are allowed.')
      return
    }

    setFile(selectedFile || null)
  }

  // ============================================================
  // CSV IMPORT
  // ============================================================

  const upload = async () => {
    if (!file || busy) return

    setBusy(true)
    setError('')
    setResult(null)

    try {
      const response = await attendanceService.importCsv(file)

      setResult(response)

      if (response.success) {
        toast.success(
          `${response.imported || 0} attendance record(s) imported.`
        )
      } else {
        toast.error(
          response.message || 'Attendance import completed with issues.'
        )
      }

      setFile(null)

      if (input.current) {
        input.current.value = ''
      }

      if (employeeId) {
        await loadAttendance()
      }
    } catch (e) {
      const message = errorMessage(e)
      setError(message)
      toast.error(message)
    } finally {
      setBusy(false)
    }
  }

  // ============================================================
  // SELECTED EMPLOYEE
  // ============================================================

  const selectedEmployee = employees.find(
    (employee) =>
      String(employee.id) === String(employeeId)
  )

  // ============================================================
  // UI
  // ============================================================

  return (
    <>
      <PageHeader
        title="Attendance Management"
        subtitle="Manage employee attendance and bulk import records"
        actions={
          <Button
            variant="secondary"
            onClick={() =>
              download(
                'attendance_template.csv',
                TEMPLATE
              )
            }
          >
            Download template
          </Button>
        }
      />

      <div className="stack">

        {/* ======================================================
            MARK ATTENDANCE
        ======================================================= */}

        <Card title="Mark Attendance">
          <div className="stack">

            {error && (
              <Alert tone="error">
                {error}
              </Alert>
            )}

            <div className="grid g4">

              {/* Employee */}

              <div>
                <label>Employee</label>

                <select
                  value={employeeId}
                  onChange={(e) =>
                    setEmployeeId(e.target.value)
                  }
                  disabled={loadingEmployees || busy}
                >
                  <option value="">
                    {loadingEmployees
                      ? 'Loading employees...'
                      : 'Select employee'}
                  </option>

                  {employees
                    .filter(
                      (employee) =>
                        employee.is_active !== false
                    )
                    .map((employee) => (
                      <option
                        key={employee.id}
                        value={employee.id}
                      >
                        {employee.name} (
                        {employee.employee_id})
                      </option>
                    ))}
                </select>
              </div>

              {/* Date */}

              <div>
                <label>Date</label>

                <input
                  type="date"
                  value={attendanceDate}
                  onChange={(e) =>
                    setAttendanceDate(e.target.value)
                  }
                  disabled={busy}
                />
              </div>

              {/* Status */}

              <div>
                <label>Status</label>

                <select
                  value={status}
                  onChange={(e) =>
                    setStatus(e.target.value)
                  }
                  disabled={busy}
                >
                  {STATUSES.map((value) => (
                    <option
                      key={value}
                      value={value}
                    >
                      {value}
                    </option>
                  ))}
                </select>
              </div>

              {/* Remarks */}

              <div>
                <label>Remarks</label>

                <input
                  type="text"
                  value={remarks}
                  placeholder="Optional"
                  onChange={(e) =>
                    setRemarks(e.target.value)
                  }
                  disabled={busy}
                />
              </div>

            </div>

            <div className="row">
              <Button
                loading={busy}
                disabled={
                  !employeeId ||
                  !attendanceDate ||
                  !status
                }
                onClick={saveAttendance}
              >
                {busy
                  ? 'Saving...'
                  : 'Save Attendance'}
              </Button>
            </div>

          </div>
        </Card>

        {/* ======================================================
            ATTENDANCE REGISTER
        ======================================================= */}

        <Card
          title={
            selectedEmployee
              ? `${selectedEmployee.name}'s Attendance`
              : 'Attendance Register'
          }
          pad={false}
        >
          {!employeeId ? (
            <div
              className="muted"
              style={{ padding: 24 }}
            >
              Select an employee above to view their
              attendance register.
            </div>
          ) : loadingRecords ? (
            <div
              className="muted"
              style={{ padding: 24 }}
            >
              Loading attendance...
            </div>
          ) : records.length === 0 ? (
            <div
              className="muted"
              style={{ padding: 24 }}
            >
              No attendance records found for this employee.
            </div>
          ) : (
            <DataTable
              rows={records}
              pageSize={10}
              columns={[
                {
                  header: 'Date',
                  key: 'attendance_date',
                },
                {
                  header: 'Status',
                  key: 'status',
                },
                {
                  header: 'Remarks',
                  key: 'remarks',
                },
              ]}
            />
          )}
        </Card>

        {/* ======================================================
            BULK CSV IMPORT
        ======================================================= */}

        <Card title="Bulk Attendance Import">
          <div className="stack">

            <p className="muted">
              Required columns:{' '}
              <code>employee_id</code>,{' '}
              <code>attendance_date</code>,{' '}
              <code>status</code> and{' '}
              <code>remarks</code>.
              Existing attendance records are handled by
              the backend.
            </p>

            <div className="row">

              <input
                ref={input}
                type="file"
                accept=".csv,text/csv"
                onChange={pick}
                style={{ maxWidth: 360 }}
              />

              <Button
                disabled={!file || busy}
                loading={busy}
                onClick={upload}
              >
                {busy
                  ? 'Importing...'
                  : 'Import CSV'}
              </Button>

            </div>

          </div>
        </Card>

        {/* ======================================================
            IMPORT RESULT
        ======================================================= */}

        {result && (
          <>
            {!result.success && (
              <Alert
                tone="error"
                title="Import completed with issues"
              >
                {result.message ||
                  'Some attendance rows could not be imported.'}
              </Alert>
            )}

            <div className="grid g4">

              <SummaryCard
                icon="check"
                tone="green"
                label="Imported"
                value={result.imported || 0}
              />

              <SummaryCard
                icon="alert"
                tone={
                  result.errors?.length
                    ? 'red'
                    : 'green'
                }
                label="Rows with issues"
                value={
                  result.errors?.length || 0
                }
              />

            </div>

            {result.errors?.length > 0 && (
              <Card
                title="Attendance issues"
                pad={false}
              >
                <DataTable
                  rows={result.errors.map(
                    (item, index) => ({
                      ...item,
                      id: index,
                    })
                  )}
                  pageSize={10}
                  columns={[
                    {
                      header: 'CSV row',
                      key: 'row',
                    },
                    {
                      header: 'Problem',
                      key: 'error',
                    },
                  ]}
                />
              </Card>
            )}
          </>
        )}

      </div>
    </>
  )
}