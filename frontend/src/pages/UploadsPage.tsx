import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/Button'
import { EmptyState } from '@/components/EmptyState'
import { StatusBadge } from '@/components/StatusBadge'
import type { FileUpload } from '@/types'
import './UploadsPage.css'

// TODO: remplacer par un appel GET /api/uploads une fois l'endpoint prêt
const MOCK_UPLOADS: FileUpload[] = []

export function UploadsPage() {
  const [uploads] = useState<FileUpload[]>(MOCK_UPLOADS)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    // TODO: POST /api/uploads (multipart/form-data) avec la source sélectionnée
    console.log('Fichier sélectionné :', files[0].name)
  }

  return (
    <div>
      <div className="page-header">
        <h1 className="page-header__title">Fichiers</h1>
        <p className="page-header__subtitle">
          Dépose un fichier CSV ou Excel pour lancer la validation.
        </p>
      </div>

      <div
        className={`dropzone${isDragging ? ' dropzone--active' : ''}`}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setIsDragging(false)
          handleFiles(e.dataTransfer.files)
        }}
      >
        <p className="dropzone__text">Glisse un fichier ici, ou</p>
        <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
          Choisir un fichier
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          hidden
          onChange={(e) => handleFiles(e.target.files)}
        />
        <p className="dropzone__hint">CSV ou Excel, 10 Mo maximum</p>
      </div>

      <h2 className="section-title">Historique</h2>

      {uploads.length === 0 ? (
        <EmptyState
          title="Aucun fichier envoyé"
          description="Les fichiers que tu déposes apparaîtront ici avec leur statut de validation."
        />
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Fichier</th>
              <th>Statut</th>
              <th>Lignes valides / totales</th>
              <th>Reçu le</th>
            </tr>
          </thead>
          <tbody>
            {uploads.map((upload) => (
              <tr key={upload.id}>
                <td>
                  <Link className="data-table-link" to={`/uploads/${upload.id}`}>
                    {upload.original_name}
                  </Link>
                </td>
                <td>
                  <StatusBadge status={upload.status} />
                </td>
                <td>
                  {upload.valid_lines} / {upload.total_lines}
                </td>
                <td>{new Date(upload.created_at).toLocaleString('fr-FR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
