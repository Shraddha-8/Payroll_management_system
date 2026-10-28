import api from './api'

// Admin, HR
export const auditService = { list: () => api.get('/audit-logs/').then((r) => r.data) }
