import api, { downloadFile } from './api'

// Admin, HR. payroll_month = YYYY-MM-01. Only Finalized payroll is included by the backend.
export const reportService = {
  summary: (payroll_month) => api.get('/reports/payroll-summary', { params: { payroll_month } }).then((r) => r.data),
  departments: (payroll_month) => api.get('/reports/department-summary', { params: { payroll_month } }).then((r) => r.data),
  downloadCsv: (payroll_month) => downloadFile('/reports/payroll-csv', { params: { payroll_month } }),
}
