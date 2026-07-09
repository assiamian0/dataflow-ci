import { useCallback, useEffect, useState } from 'react'
import { api } from '@/api/client'

export interface DashboardStats {
  total_files: number
  active_sources: number
  success_rate: number
  status_counts: Record<'PENDING' | 'PROCESSING' | 'SUCCESS' | 'PARTIAL' | 'FAILED', number>
  uploads_by_source: Array<{
    source_id: string
    name: string
    total: number
    success: number
    partial: number
    failed: number
  }>
  most_active_sources: Array<{ source_id: string; name: string; total: number }>
  errors_by_type: Array<{ error_type: string; count: number }>
  recent_uploads: Array<{
    id: string
    original_name: string
    status: string
    source_name: string
    total_lines: number
    valid_lines: number
    invalid_lines: number
    created_at: string
  }>
}

export function useDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await api.get<DashboardStats>('/api/dashboard')
      setStats(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { stats, isLoading, error, refresh }
}
