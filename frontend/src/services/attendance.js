import api from './api'

export const attendanceService = {
  // Get attendance for a particular employee
  forEmployee: (employeeId, params) =>
    api
      .get(`/attendance/employees/${employeeId}`, { params })
      .then((r) => r.data),

  // Get logged-in employee's own attendance
  mine: (params) =>
    api
      .get('/attendance/me', { params })
      .then((r) => r.data),

  // Create/update attendance manually
  upsert: (data) =>
    api
      .put('/attendance', data)
      .then((r) => r.data),

  // Import attendance through CSV
  importCsv: (file) => {
    const formData = new FormData()
    formData.append('file', file)

    return api
      .post('/attendance/import-csv', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
      .then((r) => r.data)
  },

  // Attendance issues
  issues: (params) =>
    api
      .get('/attendance/issues', { params })
      .then((r) => r.data),
}