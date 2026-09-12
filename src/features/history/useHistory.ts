import { useCallback, useEffect, useState } from 'react'
import { api, ApiError } from '../../lib/api'
import type { HistoryRecord } from '../../lib/postureTypes'

interface UseHistoryResult {
  records: HistoryRecord[]
  status: 'loading' | 'ready' | 'error'
  error: string | null
  refresh: () => void
}

/** Loads the signed-in user's saved posture-check history from the server. */
export function useHistory(): UseHistoryResult {
  const [records, setRecords] = useState<HistoryRecord[]>([])
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  useEffect(() => {
    let cancelled = false
    setStatus('loading')
    setError(null)
    api
      .get<{ history: HistoryRecord[] }>('/api/posture/history')
      .then((res) => {
        if (cancelled) return
        setRecords(res.history)
        setStatus('ready')
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setError(err instanceof ApiError ? err.message : 'Could not load your history. Please try again.')
        setStatus('error')
      })
    return () => {
      cancelled = true
    }
  }, [reloadToken])

  const refresh = useCallback(() => setReloadToken((t) => t + 1), [])

  return { records, status, error, refresh }
}
