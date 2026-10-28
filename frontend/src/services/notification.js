import api from './api'

export const notificationService = {
  list: () => api.get('/notifications/').then((r) => r.data),
  markRead: (id) => api.patch(`/notifications/${id}/read`).then((r) => r.data),
}
