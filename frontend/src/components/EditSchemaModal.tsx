import { type FormEvent, useEffect, useState } from 'react'
import { Button } from '@/components/Button'
import { ColumnsAndConstraintsFields } from '@/components/ColumnsAndConstraintsFields'
import { useSourceSchema } from '@/hooks/useSourceSchema'
import {
  buildColumnsPayload,
  buildConstraintsPayload,
  columnToDraft,
  constraintToDraft,
  emptyColumn,
  type ColumnDraft,
  type RowConstraintDraft,
} from '@/utils/schemaFormDrafts'
import './CreateSourceModal.css'

interface EditSchemaModalProps {
  sourceId: string
  sourceName: string
  onClose: () => void
  onUpdated: () => void
}

export function EditSchemaModal({ sourceId, sourceName, onClose, onUpdated }: EditSchemaModalProps) {
  const { schema, isLoading, error: loadError, createNewVersion } = useSourceSchema(sourceId)

  const [columns, setColumns] = useState<ColumnDraft[]>([emptyColumn()])
  const [rowConstraints, setRowConstraints] = useState<RowConstraintDraft[]>([])
  const [hasPrefilled, setHasPrefilled] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Pré-remplit le formulaire avec le schéma actif dès qu'il est chargé,
  // une seule fois (pour ne pas écraser les modifications en cours de saisie).
  useEffect(() => {
    if (schema && !hasPrefilled) {
      setColumns(schema.columns.length > 0 ? schema.columns.map(columnToDraft) : [emptyColumn()])
      setRowConstraints((schema.row_constraints ?? []).map(constraintToDraft))
      setHasPrefilled(true)
    }
  }, [schema, hasPrefilled])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      await createNewVersion({
        columns: buildColumnsPayload(columns),
        row_constraints: buildConstraintsPayload(rowConstraints),
      })
      onUpdated()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur inconnue')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-panel" onClick={(e) => e.stopPropagation()}>
        <div className="modal-panel__header">
          <h2>Modifier le schéma — {sourceName}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </div>

        {isLoading ? (
          <p className="create-source-form">Chargement du schéma actuel…</p>
        ) : loadError ? (
          <p className="create-source-form form-error">{loadError}</p>
        ) : (
          <form onSubmit={handleSubmit} className="create-source-form">
            <p className="constraints-section__hint">
              {schema && (
                <>
                  Version actuelle : <strong>v{schema.version}</strong>. Enregistrer créera la{' '}
                  <strong>v{schema.version + 1}</strong> — les fichiers déjà validés avec la version actuelle ne
                  sont pas affectés.
                </>
              )}
            </p>

            <ColumnsAndConstraintsFields
              columns={columns}
              setColumns={setColumns}
              rowConstraints={rowConstraints}
              setRowConstraints={setRowConstraints}
            />

            {error && <p className="form-error">{error}</p>}

            <div className="modal-panel__actions">
              <Button type="button" variant="secondary" onClick={onClose}>
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Enregistrement…' : 'Créer la nouvelle version'}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
