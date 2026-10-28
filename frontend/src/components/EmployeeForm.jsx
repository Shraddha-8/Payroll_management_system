import { useState } from 'react'
import { employeeService } from '../services/employee'
import { errorMessage } from '../services/api'
import { useToast } from '../context/ToastContext'
import { Alert, Button, FormField, Modal } from './ui'

const STATUSES = ['Active', 'Inactive']

export default function EmployeeForm({ employee, onClose, onSaved }) {
  const editing = !!employee
  const toast = useToast()
  const [f, setF] = useState({
    employee_id: employee?.employee_id || '', name: employee?.name || '', email: employee?.email || '',
    department: employee?.department || '', joining_date: employee?.joining_date || '', employment_status: employee?.employment_status || 'Active',
  })
  const [errs, setErrs] = useState({})
  const [serverErr, setServerErr] = useState('')
  const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    const v = {}
    if (!editing && !f.employee_id.trim()) v.employee_id = 'Employee ID is required'
    if (!f.name.trim()) v.name = 'Name is required'
    if (!/^\S+@\S+\.\S+$/.test(f.email)) v.email = 'Valid email is required'
    if (!f.department.trim()) v.department = 'Department is required'
    if (!f.joining_date) v.joining_date = 'Joining date is required'
    setErrs(v)
    if (Object.keys(v).length) return
    setBusy(true); setServerErr('')
    try {
      let saved
      if (editing) {
        const body = {}
        ;['name', 'email', 'department', 'joining_date', 'employment_status'].forEach((k) => { if (f[k] !== employee[k]) body[k] = f[k] })
        saved = Object.keys(body).length ? await employeeService.update(employee.id, body) : employee
      } else saved = await employeeService.create({ ...f, employee_id: f.employee_id.trim() })
      toast.success(editing ? 'Employee updated' : 'Employee created')
      onSaved(saved)
    } catch (err) { setServerErr(errorMessage(err)) } finally { setBusy(false) }
  }

  return (
    <Modal title={editing ? `Edit ${employee.name}` : 'Add employee'} onClose={onClose} wide
      footer={<><Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
        <Button loading={busy} onClick={submit}>{editing ? 'Save changes' : 'Create employee'}</Button></>}>
      <form className="form-grid" onSubmit={submit} noValidate>
        {serverErr && <div className="full"><Alert tone="error">{serverErr}</Alert></div>}
        <FormField label="Employee ID" required={!editing} error={errs.employee_id} hint={editing ? 'Cannot be changed' : 'e.g. EMP004'}>
          <input value={f.employee_id} onChange={set('employee_id')} disabled={editing} /></FormField>
        <FormField label="Full name" required error={errs.name}><input value={f.name} onChange={set('name')} /></FormField>
        <FormField label="Email" required error={errs.email}><input type="email" value={f.email} onChange={set('email')} /></FormField>
        <FormField label="Department" required error={errs.department}><input value={f.department} onChange={set('department')} /></FormField>
        <FormField label="Joining date" required error={errs.joining_date}><input type="date" value={f.joining_date} onChange={set('joining_date')} /></FormField>
        <FormField label="Employment status"><select value={f.employment_status} onChange={set('employment_status')}>
          {[...new Set([...STATUSES, f.employment_status])].map((s) => <option key={s}>{s}</option>)}</select></FormField>
        <button type="submit" hidden />
      </form>
    </Modal>
  )
}
