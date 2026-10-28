import api from './api'

// The only admin-specific endpoint in the backend is /admin/test (no user management exists).
export const adminService = {
  check: () => api.get('/admin/test').then((r) => r.data),
  health: () => api.get('/health').then((r) => r.data),
}
