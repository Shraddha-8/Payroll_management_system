import api from './api'

// Backend only exposes CSV import (Admin, HR). There is no list/read endpoint for attendance.
export const attendanceService = {
  importCsv(file) {
    const form = new FormData()
    form.append('file', file)
    return api.post('/attendance/import-csv', form).then((r) => r.data)
  },
}
