import type { UploadStatus } from '@/types'
import './StatusBadge.css'

const STATUS_LABELS: Record<UploadStatus, string> = {
  PENDING: 'En attente',
  PROCESSING: 'En cours',
  SUCCESS: 'Validé',
  PARTIAL: 'Partiel',
  FAILED: 'Échoué',
}

interface StatusBadgeProps {
  status: UploadStatus
}

export function StatusBadge({ status }: StatusBadgeProps) {
  return (
    <span className={`status-badge status-badge--${status.toLowerCase()}`}>
      <span className="status-badge__dot" aria-hidden="true" />
      {STATUS_LABELS[status]}
    </span>
  )
}
