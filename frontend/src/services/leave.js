import api from './api'

export const leaveService = {
  // GET /leave-requests/?employee_id&request_status  (Admin, HR, Employee)
  list: (params) => api.get('/leave-requests/', { params }).then((r) => r.data),
  create: (body) => api.post('/leave-requests/', body).then((r) => r.data),
  update: (id, body) => api.put(`/leave-requests/${id}`, body).then((r) => r.data),
  // PATCH /{id}/decision?decision=Approved|Rejected&rejection_reason=  (Admin, HR) — query params, not body
  decide: (id, decision, rejection_reason) =>
    api.patch(`/leave-requests/${id}/decision`, null, { params: { decision, rejection_reason } }).then((r) => r.data),
}
