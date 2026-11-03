import api from './api'

// Admin system health and access checks.
export const adminService = {
  check: () => api.get('/admin/test').then((r) => r.data),
  health: () => api.get('/health').then((r) => r.data),
}
