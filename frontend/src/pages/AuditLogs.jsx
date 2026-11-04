
import { useState } from 'react'

import { useFetch } from '../hooks/useFetch'
import { auditService } from '../services/audit'
import { fmtDateTime } from '../utils/format'

import {
  Card,
  DataTable,
  EmptyState,
  PageHeader,
  StatusBadge,
  Button,
} from '../components/ui'

// Friendly labels for audit actions
const ACTION_LABELS = {
  CREATE: 'Created',
  UPDATE: 'Updated',
  DELETE: 'Deleted',
  DEACTIVATE: 'Deactivated',
  ACTIVATE: 'Activated',
  SUBMIT: 'Submitted',
  APPROVE: 'Approved',
  REJECT: 'Rejected',
  FINALIZE: 'Finalized',
  LOGIN: 'Logged in',
  LOGOUT: 'Logged out',
}

// Format entity names
const formatEntity = (type) => {
  if (!type) return 'System'

  return type
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

// Format the user display
const formatUser = (audit) => {
  const name =
    audit.user_name ||
    audit.user?.name ||
    audit.user_email ||
    audit.user?.email

  const role = audit.user_role || audit.user?.role

  if (!audit.user_id) return 'System'

  if (name && role) return `${name} (${role})`
  if (name) return name

  return `User #${audit.user_id}`
}

export default function AuditLogs() {
  const q = useFetch(() => auditService.list(), [])

  const [text, setText] = useState('')
  const [action, setAction] = useState('')
  const [entity, setEntity] = useState('')

  const all = q.data || []

  const uniqueValues = (key) =>
    [...new Set(all.map((item) => item[key]).filter(Boolean))].sort()

  const search = text.trim().toLowerCase()

  const rows = all.filter((item) => {
    const matchesAction =
      !action || item.action === action

    const matchesEntity =
      !entity || item.entity_type === entity

    const searchableText = [
      item.details,
      item.entity_id,
      item.user_id,
      item.user_name,
      item.user_email,
      item.user_role,
      item.user?.name,
      item.user?.email,
      item.user?.role,
      item.entity_type,
      ACTION_LABELS[item.action],
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    const matchesSearch =
      !search || searchableText.includes(search)

    return matchesAction && matchesEntity && matchesSearch
  })

  const clearFilters = () => {
    setText('')
    setAction('')
    setEntity('')
  }

  return (
    <>
      <PageHeader
        title="Audit Logs"
        subtitle="Track important activities and changes across the system."
      />

      <div className="stack">

        <Card pad={false}>
          <div className="toolbar">

            <input
              type="search"
              placeholder="Search user, action, entity or details..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />

            <select
              value={action}
              onChange={(e) => setAction(e.target.value)}
            >
              <option value="">All actions</option>

              {uniqueValues('action').map((value) => (
                <option key={value} value={value}>
                  {ACTION_LABELS[value] || value}
                </option>
              ))}
            </select>

            <select
              value={entity}
              onChange={(e) => setEntity(e.target.value)}
            >
              <option value="">All entities</option>

              {uniqueValues('entity_type').map((value) => (
                <option key={value} value={value}>
                  {formatEntity(value)}
                </option>
              ))}
            </select>

            {(text || action || entity) && (
              <Button
                variant="secondary"
                onClick={clearFilters}
              >
                Clear filters
              </Button>
            )}

          </div>

          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 8,
            }}
          >
            <span className="muted small">
              Showing {rows.length} of {all.length} activities
            </span>

            <span className="muted small">
              Latest activity first
            </span>
          </div>

          <DataTable
            rows={rows}
            loading={q.loading}
            error={q.error}
            onRetry={q.reload}
            pageSize={15}
            empty={
              <EmptyState
                title="No audit activities found"
                text="Try changing your search or filters."
              />
            }
            columns={[
              {
                header: 'Date & Time',
                render: (item) => fmtDateTime(item.created_at),
              },
              {
                header: 'Performed By',
                render: (item) => (
                  <div>
                    <strong>{formatUser(item)}</strong>
                    {item.user_id && (
                      <div className="muted small">
                        User ID: {item.user_id}
                      </div>
                    )}
                  </div>
                ),
              },
              {
                header: 'Action',
                render: (item) => (
                  <div>
                    <StatusBadge status={item.action} />
                    <div className="muted small">
                      {ACTION_LABELS[item.action] || item.action}
                    </div>
                  </div>
                ),
              },
              {
                header: 'Entity',
                render: (item) => (
                  <div>
                    <strong>
                      {formatEntity(item.entity_type)}
                    </strong>

                    {item.entity_id != null && (
                      <div className="muted small">
                        ID: #{item.entity_id}
                      </div>
                    )}
                  </div>
                ),
              },
              {
                header: 'Activity Details',
                render: (item) => (
                  <span>
                    {item.details || 'No additional details'}
                  </span>
                ),
              },
            ]}
          />
        </Card>

      </div>
    </>
  )
}
