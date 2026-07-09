import { prisma } from '../config/prisma'

type UploadStatus = 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'PARTIAL' | 'FAILED'

interface SourceLite {
  id: string
  source_id: string
  name: string
}

interface UploadWithSource {
  id: string
  status: UploadStatus
  total_lines: number
  valid_lines: number
  invalid_lines: number
  original_name: string
  created_at: Date
  source: SourceLite
}

export async function getDashboardStats(userId: string) {
  const sources: SourceLite[] = await prisma.source.findMany({ where: { user_id: userId } })
  const sourceIds = sources.map((s: SourceLite) => s.id)

  const uploads: UploadWithSource[] = await prisma.fileUpload.findMany({
    where: { source_id: { in: sourceIds } },
    include: { source: { select: { id: true, source_id: true, name: true } } },
    orderBy: { created_at: 'desc' },
  })

  // ─── Statuts globaux ───────────────────────────────
  const totalFiles = uploads.length
  const statusCounts: Record<UploadStatus, number> = {
    PENDING: 0,
    PROCESSING: 0,
    SUCCESS: 0,
    PARTIAL: 0,
    FAILED: 0,
  }
  for (const u of uploads) statusCounts[u.status]++

  // Taux de succès au niveau "ligne" : proportion de lignes valides sur
  // l'ensemble des lignes traitées, tous fichiers confondus. Plus parlant
  // qu'un taux au niveau fichier quand beaucoup de fichiers sont "partial".
  const totalLines = uploads.reduce((sum, u) => sum + u.total_lines, 0)
  const validLines = uploads.reduce((sum, u) => sum + u.valid_lines, 0)
  const successRate = totalLines > 0 ? Math.round((validLines / totalLines) * 1000) / 10 : 0

  // ─── Répartition par source ───────────────────────────────
  const bySourceMap = new Map<
    string,
    { source_id: string; name: string; total: number; success: number; partial: number; failed: number }
  >()

  for (const u of uploads) {
    const key = u.source.source_id
    const entry = bySourceMap.get(key) ?? {
      source_id: u.source.source_id,
      name: u.source.name,
      total: 0,
      success: 0,
      partial: 0,
      failed: 0,
    }
    entry.total++
    if (u.status === 'SUCCESS') entry.success++
    if (u.status === 'PARTIAL') entry.partial++
    if (u.status === 'FAILED') entry.failed++
    bySourceMap.set(key, entry)
  }

  const uploadsBySource = [...bySourceMap.values()].sort((a, b) => b.total - a.total)
  const mostActiveSources = uploadsBySource.slice(0, 5)

  // ─── Répartition des erreurs par type ───────────────────────────────
  const uploadIds = uploads.map((u) => u.id)
  const errors = uploadIds.length > 0
    ? await prisma.ingestionError.findMany({ where: { upload_id: { in: uploadIds } }, select: { error_type: true } })
    : []

  const errorTypeCounts = new Map<string, number>()
  for (const e of errors) {
    errorTypeCounts.set(e.error_type, (errorTypeCounts.get(e.error_type) ?? 0) + 1)
  }
  const errorsByType = [...errorTypeCounts.entries()]
    .map(([error_type, count]) => ({ error_type, count }))
    .sort((a, b) => b.count - a.count)

  // ─── Activité récente ───────────────────────────────
  const recentUploads = uploads.slice(0, 10).map((u) => ({
    id: u.id,
    original_name: u.original_name,
    status: u.status,
    source_name: u.source.name,
    total_lines: u.total_lines,
    valid_lines: u.valid_lines,
    invalid_lines: u.invalid_lines,
    created_at: u.created_at,
  }))

  return {
    total_files: totalFiles,
    active_sources: sources.length,
    success_rate: successRate,
    status_counts: statusCounts,
    uploads_by_source: uploadsBySource,
    most_active_sources: mostActiveSources,
    errors_by_type: errorsByType,
    recent_uploads: recentUploads,
  }
}
