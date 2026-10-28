// Role strings exactly as stored/returned by the backend (see create_admin.py / require_role()).
export const ROLES = {
  ADMIN: 'Admin',
  HR: 'HR',
  PAYROLL: 'Payroll Manager',
  EMPLOYEE: 'Employee',
}
const R = ROLES
export const ALL = Object.values(R)
export const STAFF = [R.ADMIN, R.HR, R.PAYROLL]

// Mirrors backend require_role() lists — UX only; the API remains the authority.
export const NAV = [
  { to: '/', label: 'Dashboard', icon: 'home', roles: ALL, end: true },
  { to: '/employees', label: 'Employees', icon: 'users', roles: [R.ADMIN, R.HR] },
  { to: '/salary', label: 'Salary', icon: 'wallet', roles: STAFF },
  { to: '/attendance', label: 'Attendance', icon: 'calendar', roles: [R.ADMIN, R.HR] },
  { to: '/leaves', label: 'Leave Requests', icon: 'plane', roles: [R.ADMIN, R.HR] },
  { to: '/my-leaves', label: 'My Leaves', icon: 'plane', roles: [R.EMPLOYEE] },
  { to: '/payroll', label: 'Payroll', icon: 'cash', roles: STAFF },
  { to: '/my-payslips', label: 'My Payslips', icon: 'file', roles: [R.EMPLOYEE] },
  { to: '/reports', label: 'Reports', icon: 'chart', roles: [R.ADMIN, R.HR] },
  { to: '/audit', label: 'Audit Logs', icon: 'shield', roles: [R.ADMIN, R.HR] },
  { to: '/admin', label: 'Administration', icon: 'settings', roles: [R.ADMIN] },
  { to: '/notifications', label: 'Notifications', icon: 'bell', roles: ALL },
  { to: '/profile', label: 'Profile', icon: 'user', roles: ALL },
]
