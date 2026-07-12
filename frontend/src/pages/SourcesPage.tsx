import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/Button'
import { CreateSourceModal } from '@/components/CreateSourceModal'
import { EditSchemaModal } from '@/components/EditSchemaModal'
import { EmptyState } from '@/components/EmptyState'
import { useSources } from '@/hooks/useSources'

export function SourcesPage() {
  const { sources, isLoading, error, createSource, refresh } = useSources()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [editingSourceId, setEditingSourceId] = useState<string | null>(null)

  const editingSource = sources.find((s) => s.source_id === editingSourceId)

  return (
    <div>
      <div className="page-header page-header__row">
        <div>
          <h1 className="page-header__title">Sources</h1>
          <p className="page-header__subtitle">
            Chaque source définit le schéma attendu pour ses fichiers.
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>Nouvelle source</Button>
      </div>

      {error && <p className="form-error">{error}</p>}

      {isLoading ? (
        <p>Chargement…</p>
      ) : sources.length === 0 ? (
        <EmptyState
          title="Aucune source pour l'instant"
          description="Crée ta première source pour définir le schéma attendu (colonnes, formats, règles) et commencer à recevoir des fichiers."
          action={<Button onClick={() => setIsCreateModalOpen(true)}>Créer une source</Button>}
        />
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Fréquence</th>
              <th>Délimiteur</th>
              <th>Créée le</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sources.map((source) => (
              <tr key={source.id}>
                <td>
                  <Link className="data-table-link" to={`/sources/${source.source_id}`}>
                    {source.name}
                  </Link>
                </td>
                <td>{source.expected_frequency ?? '—'}</td>
                <td className="mono">{source.delimiter}</td>
                <td>{new Date(source.created_at).toLocaleDateString('fr-FR')}</td>
                <td>
                  <Button variant="secondary" onClick={() => setEditingSourceId(source.source_id)}>
                    Modifier le schéma
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {isCreateModalOpen && (
        <CreateSourceModal onClose={() => setIsCreateModalOpen(false)} onCreate={createSource} />
      )}

      {editingSource && (
        <EditSchemaModal
          sourceId={editingSource.source_id}
          sourceName={editingSource.name}
          onClose={() => setEditingSourceId(null)}
          onUpdated={refresh}
        />
      )}
    </div>
  )
}