export const money = (v) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(Number(v || 0))

export const fmtDate = (d) => {
  if (!d) return '—'
  const dt = new Date(d.length === 10 ? `${d}T00:00:00` : d)
  return isNaN(dt) ? d : dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}
export const fmtDateTime = (d) => (d ? new Date(d.endsWith('Z') || d.includes('+') ? d : `${d}Z`).toLocaleString('en-GB') : '—')
export const fmtMonth = (d) => (d ? new Date(`${d.slice(0, 7)}-01T00:00:00`).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' }) : '—')

// <input type="month"> gives YYYY-MM; the API wants YYYY-MM-01.
export const monthToDate = (m) => (m ? `${m}-01` : '')
export const currentMonth = () => new Date().toISOString().slice(0, 7)

export const download = (filename, text, type = 'text/csv') => {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const a = Object.assign(document.createElement('a'), { href: url, download: filename })
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
