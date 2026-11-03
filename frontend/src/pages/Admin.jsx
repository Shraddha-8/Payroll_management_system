import { useFetch } from '../hooks/useFetch'
import { adminService } from '../services/admin'
import { Alert, Card, ErrorState, LoadingState, PageHeader, SummaryCard } from '../components/ui'

export default function Admin() {
  const q = useFetch(async () => {
    const [health, access] = await Promise.all([adminService.health(), adminService.check()])
    return { health, access }
  }, [])
  return (
    <>
      <PageHeader title="Administration" subtitle="System status" />
      <div className="stack">
        {q.loading ? <LoadingState /> : q.error ? <ErrorState message={q.error} onRetry={q.reload} /> : (
          <div className="grid g4">
            <SummaryCard icon="check" tone="green" label="API health" value={q.data.health.status} />
            <SummaryCard icon="shield" label="Admin access" value="Granted" hint={q.data.access.user} />
          </div>)}
       
        
      </div>
    </>
  )
}
