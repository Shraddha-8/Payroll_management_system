import { useEffect, useState } from 'react'
import Icon from './Icon'

export function Spinner({ size = 20 }) { return <span className="spinner" style={{ width: size, height: size }} /> }
export const LoadingState = ({ text = 'Loading…' }) => <div className="state"><Spinner size={28} /><p>{text}</p></div>
export const EmptyState = ({ title = 'Nothing here yet', text, action }) => (
  <div className="state"><Icon name="inbox" size={34} /><h4>{title}</h4>{text && <p>{text}</p>}{action}</div>
)
export const ErrorState = ({ message, onRetry }) => (
  <div className="state state-error"><Icon name="alert" size={34} /><h4>Couldn’t load data</h4><p>{message}</p>
    {onRetry && <button className="btn btn-secondary" onClick={onRetry}>Try again</button>}</div>
)
export const Alert = ({ tone = 'info', title, children }) => (
  <div className={`alert alert-${tone}`}><Icon name="alert" /><div>{title && <strong>{title}</strong>}<div>{children}</div></div></div>
)

export function Button({ variant = 'primary', loading, children, ...rest }) {
  return (
    <button {...rest} className={`btn btn-${variant} ${rest.className || ''}`} disabled={rest.disabled || loading}>
      {loading && <Spinner size={14} />}{children}
    </button>
  )
}

export function PageHeader({ title, subtitle, actions }) {
  return <div className="page-head"><div><h1>{title}</h1>{subtitle && <p className="muted">{subtitle}</p>}</div><div className="row">{actions}</div></div>
}
export const Card = ({ title, actions, children, pad = true }) => (
  <section className="card">{(title || actions) && <div className="card-head"><h3>{title}</h3><div className="row">{actions}</div></div>}
    <div className={pad ? 'card-body' : ''}>{children}</div></section>
)
export const SummaryCard = ({ label, value, hint, tone = 'indigo', icon = 'chart' }) => (
  <div className="summary"><div className={`summary-icon tone-${tone}`}><Icon name={icon} /></div>
    <div><div className="summary-label">{label}</div><div className="summary-value">{value}</div>{hint && <div className="muted small">{hint}</div>}</div></div>
)

const TONES = {
  Calculated: 'blue', 'Pending Approval': 'amber', Approved: 'green', Finalized: 'dark', Rejected: 'red',
  Pending: 'amber', Active: 'green', Inactive: 'gray',
  Present: 'green', Absent: 'red', 'Half Day': 'amber', Holiday: 'blue', Leave: 'gray',
}
export const StatusBadge = ({ status }) => <span className={`badge badge-${TONES[status] || 'gray'}`}>{status}</span>

// Backend flow: Calculated -> Pending Approval -> Approved -> Finalized (Rejected is a terminal side-state).
const STEPS = ['Calculated', 'Pending Approval', 'Approved', 'Finalized']
export function WorkflowStepper({ status }) {
  const rejected = status === 'Rejected'
  const idx = rejected ? 1 : STEPS.indexOf(status)
  return (
    <ol className="stepper">
      {STEPS.map((s, i) => {
        const cls = rejected && i === 1 ? 'rejected' : i < idx || (i === idx && status === 'Finalized') ? 'done' : i === idx ? 'current' : ''
        return (
          <li key={s} className={cls}>
            <span className="step-dot">{cls === 'done' ? <Icon name="check" size={14} /> : rejected && i === 1 ? '!' : i + 1}</span>
            <span className="step-label">{rejected && i === 1 ? 'Rejected' : s}</span>
          </li>
        )
      })}
    </ol>
  )
}

export function Modal({ title, onClose, children, footer, wide }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head"><h3>{title}</h3><button className="icon-btn" aria-label="Close" onClick={onClose}>×</button></div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  )
}

export function ConfirmDialog({ title, message, confirmLabel = 'Confirm', danger, onConfirm, onCancel, children }) {
  const [busy, setBusy] = useState(false)
  const go = async () => { setBusy(true); try { await onConfirm() } finally { setBusy(false) } }
  return (
    <Modal title={title} onClose={onCancel} footer={<>
      <Button variant="secondary" onClick={onCancel} disabled={busy}>Cancel</Button>
      <Button variant={danger ? 'danger' : 'primary'} loading={busy} onClick={go}>{confirmLabel}</Button></>}>
      <p>{message}</p>{children}
    </Modal>
  )
}

export function FormField({ label, error, hint, required, children }) {
  return (
    <label className="field"><span className="field-label">{label}{required && <b className="req"> *</b>}</span>
      {children}{hint && !error && <span className="muted small">{hint}</span>}{error && <span className="field-error">{error}</span>}</label>
  )
}

export function Pagination({ page, pages, total, onPage }) {
  if (pages <= 1) return total ? <div className="pager"><span className="muted small">{total} record{total === 1 ? '' : 's'}</span></div> : null
  return (
    <div className="pager"><span className="muted small">{total} records · page {page} of {pages}</span>
      <div className="row"><Button variant="secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>Previous</Button>
        <Button variant="secondary" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next</Button></div></div>
  )
}

/** Client-side paginated table (the backend list endpoints return full arrays). */
export function DataTable({ columns, rows, loading, error, onRetry, empty, pageSize = 10, rowKey = 'id' }) {
  const [page, setPage] = useState(1)
  const total = rows?.length || 0
  const pages = Math.max(1, Math.ceil(total / pageSize))
  const cur = Math.min(page, pages)
  useEffect(() => { setPage(1) }, [total])
  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} onRetry={onRetry} />
  if (!total) return empty || <EmptyState />
  const slice = rows.slice((cur - 1) * pageSize, cur * pageSize)
  return (
    <>
      <div className="table-wrap"><table className="table">
        <thead><tr>{columns.map((c) => <th key={c.header} className={c.className}>{c.header}</th>)}</tr></thead>
        <tbody>{slice.map((r) => <tr key={r[rowKey]}>{columns.map((c) => <td key={c.header} className={c.className} data-label={c.header}>{c.render ? c.render(r) : r[c.key] ?? '—'}</td>)}</tr>)}</tbody>
      </table></div>
      <Pagination page={cur} pages={pages} total={total} onPage={setPage} />
    </>
  )
}
