import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { StatusBadge } from '@/components/StatusBadge'
import { useDashboard } from '@/hooks/useDashboard'
import type { UploadStatus } from '@/types'
import './DashboardPage.css'

const STATUS_COLORS: Record<string, string> = {
  PENDING: '#64748b',
  PROCESSING: '#2563eb',
  SUCCESS: '#16a34a',
  PARTIAL: '#d97706',
  FAILED: '#dc2626',
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'En attente',
  PROCESSING: 'En cours',
  SUCCESS: 'Validé',
  PARTIAL: 'Partiel',
  FAILED: 'Échoué',
}

export function DashboardPage() {
  const { stats, isLoading, error } = useDashboard()

  if (isLoading) {
    return <p>Chargement…</p>
  }

  if (error) {
    return <p className="form-error">{error}</p>
  }

  if (!stats) {
    return null
  }

  const statusData = Object.entries(stats.status_counts)
    .filter(([, count]) => count > 0)
    .map(([status, count]) => ({ name: STATUS_LABELS[status], status, value: count }))

  const sourceData = stats.uploads_by_source.map((s) => ({
    name: s.name.length > 18 ? `${s.name.slice(0, 18)}…` : s.name,
    Validé: s.success,
    Partiel: s.partial,
    Échoué: s.failed,
  }))

  const errorData = stats.errors_by_type.slice(0, 8)

  return (
    <div>
      <div className="page-header">
        <h1 className="page-header__title">Tableau de bord</h1>
        <p className="page-header__subtitle">Vue d'ensemble des fichiers ingérés.</p>
      </div>

      <div className="stat-grid">
        <StatCard label="Fichiers ingérés" value={stats.total_files} />
        <StatCard label="Taux de succès (lignes)" value={`${stats.success_rate}%`} />
        <StatCard label="Sources actives" value={stats.active_sources} />
      </div>

      {stats.total_files === 0 ? (
        <div className="chart-placeholder">
          <p>Aucun fichier ingéré pour l'instant. Les statistiques et graphiques apparaîtront ici dès le premier upload.</p>
        </div>
      ) : (
        <div className="chart-grid">
          <div className="chart-card">
            <h2 className="chart-card__title">Répartition des statuts</h2>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80}>
                  {statusData.map((entry) => (
                    <Cell key={entry.status} fill={STATUS_COLORS[entry.status]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card">
            <h2 className="chart-card__title">Fichiers par source</h2>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={sourceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="Validé" stackId="a" fill={STATUS_COLORS.SUCCESS} />
                <Bar dataKey="Partiel" stackId="a" fill={STATUS_COLORS.PARTIAL} />
                <Bar dataKey="Échoué" stackId="a" fill={STATUS_COLORS.FAILED} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="chart-card chart-card--wide">
            <h2 className="chart-card__title">Types d'erreurs les plus fréquents</h2>
            {errorData.length === 0 ? (
              <p className="chart-card__empty">Aucune erreur détectée jusqu'ici.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={errorData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="error_type" tick={{ fontSize: 11 }} width={100} />
                  <Tooltip />
                  <Bar dataKey="count" fill="#2563eb" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {stats.recent_uploads.length > 0 && (
        <>
          <h2 className="section-title">Activité récente</h2>
          <table className="data-table">
            <thead>
              <tr>
                <th>Fichier</th>
                <th>Source</th>
                <th>Statut</th>
                <th>Lignes valides / totales</th>
              </tr>
            </thead>
            <tbody>
              {stats.recent_uploads.map((u) => (
                <tr key={u.id}>
                  <td>{u.original_name}</td>
                  <td>{u.source_name}</td>
                  <td>
                    <StatusBadge status={u.status as UploadStatus} />
                  </td>
                  <td>
                    {u.valid_lines} / {u.total_lines}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="stat-card">
      <span className="stat-card__label">{label}</span>
      <span className="stat-card__value">{value}</span>
    </div>
  )
}