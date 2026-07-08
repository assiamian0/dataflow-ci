import { type FormEvent, useState } from 'react'
import { Button } from '@/components/Button'
import { ColumnsAndConstraintsFields } from '@/components/ColumnsAndConstraintsFields'
import type { CreateSourcePayload } from '@/hooks/useSources'
import {
  buildColumnsPayload,
  buildConstraintsPayload,
  emptyColumn,
  type ColumnDraft,
  type RowConstraintDraft,
} from '@/utils/schemaFormDrafts'
import './CreateSourceModal.css'

interface CreateSourceModalProps {
  onClose: () => void
  onCreate: (payload: CreateSourcePayload) => Promise<unknown>
}

export function CreateSourceModal({ onClose, onCreate }: CreateSourceModalProps) {
  const [sourceId, setSourceId] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [owner, setOwner] = useState('')
  const [frequency, setFrequency] = useState<'weekly' | 'daily'>('weekly')
  const [delimiter, setDelimiter] = useState(',')
  const [hasHeader, setHasHeader] = useState(true)
  const [columns, setColumns] = useState<ColumnDraft[]>([emptyColumn()])
  const [rowConstraints, setRowConstraints] = useState<RowConstraintDraft[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function buildPayload(): CreateSourcePayload {
    return {
      source_id: sourceId,
      name,
      description: description || undefined,
      owner: owner || undefined,
      expected_frequency: frequency,
      file_format: 'csv',
      delimiter,
      encoding: 'utf-8',
      has_header: hasHeader,
      row_constraints: buildConstraintsPayload(rowConstraints),
      columns: buildColumnsPayload(columns),
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)

    try {
      await onCreate(buildPayload())
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
          <h2>Nouvelle source</h2>
          <button className="modal-close" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="create-source-form">
          <div className="form-grid">
            <label className="form-field">
              <span>Identifiant technique</span>
              <input
                value={sourceId}
                onChange={(e) => setSourceId(e.target.value)}
                placeholder="ventes-orange-ci"
                pattern="[a-z0-9-]+"
                required
              />
            </label>

            <label className="form-field">
              <span>Nom</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ventes Orange CI - Hebdomadaire"
                required
              />
            </label>

            <label className="form-field form-field--full">
              <span>Description</span>
              <input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ventes hebdomadaires remontées par..."
              />
            </label>

            <label className="form-field form-field--full">
              <span>Propriétaire</span>
              <input
                value={owner}
                onChange={(e) => setOwner(e.target.value)}
                placeholder="DataFlow CI - Équipe Télécom"
              />
            </label>

            <label className="form-field">
              <span>Fréquence</span>
              <select value={frequency} onChange={(e) => setFrequency(e.target.value as 'weekly' | 'daily')}>
                <option value="daily">daily</option>
                <option value="weekly">weekly</option>
              </select>
            </label>

            <label className="form-field">
              <span>Délimiteur</span>
              <select value={delimiter} onChange={(e) => setDelimiter(e.target.value)}>
                <option value=",">, (virgule)</option>
                <option value=";">; (point-virgule)</option>
              </select>
            </label>
          </div>

          <label className="form-checkbox">
            <input type="checkbox" checked={hasHeader} onChange={(e) => setHasHeader(e.target.checked)} />
            Le fichier contient une ligne d'en-tête
          </label>

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
              {isSubmitting ? 'Création…' : 'Créer la source'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}