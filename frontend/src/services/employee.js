import api from './api'

// All: Admin, HR. Backend has no pagination and no GET /employees/{id}.
export const employeeService = {
  list: (params) => api.get('/employees/', { params }).then((r) => r.data),
  create: (body) => api.post('/employees/', body).then((r) => r.data),
  update: (id, body) => api.put(`/employees/${id}`, body).then((r) => r.data),
  deactivate: (id) => api.patch(`/employees/${id}/deactivate`).then((r) => r.data),
}
