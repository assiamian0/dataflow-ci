import { useCallback, useEffect, useState } from 'react'
import { api } from '@/api/client'
import type { FileUpload, IngestionError } from '@/types'

interface UploadDetail extends FileUpload {
  errors: IngestionError[]
  source: { source_id: string; name: string }
}

export function useUploadDetail(uploadId: string | undefined) {
  const [upload, setUpload] = useState<UploadDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!uploadId) return
    setIsLoading(true)
    setError(null)
    try {
      const data = await api.get<UploadDetail>(`/api/uploads/${uploadId}`)
      setUpload(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setIsLoading(false)
    }
  }, [uploadId])

  useEffect(() => {
    refresh()
  }, [refresh])

  return { upload, isLoading, error, refresh }
}
