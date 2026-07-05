import { type FormEvent, useState } from 'react'
import { Button } from '@/components/Button'
import type { CreateSourcePayload } from '@/hooks/useSources'
import type { ColumnType, ComparisonOperator } from '@/types'
import './CreateSourceModal.css'

interface ColumnDraft {
  id: number
  name: string
  type: ColumnType
  required: boolean
  format?: string
  pattern?: string
  min?: string
  max?: string
  min_length?: string
  max_length?: string
  allowed_values?: string
}

interface RowConstraintDraft {
  id: number
  kind: 'unique' | 'comparison'
  name: string
  description: string
  columns: string[] // pour kind: 'unique'
  column_a?: string // pour kind: 'comparison'
  operator?: ComparisonOperator
  column_b?: string
}

interface CreateSourceModalProps {
  onClose: () => void
  onCreate: (payload: CreateSourcePayload) => Promise<unknown>
}

let nextColumnId = 1
let nextConstraintId = 1

function emptyColumn(): ColumnDraft {
  return { id: nextColumnId++, name: '', type: 'string', required: true }
}

function emptyConstraint(): RowConstraintDraft {
  return { id: nextConstraintId++, kind: 'unique', name: '', description: '', columns: [] }
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

  function updateColumn(id: number, changes: Partial<ColumnDraft>) {
    setColumns((cols) => cols.map((c) => (c.id === id ? { ...c, ...changes } : c)))
  }

  function removeColumn(id: number) {
    setColumns((cols) => cols.filter((c) => c.id !== id))
  }

  function updateConstraint(id: number, changes: Partial<RowConstraintDraft>) {
    setRowConstraints((cs) => cs.map((c) => (c.id === id ? { ...c, ...changes } : c)))
  }

  function toggleConstraintColumn(constraintId: number, columnName: string) {
    setRowConstraints((cs) =>
      cs.map((c) => {
        if (c.id !== constraintId) return c
        const isSelected = c.columns.includes(columnName)
        return {
          ...c,
          columns: isSelected ? c.columns.filter((n) => n !== columnName) : [...c.columns, columnName],
        }
      })
    )
  }

  function removeConstraint(id: number) {
    setRowConstraints((cs) => cs.filter((c) => c.id !== id))
  }

  function buildPayload(): CreateSourcePayload {
    const validConstraints = rowConstraints.filter((c) => {
      if (!c.name) return false
      if (c.kind === 'unique') return c.columns.length > 0
      return !!(c.column_a && c.operator && c.column_b)
    })

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
      row_constraints: validConstraints.length > 0
        ? validConstraints.map((c) =>
            c.kind === 'unique'
              ? {
                  type: 'unique' as const,
                  name: c.name,
                  description: c.description || undefined,
                  columns: c.columns,
                }
              : {
                  type: 'comparison' as const,
                  name: c.name,
                  description: c.description || undefined,
                  column_a: c.column_a!,
                  operator: c.operator!,
                  column_b: c.column_b!,
                }
          )
        : undefined,
      columns: columns.map((col) => {
        const out: CreateSourcePayload['columns'][number] = {
          name: col.name,
          type: col.type,
          required: col.required,
        }
        if (col.type === 'date' && col.format) out.format = col.format
        if (col.type === 'string') {
          if (col.pattern) out.pattern = col.pattern
          if (col.min_length) out.min_length = Number(col.min_length)
          if (col.max_length) out.max_length = Number(col.max_length)
        }
        if (col.type === 'integer' || col.type === 'float') {
          if (col.min) out.min = Number(col.min)
          if (col.max) out.max = Number(col.max)
        }
        if (col.type === 'enum' && col.allowed_values) {
          out.allowed_values = col.allowed_values
            .split(',')
            .map((v) => v.trim())
            .filter(Boolean)
        }
        return out
      }),
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

          <div className="columns-section">
            <div className="columns-section__header">
              <span>Colonnes</span>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setColumns((cols) => [...cols, emptyColumn()])}
              >
                + Ajouter une colonne
              </Button>
            </div>

            {columns.map((col) => (
              <div key={col.id} className="column-row">
                <div className="column-row__main">
                  <input
                    className="column-row__name"
                    value={col.name}
                    onChange={(e) => updateColumn(col.id, { name: e.target.value })}
                    placeholder="nom_colonne"
                    required
                  />
                  <select
                    value={col.type}
                    onChange={(e) => updateColumn(col.id, { type: e.target.value as ColumnType })}
                  >
                    <option value="date">date</option>
                    <option value="string">string</option>
                    <option value="integer">integer</option>
                    <option value="float">float</option>
                    <option value="enum">enum</option>
                  </select>
                  <label className="column-row__required">
                    <input
                      type="checkbox"
                      checked={col.required}
                      onChange={(e) => updateColumn(col.id, { required: e.target.checked })}
                    />
                    requis
                  </label>
                  <button
                    type="button"
                    className="column-row__remove"
                    onClick={() => removeColumn(col.id)}
                    aria-label="Supprimer la colonne"
                    disabled={columns.length === 1}
                  >
                    ✕
                  </button>
                </div>

                {col.type === 'date' && (
                  <select value={col.format ?? ''} onChange={(e) => updateColumn(col.id, { format: e.target.value })}>
                    <option value="">Format de date…</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  </select>
                )}

                {col.type === 'string' && (
                  <>
                    <input
                      value={col.pattern ?? ''}
                      onChange={(e) => updateColumn(col.id, { pattern: e.target.value })}
                      placeholder="Pattern regex (optionnel), ex: ^CLI-\d{6}$"
                    />
                    <div className="column-row__minmax">
                      <input
                        type="number"
                        value={col.min_length ?? ''}
                        onChange={(e) => updateColumn(col.id, { min_length: e.target.value })}
                        placeholder="Longueur min"
                      />
                      <input
                        type="number"
                        value={col.max_length ?? ''}
                        onChange={(e) => updateColumn(col.id, { max_length: e.target.value })}
                        placeholder="Longueur max"
                      />
                    </div>
                  </>
                )}

                {(col.type === 'integer' || col.type === 'float') && (
                  <div className="column-row__minmax">
                    <input
                      type="number"
                      value={col.min ?? ''}
                      onChange={(e) => updateColumn(col.id, { min: e.target.value })}
                      placeholder="Min"
                    />
                    <input
                      type="number"
                      value={col.max ?? ''}
                      onChange={(e) => updateColumn(col.id, { max: e.target.value })}
                      placeholder="Max"
                    />
                  </div>
                )}

                {col.type === 'enum' && (
                  <input
                    value={col.allowed_values ?? ''}
                    onChange={(e) => updateColumn(col.id, { allowed_values: e.target.value })}
                    placeholder="Valeurs séparées par virgule, ex: Abidjan, Bouaké, Daloa"
                  />
                )}
              </div>
            ))}
          </div>

          <div className="constraints-section">
            <div className="columns-section__header">
              <span>Contraintes (optionnel)</span>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setRowConstraints((cs) => [...cs, emptyConstraint()])}
              >
                + Ajouter une contrainte
              </Button>
            </div>
            <p className="constraints-section__hint">
              Une contrainte d'<strong>unicité</strong> vérifie qu'une combinaison de colonnes ne se répète pas
              entre plusieurs lignes. Une contrainte de <strong>comparaison</strong> vérifie une relation entre
              deux colonnes de la même ligne (ex : une date doit précéder une autre).
            </p>

            {rowConstraints.map((constraint) => {
              const namedColumns = columns.filter((c) => c.name)

              return (
                <div key={constraint.id} className="constraint-row">
                  <div className="constraint-row__main">
                    <select
                      value={constraint.kind}
                      onChange={(e) =>
                        updateConstraint(constraint.id, { kind: e.target.value as 'unique' | 'comparison' })
                      }
                    >
                      <option value="unique">Unicité</option>
                      <option value="comparison">Comparaison</option>
                    </select>
                    <input
                      value={constraint.name}
                      onChange={(e) => updateConstraint(constraint.id, { name: e.target.value })}
                      placeholder={
                        constraint.kind === 'unique' ? 'unique_per_day_per_client' : 'reappro_before_inventory'
                      }
                    />
                    <button
                      type="button"
                      className="column-row__remove"
                      onClick={() => removeConstraint(constraint.id)}
                      aria-label="Supprimer la contrainte"
                    >
                      ✕
                    </button>
                  </div>

                  <input
                    value={constraint.description}
                    onChange={(e) => updateConstraint(constraint.id, { description: e.target.value })}
                    placeholder="Description (optionnel, pour toi et ton équipe)"
                  />

                  {constraint.kind === 'unique' ? (
                    <div className="constraint-row__columns">
                      <span className="constraint-row__columns-label">Colonnes concernées :</span>
                      {namedColumns.length === 0 ? (
                        <span className="constraint-row__no-columns">
                          Nomme d'abord au moins une colonne ci-dessus.
                        </span>
                      ) : (
                        namedColumns.map((c) => (
                          <label key={c.id} className="constraint-row__column-checkbox">
                            <input
                              type="checkbox"
                              checked={constraint.columns.includes(c.name)}
                              onChange={() => toggleConstraintColumn(constraint.id, c.name)}
                            />
                            {c.name}
                            {!c.required && <span className="constraint-row__optional-tag">optionnelle</span>}
                          </label>
                        ))
                      )}
                    </div>
                  ) : (
                    <div className="constraint-row__comparison">
                      <select
                        value={constraint.column_a ?? ''}
                        onChange={(e) => updateConstraint(constraint.id, { column_a: e.target.value })}
                      >
                        <option value="">Colonne A…</option>
                        {namedColumns.map((c) => (
                          <option key={c.id} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <select
                        value={constraint.operator ?? ''}
                        onChange={(e) =>
                          updateConstraint(constraint.id, { operator: e.target.value as ComparisonOperator })
                        }
                      >
                        <option value="">opérateur…</option>
                        <option value="<=">{'<='}</option>
                        <option value="<">{'<'}</option>
                        <option value=">=">{'>='}</option>
                        <option value=">">{'>'}</option>
                        <option value="==">{'=='}</option>
                      </select>
                      <select
                        value={constraint.column_b ?? ''}
                        onChange={(e) => updateConstraint(constraint.id, { column_b: e.target.value })}
                      >
                        <option value="">Colonne B…</option>
                        {namedColumns.map((c) => (
                          <option key={c.id} value={c.name}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

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
