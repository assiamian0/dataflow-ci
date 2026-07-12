import { Link, useParams } from 'react-router-dom'
import { Button } from '@/components/Button'
import { EmptyState } from '@/components/EmptyState'
import { StatusBadge } from '@/components/StatusBadge'
import { useUploadDetail } from '@/hooks/useUploadDetail'
import { api } from '@/api/client'
import './UploadDetailPage.css'

const ERROR_TYPE_LABELS: Record<string, string> = {
  REQUIRED: 'Champ obligatoire',
  TYPE: 'Type incorrect',
  FORMAT: 'Format invalide',
  PATTERN: 'Format ne correspond pas',
  ENUM: 'Valeur non autorisée',
  RANGE: 'Hors limites',
  LENGTH: 'Longueur invalide',
  DUPLICATE: 'Doublon',
  CONSTRAINT: 'Contrainte violée',
}

export function UploadDetailPage() {
  const { uploadId } = useParams<{ uploadId: string }>()
  const { upload, isLoading, error } = useUploadDetail(uploadId)

  if (isLoading) return <p>Chargement…</p>
  if (error) return <p className="form-error">{error}</p>
  if (!upload) return null

  return (
    <div>
      <Link className="back-link" to="/uploads">
        ← Retour aux fichiers
      </Link>

      <div className="page-header page-header__row">
        <div>
          <h1 className="page-header__title">{upload.original_name}</h1>
          <p className="page-header__subtitle">
            Source : {upload.source.name} — reçu le{' '}
            {new Date(upload.created_at).toLocaleString('fr-FR')}
          </p>
        </div>
        {upload.valid_file_path && (
          <Button
            variant="secondary"
            onClick={() => api.download(`/api/uploads/${upload.id}/download`, `valides-${upload.original_name}`)}
          >
            Télécharger les lignes valides
          </Button>
        )}
      </div>

      <div className="upload-summary">
        <div className="upload-summary__item">
          <span className="upload-summary__label">Statut</span>
          <StatusBadge status={upload.status} />
        </div>
        <div className="upload-summary__item">
          <span className="upload-summary__label">Lignes totales</span>
          <span className="upload-summary__value">{upload.total_lines}</span>
        </div>
        <div className="upload-summary__item">
          <span className="upload-summary__label">Lignes valides</span>
          <span className="upload-summary__value upload-summary__value--success">{upload.valid_lines}</span>
        </div>
        <div className="upload-summary__item">
          <span className="upload-summary__label">Lignes invalides</span>
          <span className="upload-summary__value upload-summary__value--failed">{upload.invalid_lines}</span>
        </div>
      </div>

      <h2 className="section-title">Détail des erreurs</h2>

      {upload.errors.length === 0 ? (
        <EmptyState
          title="Aucune erreur"
          description="Toutes les lignes de ce fichier ont été validées avec succès."
        />
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Ligne</th>
              <th>Colonne</th>
              <th>Type</th>
              <th>Raison</th>
            </tr>
          </thead>
          <tbody>
            {upload.errors.map((err) => (
              <tr key={err.id}>
                <td className="mono">{err.line_number}</td>
                <td className="mono">{err.column_name}</td>
                <td>{ERROR_TYPE_LABELS[err.error_type] ?? err.error_type}</td>
                <td>{err.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}