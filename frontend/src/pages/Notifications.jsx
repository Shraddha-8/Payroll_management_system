import { useState } from 'react'
import { useFetch } from '../hooks/useFetch'
import { notificationService } from '../services/notification'
import { errorMessage } from '../services/api'
import { useToast } from '../context/ToastContext'
import { fmtDateTime } from '../utils/format'
import { Button, Card, EmptyState, ErrorState, LoadingState, PageHeader, Pagination } from '../components/ui'

const SIZE = 15

export default function Notifications() {
  const toast = useToast()
  const q = useFetch(() => notificationService.list(), [])
  const [page, setPage] = useState(1)
  const [busy, setBusy] = useState(false)
  const list = q.data || []
  const unread = list.filter((n) => !n.is_read)

  const markAll = async () => {
    setBusy(true)
    try {
      await Promise.all(unread.map((n) => notificationService.markRead(n.id)))
      toast.success('All notifications marked as read')
      q.reload()
    } catch (e) { toast.error(errorMessage(e)); q.reload() } finally { setBusy(false) }
  }
  const markOne = async (n) => {
    try { await notificationService.markRead(n.id); q.reload() } catch (e) { toast.error(errorMessage(e)) }
  }

  const pages = Math.max(1, Math.ceil(list.length / SIZE))
  const slice = list.slice((Math.min(page, pages) - 1) * SIZE, Math.min(page, pages) * SIZE)
  return (
    <>
      <PageHeader title="Notifications" subtitle={`${unread.length} unread`}
        actions={<Button variant="secondary" disabled={!unread.length} loading={busy} onClick={markAll}>Mark all as read</Button>} />
      <Card pad={false}>
        {q.loading ? <LoadingState /> : q.error ? <ErrorState message={q.error} onRetry={q.reload} /> :
          !list.length ? <EmptyState title="No notifications" text="You're all caught up." /> : (<>
            {slice.map((n) => (
              <div key={n.id} className={`notif ${n.is_read ? 'read' : 'unread'}`}>
                <span className="dot" /><div className="grow"><b>{n.title}</b><div>{n.message}</div><div className="muted small">{fmtDateTime(n.created_at)}</div></div>
                {!n.is_read && <Button variant="secondary" className="btn-sm" onClick={() => markOne(n)}>Mark read</Button>}
              </div>))}
            <Pagination page={Math.min(page, pages)} pages={pages} total={list.length} onPage={setPage} />
          </>)}
      </Card>
    </>
  )
}
