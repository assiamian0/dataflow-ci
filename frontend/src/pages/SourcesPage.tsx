import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/Button'
import { EmptyState } from '@/components/EmptyState'
import type { Source } from '@/types'

// TODO: remplacer par un appel GET /api/sources une fois l'endpoint prêt
const MOCK_SOURCES: Source[] = []

export function SourcesPage() {
  const [sources] = useState<Source[]>(MOCK_SOURCES)

  return (
    <div>
      <div className="page-header page-header__row">
        <div>
          <h1 className="page-header__title">Sources</h1>
          <p className="page-header__subtitle">
            Chaque source définit le schéma attendu pour ses fichiers.
          </p>
        </div>
        <Button>Nouvelle source</Button>
      </div>

      {sources.length === 0 ? (
        <EmptyState
          title="Aucune source pour l'instant"
          description="Crée ta première source pour définir le schéma attendu (colonnes, formats, règles) et commencer à recevoir des fichiers."
          action={<Button>Créer une source</Button>}
        />
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>Nom</th>
              <th>Fréquence</th>
              <th>Délimiteur</th>
              <th>Créée le</th>
            </tr>
          </thead>
          <tbody>
            {sources.map((source) => (
              <tr key={source.id}>
                <td>
                  <Link className="data-table-link" to={`/sources/${source.id}`}>
                    {source.name}
                  </Link>
                </td>
                <td>{source.expected_frequency ?? '—'}</td>
                <td className="mono">{source.delimiter}</td>
                <td>{new Date(source.created_at).toLocaleDateString('fr-FR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
