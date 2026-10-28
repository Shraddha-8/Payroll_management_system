import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import { ProtectedRoute, RoleGuard } from './components/Guards'
import { ROLES, STAFF } from './utils/roles'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Profile from './pages/Profile'
import Notifications from './pages/Notifications'
import Employees from './pages/Employees'
import EmployeeDetail from './pages/EmployeeDetail'
import Salary from './pages/Salary'
import Attendance from './pages/Attendance'
import Leaves from './pages/Leaves'
import PayrollList from './pages/PayrollList'
import PayrollDetail from './pages/PayrollDetail'
import MyPayslips from './pages/MyPayslips'
import Reports from './pages/Reports'
import AuditLogs from './pages/AuditLogs'
import Admin from './pages/Admin'

const { ADMIN, HR, EMPLOYEE } = ROLES
const guard = (roles, el) => <RoleGuard roles={roles}>{el}</RoleGuard>

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Dashboard />} />
        <Route path="profile" element={<Profile />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="employees" element={guard([ADMIN, HR], <Employees />)} />
        <Route path="employees/:id" element={guard([ADMIN, HR], <EmployeeDetail />)} />
        <Route path="salary" element={guard(STAFF, <Salary />)} />
        <Route path="attendance" element={guard([ADMIN, HR], <Attendance />)} />
        <Route path="leaves" element={guard([ADMIN, HR], <Leaves mode="manage" />)} />
        <Route path="my-leaves" element={guard([EMPLOYEE], <Leaves mode="mine" />)} />
        <Route path="payroll" element={guard(STAFF, <PayrollList />)} />
        <Route path="payroll/:id" element={guard(STAFF, <PayrollDetail />)} />
        <Route path="my-payslips" element={guard([EMPLOYEE], <MyPayslips />)} />
        <Route path="reports" element={guard([ADMIN, HR], <Reports />)} />
        <Route path="audit" element={guard([ADMIN, HR], <AuditLogs />)} />
        <Route path="admin" element={guard([ADMIN], <Admin />)} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
