import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '@/api/client'
import type { FileUpload } from '@/types'

const POLL_INTERVAL_MS = 3000

function hasUnfinishedUploads(uploads: FileUpload[]) {
  return uploads.some((u) => u.status === 'PENDING' || u.status === 'PROCESSING')
}

export function useUploads() {
  const [uploads, setUploads] = useState<FileUpload[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchUploads = useCallback(async (showLoading = true) => {
    if (showLoading) setIsLoading(true)
    setError(null)
    try {
      const data = await api.get<FileUpload[]>('/api/uploads')
      setUploads(data)
      return data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
      return []
    } finally {
      if (showLoading) setIsLoading(false)
    }
  }, [])

  // Chargement initial
  useEffect(() => {
    fetchUploads()
  }, [fetchUploads])

  // Polling : tant qu'au moins un fichier est PENDING/PROCESSING, on réinterroge
  // le serveur toutes les 3 secondes, sans réafficher le spinner de chargement.
  useEffect(() => {
    if (hasUnfinishedUploads(uploads)) {
      intervalRef.current = setInterval(() => {
        fetchUploads(false)
      }, POLL_INTERVAL_MS)
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [uploads, fetchUploads])

  async function uploadFile(sourceId: string, file: File) {
    const formData = new FormData()
    formData.append('source_id', sourceId)
    formData.append('file', file)
    const created = await api.postForm<FileUpload>('/api/uploads', formData)
    await fetchUploads(false)
    return created
  }

  return { uploads, isLoading, error, refresh: () => fetchUploads(), uploadFile }
}