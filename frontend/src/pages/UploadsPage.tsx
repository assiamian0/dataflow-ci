import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '@/api/client'
import { Button } from '@/components/Button'
import { EmptyState } from '@/components/EmptyState'
import { StatusBadge } from '@/components/StatusBadge'
import { useSources } from '@/hooks/useSources'
import { useUploads } from '@/hooks/useUploads'
import './UploadsPage.css'

interface PendingFile {
  id: number
  file: File
  status: 'pending' | 'uploading' | 'error'
  error?: string
}

let nextPendingId = 1

export function UploadsPage() {
  const { sources } = useSources()
  const { uploads, isLoading, error, uploadFile } = useUploads()

  const [sourceId, setSourceId] = useState('')
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function addFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    const newEntries: PendingFile[] = Array.from(files).map((file) => ({
      id: nextPendingId++,
      file,
      status: 'pending',
    }))
    setPendingFiles((prev) => [...prev, ...newEntries])
  }

  function removePendingFile(id: number) {
    setPendingFiles((prev) => prev.filter((f) => f.id !== id))
  }

  async function handleValidate() {
    if (!sourceId || pendingFiles.length === 0) return
    setIsValidating(true)

    for (const pending of pendingFiles) {
      if (pending.status !== 'pending') continue

      setPendingFiles((prev) => prev.map((f) => (f.id === pending.id ? { ...f, status: 'uploading' } : f)))

      try {
        await uploadFile(sourceId, pending.file)
        setPendingFiles((prev) => prev.filter((f) => f.id !== pending.id))
      } catch (err) {
        setPendingFiles((prev) =>
          prev.map((f) =>
            f.id === pending.id
              ? { ...f, status: 'error', error: err instanceof Error ? err.message : 'Erreur inconnue' }
              : f
          )
        )
      }
    }

    setIsValidating(false)
  }

  const hasPendingToValidate = pendingFiles.some((f) => f.status === 'pending')

  return (
    <div>
      <div className="page-header">
        <h1 className="page-header__title">Fichiers</h1>
        <p className="page-header__subtitle">
          Dépose un ou plusieurs fichiers CSV ou Excel pour lancer la validation.
        </p>
      </div>

      <label className="form-field upload-source-field">
        <span>Source</span>
        <select value={sourceId} onChange={(e) => setSourceId(e.target.value)}>
          <option value="">Sélectionne une source…</option>
          {sources.map((s) => (
            <option key={s.id} value={s.source_id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>

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
          addFiles(e.dataTransfer.files)
        }}
      >
        <p className="dropzone__text">Glisse un ou plusieurs fichiers ici, ou</p>
        <Button variant="secondary" onClick={() => fileInputRef.current?.click()}>
          Choisir des fichiers
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.xlsx,.xls"
          multiple
          hidden
          onChange={(e) => {
            addFiles(e.target.files)
            e.target.value = '' // permet de re-sélectionner le même fichier ensuite
          }}
        />
        <p className="dropzone__hint">CSV ou Excel, 10 Mo maximum par fichier</p>
      </div>

      {pendingFiles.length > 0 && (
        <div className="pending-files">
          {pendingFiles.map((pf) => (
            <div key={pf.id} className={`pending-file${pf.status === 'error' ? ' pending-file--error' : ''}`}>
              <span className="pending-file__name">{pf.file.name}</span>
              <span className="pending-file__size">{(pf.file.size / 1024).toFixed(0)} Ko</span>
              {pf.status === 'uploading' && <span className="pending-file__status">Envoi…</span>}
              {pf.status === 'error' && <span className="pending-file__status pending-file__status--error">{pf.error}</span>}
              <button
                type="button"
                className="pending-file__remove"
                onClick={() => removePendingFile(pf.id)}
                aria-label="Retirer ce fichier"
                disabled={pf.status === 'uploading'}
              >
                ✕
              </button>
            </div>
          ))}

          <Button onClick={handleValidate} disabled={!sourceId || !hasPendingToValidate || isValidating}>
            {isValidating ? 'Validation…' : `Valider ${pendingFiles.length} fichier(s)`}
          </Button>
          {!sourceId && <p className="pending-files__hint">Choisis une source avant de valider.</p>}
        </div>
      )}

      <h2 className="section-title">Historique</h2>

      {error && <p className="form-error">{error}</p>}

      {isLoading ? (
        <p>Chargement…</p>
      ) : uploads.length === 0 ? (
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
              <th></th>
            </tr>
          </thead>
          <tbody>
            {uploads.map((upload) => {
              const hasErrors = upload.status === 'PARTIAL' || upload.status === 'FAILED'

              return (
                <tr key={upload.id}>
                  <td>{upload.original_name}</td>
                  <td>
                    <StatusBadge status={upload.status} />
                  </td>
                  <td>
                    {upload.valid_lines} / {upload.total_lines}
                  </td>
                  <td>{new Date(upload.created_at).toLocaleString('fr-FR')}</td>
                  <td className="uploads-row__actions">
                    {upload.valid_file_path && (
                      <Button
                        variant="secondary"
                        onClick={() =>
                          api.download(`/api/uploads/${upload.id}/download`, `valides-${upload.original_name}`)
                        }
                      >
                        Télécharger
                      </Button>
                    )}
                    {hasErrors && (
                      <Link className="btn btn--danger-outline" to={`/uploads/${upload.id}`}>
                        Voir détails erreurs
                      </Link>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}