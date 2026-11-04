
import { useState } from 'react'

import { useFetch } from '../hooks/useFetch'
import { useEmployees } from '../hooks/useEmployees'
import { salaryService } from '../services/salary'
import { errorMessage } from '../services/api'
import { useToast } from '../context/ToastContext'
import { fmtDate, money } from '../utils/format'

import {
  Alert,
  Button,
  Card,
  DataTable,
  EmptyState,
  FormField,
  Modal,
  PageHeader,
  StatusBadge,
} from '../components/ui'


const blank = {
  employee_id: '',
  basic_salary: '',
  allowances: '0',
  bonuses: '0',
  deductions: '0',
  effective_from: '',
  effective_to: '',
}


// ============================================================
// DATE HELPERS
// ============================================================

function getToday() {
  const now = new Date()

  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}


function getSalaryState(salary) {
  const today = getToday()

  if (salary.effective_from > today) {
    return 'Scheduled'
  }

  if (
    salary.effective_to &&
    salary.effective_to < today
  ) {
    return 'Inactive'
  }

  return 'Active'
}


// ============================================================
// SALARY FORM
// ============================================================

function SalaryForm({
  revise,
  employees,
  canPick,
  onClose,
  onSaved,
}) {
  const toast = useToast()

  const [f, setF] = useState(
    revise
      ? {
          ...blank,
          employee_id: String(revise.employee_id),
          basic_salary: String(revise.basic_salary),
          allowances: String(revise.allowances),
          bonuses: String(revise.bonuses),
          deductions: String(revise.deductions),
          effective_from: '',
          effective_to: revise.effective_to || '',
        }
      : blank
  )

  const [errs, setErrs] = useState({})
  const [serverErr, setServerErr] = useState('')
  const [busy, setBusy] = useState(false)

  const set = (key) => (e) => {
    setF((previous) => ({
      ...previous,
      [key]: e.target.value,
    }))
  }

  const isValidNumber = (value) =>
    value !== '' &&
    Number.isFinite(Number(value)) &&
    Number(value) >= 0

  const employee = employees.find(
    (item) =>
      String(item.id) === String(f.employee_id)
  )

  const employeeName =
    revise?.employee_name ||
    employee?.name ||
    `Employee #${f.employee_id}`

  const employeeCode =
    revise?.employee_code ||
    employee?.employee_id

  const employeeDepartment =
    revise?.employee_department ||
    employee?.department


  const submit = async (e) => {
    e.preventDefault()

    if (busy) return

    const validationErrors = {}

    if (
      !f.employee_id ||
      !(Number(f.employee_id) > 0)
    ) {
      validationErrors.employee_id =
        'Employee is required.'
    }

    ;[
      'basic_salary',
      'allowances',
      'bonuses',
      'deductions',
    ].forEach((key) => {
      if (!isValidNumber(f[key])) {
        validationErrors[key] =
          'Enter a valid amount greater than or equal to zero.'
      }
    })

    if (!f.effective_from) {
      validationErrors.effective_from =
        'Effective date is required.'
    } else if (
      revise &&
      f.effective_from <= revise.effective_from
    ) {
      validationErrors.effective_from =
        `Must be after ${revise.effective_from}.`
    }

    if (
      f.effective_to &&
      f.effective_to < f.effective_from
    ) {
      validationErrors.effective_to =
        'Cannot be before effective-from.'
    }

    setErrs(validationErrors)

    if (Object.keys(validationErrors).length) {
      return
    }

    setBusy(true)
    setServerErr('')

    const body = {
      employee_id: Number(f.employee_id),
      basic_salary: f.basic_salary,
      allowances: f.allowances,
      bonuses: f.bonuses,
      deductions: f.deductions,
      effective_from: f.effective_from,
      effective_to: f.effective_to || null,
    }

    try {
      if (revise) {
        await salaryService.revise(
          revise.id,
          body
        )
      } else {
        await salaryService.create(body)
      }

      toast.success(
        revise
          ? 'Salary revised successfully.'
          : 'Salary structure created successfully.'
      )

      onSaved()

    } catch (error) {
      const message = errorMessage(error)

      setServerErr(message)
      toast.error(message)

    } finally {
      setBusy(false)
    }
  }


  return (
    <Modal
      title={
        revise
          ? 'Revise salary'
          : 'New salary structure'
      }
      wide
      onClose={onClose}
      footer={
        <>
          <Button
            variant="secondary"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </Button>

          <Button
            loading={busy}
            onClick={submit}
          >
            {revise
              ? 'Apply revision'
              : 'Create'}
          </Button>
        </>
      }
    >
      <form
        className="form-grid"
        onSubmit={submit}
        noValidate
      >

        {serverErr && (
          <div className="full">
            <Alert tone="error">
              {serverErr}
            </Alert>
          </div>
        )}

        {revise && (
          <div className="full">
            <Alert tone="info">
              The previous salary structure will end
              one day before the new effective date.
              The previous salary record will remain
              available in salary history.
            </Alert>
          </div>
        )}


        {/* EMPLOYEE */}

        <div className="full">
          <FormField
            label="Employee"
            required
            error={errs.employee_id}
          >

            {revise ? (
              <div
                style={{
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: '12px 14px',
                  background: 'var(--surface-secondary)',
                }}
              >
                <strong>{employeeName}</strong>

                <div className="muted small">
                  {employeeCode || `Database ID: ${f.employee_id}`}
                  {employeeDepartment
                    ? ` · ${employeeDepartment}`
                    : ''}
                </div>
              </div>
            ) : canPick ? (
              <select
                value={f.employee_id}
                onChange={set('employee_id')}
              >
                <option value="">
                  Select employee...
                </option>

                {employees
                  .filter(
                    (item) => item.is_active !== false
                  )
                  .map((item) => (
                    <option
                      key={item.id}
                      value={item.id}
                    >
                      {item.name} ({item.employee_id})
                    </option>
                  ))}
              </select>
            ) : (
              <input
                type="number"
                min="1"
                value={f.employee_id}
                onChange={set('employee_id')}
                placeholder="Employee numeric ID"
              />
            )}

          </FormField>
        </div>


        {/* SALARY COMPONENTS */}

        <FormField
          label="Basic salary (₹)"
          required
          error={errs.basic_salary}
        >
          <input
            type="number"
            step="0.01"
            min="0"
            value={f.basic_salary}
            onChange={set('basic_salary')}
          />
        </FormField>

        <FormField
          label="Allowances (₹)"
          error={errs.allowances}
        >
          <input
            type="number"
            step="0.01"
            min="0"
            value={f.allowances}
            onChange={set('allowances')}
          />
        </FormField>

        <FormField
          label="Bonuses (₹)"
          error={errs.bonuses}
        >
          <input
            type="number"
            step="0.01"
            min="0"
            value={f.bonuses}
            onChange={set('bonuses')}
          />
        </FormField>

        <FormField
          label="Deductions (₹)"
          error={errs.deductions}
        >
          <input
            type="number"
            step="0.01"
            min="0"
            value={f.deductions}
            onChange={set('deductions')}
          />
        </FormField>


        {/* EFFECTIVE DATES */}

        <FormField
          label="Effective from"
          required
          error={errs.effective_from}
        >
          <input
            type="date"
            value={f.effective_from}
            min={
              revise
                ? revise.effective_from
                : undefined
            }
            onChange={set('effective_from')}
          />
        </FormField>

        <FormField
          label="Effective to"
          error={errs.effective_to}
          hint="Optional"
        >
          <input
            type="date"
            value={f.effective_to}
            min={f.effective_from || undefined}
            onChange={set('effective_to')}
          />
        </FormField>

        <button type="submit" hidden />

      </form>
    </Modal>
  )
}


// ============================================================
// SALARY PAGE
// ============================================================

export default function Salary() {
  const emps = useEmployees()

  const [empFilter, setEmpFilter] = useState('')
  const [form, setForm] = useState(null)

  const q = useFetch(
    () =>
      salaryService.list(
        empFilter
          ? { employee_id: Number(empFilter) }
          : undefined
      ),
    [empFilter]
  )


  // ==========================================================
  // TABLE COLUMNS
  // ==========================================================

  const cols = [
    {
      header: 'Employee',

      render: (salary) => (
        <div>
          <strong>
            {salary.employee_name ||
              emps.label(salary.employee_id)}
          </strong>

          <div className="muted small">
            {salary.employee_code ||
              `Database ID: ${salary.employee_id}`}

            {salary.employee_department
              ? ` · ${salary.employee_department}`
              : ''}
          </div>
        </div>
      ),
    },

    {
      header: 'Basic',
      className: 'right mono',
      render: (salary) => money(salary.basic_salary),
    },

    {
      header: 'Allowances',
      className: 'right mono',
      render: (salary) => money(salary.allowances),
    },

    {
      header: 'Bonuses',
      className: 'right mono',
      render: (salary) => money(salary.bonuses),
    },

    {
      header: 'Deductions',
      className: 'right mono',
      render: (salary) => money(salary.deductions),
    },

    {
      header: 'Effective',

      render: (salary) =>
        `${fmtDate(salary.effective_from)} → ${
          salary.effective_to
            ? fmtDate(salary.effective_to)
            : 'open'
        }`,
    },

    {
      header: 'State',

      render: (salary) => (
        <StatusBadge
          status={getSalaryState(salary)}
        />
      ),
    },

    {
      header: '',

      className: 'right',

      render: (salary) =>
        getSalaryState(salary) === 'Active' &&
        !salary.effective_to && (
          <Button
            variant="secondary"
            className="btn-sm"
            onClick={() => setForm(salary)}
          >
            Revise
          </Button>
        ),
    },
  ]


  // ==========================================================
  // PAGE UI
  // ==========================================================

  return (
    <>
      <PageHeader
        title="Salary structures"
        subtitle="Manage employee salary components and revision history."
        actions={
          <Button onClick={() => setForm({})}>
            + New structure
          </Button>
        }
      />

      <Card pad={false}>

        <div className="toolbar">

          {emps.allowed ? (
            <select
              value={empFilter}
              onChange={(e) =>
                setEmpFilter(e.target.value)
              }
            >
              <option value="">
                All employees
              </option>

              {emps.employees.map((employee) => (
                <option
                  key={employee.id}
                  value={employee.id}
                >
                  {employee.name} ({employee.employee_id})
                </option>
              ))}
            </select>
          ) : (
            <input
              type="number"
              min="1"
              placeholder="Filter by employee database ID"
              value={empFilter}
              onChange={(e) =>
                setEmpFilter(e.target.value)
              }
            />
          )}

        </div>

        <DataTable
          columns={cols}
          rows={q.data || []}
          loading={q.loading}
          error={q.error}
          onRetry={q.reload}
          empty={
            <EmptyState
              title="No salary structures"
              text="Create a salary structure to enable payroll calculations."
            />
          }
        />

      </Card>


      {/* CREATE / REVISE MODAL */}

      {form && (
        <SalaryForm
          revise={form.id ? form : null}
          employees={emps.employees || []}
          canPick={emps.allowed}
          onClose={() => setForm(null)}
          onSaved={() => {
            setForm(null)
            q.reload()
          }}
        />
      )}

    </>
  )
}
