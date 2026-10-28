import api from './api'

// Admin, HR, Payroll Manager
export const salaryService = {
  list: (params) => api.get('/salary-structures/', { params }).then((r) => r.data),
  create: (body) => api.post('/salary-structures/', body).then((r) => r.data),
  revise: (id, body) => api.post(`/salary-structures/${id}/revise`, body).then((r) => r.data),
}
