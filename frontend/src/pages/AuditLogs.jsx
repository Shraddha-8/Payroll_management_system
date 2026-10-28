import { useState } from 'react'
import { useFetch } from '../hooks/useFetch'
import { auditService } from '../services/audit'
import { fmtDateTime } from '../utils/format'
import { Card, DataTable, EmptyState, PageHeader, StatusBadge } from '../components/ui'

export default function AuditLogs() {
  const q = useFetch(() => auditService.list(), [])
  const [text, setText] = useState('')
  const [action, setAction] = useState('')
  const [entity, setEntity] = useState('')
  const all = q.data || []
  const uniq = (k) => [...new Set(all.map((a) => a[k]))].sort()
  const t = text.trim().toLowerCase()
  const rows = all.filter((a) => (!action || a.action === action) && (!entity || a.entity_type === entity) && (!t || `${a.details || ''} ${a.entity_id ?? ''} ${a.user_id ?? ''}`.toLowerCase().includes(t)))
  return (
    <>
      <PageHeader title="Audit logs" subtitle="Immutable record of sensitive actions" />
      <Card pad={false}>
        <div className="toolbar">
          <input type="search" placeholder="Search details, user or entity ID…" value={text} onChange={(e) => setText(e.target.value)} />
          <select value={action} onChange={(e) => setAction(e.target.value)}><option value="">All actions</option>{uniq('action').map((a) => <option key={a}>{a}</option>)}</select>
          <select value={entity} onChange={(e) => setEntity(e.target.value)}><option value="">All entities</option>{uniq('entity_type').map((a) => <option key={a}>{a}</option>)}</select>
        </div>
        <DataTable rows={rows} loading={q.loading} error={q.error} onRetry={q.reload} pageSize={15} empty={<EmptyState title="No audit entries" />}
          columns={[{ header: 'When', render: (a) => fmtDateTime(a.created_at) }, { header: 'User', render: (a) => (a.user_id ? `#${a.user_id}` : 'System') },
            { header: 'Action', render: (a) => <StatusBadge status={a.action} /> }, { header: 'Entity', render: (a) => `${a.entity_type}${a.entity_id ? ` #${a.entity_id}` : ''}` }, { header: 'Details', key: 'details' }]} />
      </Card>
    </>
  )
}
