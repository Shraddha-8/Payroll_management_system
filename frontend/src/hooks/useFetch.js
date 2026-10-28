import { useCallback, useEffect, useRef, useState } from 'react'
import { errorMessage } from '../services/api'

/** Runs an async loader; exposes data/loading/error/reload. Pass `enabled=false` to skip. */
export function useFetch(loader, deps = [], enabled = true) {
  const ref = useRef(loader)
  ref.current = loader
  const [state, setState] = useState({ data: null, loading: enabled, error: null })
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (!enabled) { setState({ data: null, loading: false, error: null }); return }
    let alive = true
    setState((s) => ({ ...s, loading: true, error: null }))
    ref.current()
      .then((data) => alive && setState({ data, loading: false, error: null }))
      .catch((e) => alive && setState({ data: null, loading: false, error: errorMessage(e) }))
    return () => { alive = false }
  }, [...deps, tick, enabled]) // eslint-disable-line react-hooks/exhaustive-deps

  const reload = useCallback(() => setTick((t) => t + 1), [])
  return { ...state, reload }
}

/** Guards against double submission and reports errors via the provided callbacks. */
export function useAction() {
  const [busy, setBusy] = useState(false)
  const run = useCallback(async (fn) => {
    if (busy) return undefined
    setBusy(true)
    try { return await fn() } finally { setBusy(false) }
  }, [busy])
  return [run, busy]
}
