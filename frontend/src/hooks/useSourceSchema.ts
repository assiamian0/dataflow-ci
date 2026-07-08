import { useCallback, useEffect, useState } from 'react'
import { api } from '@/api/client'
import type { SourceSchema } from '@/types'
import type { CreateSourcePayload } from './useSources'

type SchemaPayload = Pick<CreateSourcePayload, 'columns' | 'row_constraints'>

export function useSourceSchema(sourceId: string | null) {
  const [schema, setSchema] = useState<SourceSchema | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!sourceId) return
    setIsLoading(true)
    setError(null)
    try {
      const data = await api.get<SourceSchema>(`/api/sources/${sourceId}/schema`)
      setSchema(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setIsLoading(false)
    }
  }, [sourceId])

  useEffect(() => {
    refresh()
  }, [refresh])

  async function createNewVersion(payload: SchemaPayload) {
    if (!sourceId) throw new Error('Source manquante')
    const created = await api.post<SourceSchema>(`/api/sources/${sourceId}/schema`, payload)
    await refresh()
    return created
  }

  return { schema, isLoading, error, refresh, createNewVersion }
}
