import { useCallback, useEffect, useState } from 'react'
import { api } from '@/api/client'
import type { Source } from '@/types'

export interface CreateSourcePayload {
  source_id: string
  name: string
  description?: string
  owner?: string
  expected_frequency?: 'weekly' | 'daily'
  file_format?: string
  delimiter?: string
  encoding?: string
  has_header?: boolean
  columns: Array<{
    name: string
    type: 'date' | 'string' | 'integer' | 'float' | 'enum'
    required: boolean
    format?: string
    pattern?: string
    min?: number
    max?: number
    min_length?: number
    max_length?: number
    allowed_values?: string[]
  }>
  row_constraints?: Array<
    | { type: 'unique'; name: string; description?: string; columns: string[] }
    | {
        type: 'comparison'
        name: string
        description?: string
        column_a: string
        operator: '<=' | '<' | '>=' | '>' | '=='
        column_b: string
      }
  >
}

export function useSources() {
  const [sources, setSources] = useState<Source[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await api.get<Source[]>('/api/sources')
      setSources(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function createSource(payload: CreateSourcePayload) {
    const created = await api.post<Source>('/api/sources', payload)
    await refresh()
    return created
  }

  return { sources, isLoading, error, refresh, createSource }
}
