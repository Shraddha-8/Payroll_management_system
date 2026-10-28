import axios from 'axios'

const TOKEN_KEY = 'pms_token'

// JWT is kept in sessionStorage (cleared when the tab closes; token lifetime is 60 min on the backend).
export const tokenStore = {
  get: () => sessionStorage.getItem(TOKEN_KEY),
  set: (t) => sessionStorage.setItem(TOKEN_KEY, t),
  clear: () => sessionStorage.removeItem(TOKEN_KEY),
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000,
})

api.interceptors.request.use((config) => {
  const token = tokenStore.get()
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && !err.config?.skipAuthRedirect) {
      tokenStore.clear()
      window.dispatchEvent(new Event('auth:unauthorized'))
    }
    return Promise.reject(err)
  },
)

/** Turn any axios/FastAPI error into a readable string (handles 422 validation arrays). */
export function errorMessage(err, fallback = 'Something went wrong. Please try again.') {
  if (!err?.response) {
    return err?.code === 'ECONNABORTED'
      ? 'The request timed out.'
      : 'Cannot reach the server. Check your connection and that the API is running.'
  }
  const d = err.response.data?.detail
  if (typeof d === 'string') return d
  if (Array.isArray(d)) return d.map((x) => `${(x.loc || []).filter((p) => p !== 'body').join('.')}: ${x.msg}`).join('; ')
  if (err.response.status === 403) return 'You do not have permission to perform this action.'
  if (err.response.status === 404) return 'Not found.'
  return fallback
}

/** Authenticated file download (PDF/CSV) — plain links can't carry the Bearer header. */
export async function downloadFile(url, { params, filename } = {}) {
  try {
    const res = await api.get(url, { params, responseType: 'blob' })
    const cd = res.headers['content-disposition'] || ''
    const name = filename || /filename="?([^";]+)"?/.exec(cd)?.[1] || 'download'
    const href = URL.createObjectURL(res.data)
    const a = document.createElement('a')
    a.href = href
    a.download = name
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(href)
  } catch (err) {
    if (err.response?.data instanceof Blob) {
      try { err.response.data = JSON.parse(await err.response.data.text()) } catch { /* keep generic message */ }
    }
    throw err
  }
}

export default api
