import api, { downloadFile } from './api'

export const payslipService = {
  // POST /payslips/{payroll_id} (Admin, HR) — Finalized payroll only
  generate: (payrollId) => api.post(`/payslips/${payrollId}`).then((r) => r.data),
  // GET /payslips/my — payslips of the employee record linked to the logged-in user
  mine: () => api.get('/payslips/my').then((r) => r.data),
  download: (id, filename) => downloadFile(`/payslips/${id}/download`, { filename }),
}
