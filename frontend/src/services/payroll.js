import api from './api'

// Admin, HR, Payroll Manager
export const payrollService = {
  // GET /payroll/?employee_id&payroll_month=YYYY-MM-DD&payroll_status  (no pagination, no get-by-id)
  list: (params) => api.get('/payroll/', { params }).then((r) => r.data),
  // POST /payroll/ {employee_id, payroll_month} — calculates immediately; status starts "Calculated"
  create: (body) => api.post('/payroll/', body).then((r) => r.data),
  submit: (id) => api.patch(`/payroll/${id}/submit`).then((r) => r.data),
  // PATCH /payroll/{id}/decision?decision=Approved|Rejected&rejection_reason=
  decide: (id, decision, rejection_reason) =>
    api.patch(`/payroll/${id}/decision`, null, { params: { decision, rejection_reason } }).then((r) => r.data),
  finalize: (id) => api.patch(`/payroll/${id}/finalize`).then((r) => r.data),
}
