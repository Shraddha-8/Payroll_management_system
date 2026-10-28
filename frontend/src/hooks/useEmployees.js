import { useMemo } from 'react'
import { useFetch } from './useFetch'
import { employeeService } from '../services/employee'
import { useAuth } from '../context/AuthContext'
import { ROLES } from '../utils/roles'

/** Employee list + id->employee map. Only Admin/HR may call GET /employees/; others get an empty map. */
export function useEmployees() {
  const { role } = useAuth()
  const allowed = role === ROLES.ADMIN || role === ROLES.HR
  const q = useFetch(() => employeeService.list(), [], allowed)
  const map = useMemo(() => Object.fromEntries((q.data || []).map((e) => [e.id, e])), [q.data])
  const label = (id) => (map[id] ? `${map[id].name} (${map[id].employee_id})` : `Employee #${id}`)
  return { ...q, employees: q.data || [], map, label, allowed }
}
