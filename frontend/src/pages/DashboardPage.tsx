import './DashboardPage.css'

// TODO: remplacer par un appel GET /api/dashboard une fois l'endpoint prêt
const MOCK_STATS = {
  total_files: 0,
  success_rate: 0,
  active_sources: 0,
}

export function DashboardPage() {
  return (
    <div>
      <div className="page-header">
        <h1 className="page-header__title">Tableau de bord</h1>
        <p className="page-header__subtitle">
          Vue d'ensemble des fichiers ingérés sur la dernière période.
        </p>
      </div>

      <div className="stat-grid">
        <StatCard label="Fichiers ingérés" value={MOCK_STATS.total_files} />
        <StatCard label="Taux de succès" value={`${MOCK_STATS.success_rate}%`} />
        <StatCard label="Sources actives" value={MOCK_STATS.active_sources} />
      </div>

      <div className="chart-placeholder">
        <p>Les visualisations (répartition par source, évolution du taux d'erreur) s'afficheront ici une fois des fichiers ingérés.</p>
      </div>
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
