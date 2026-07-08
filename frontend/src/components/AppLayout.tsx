import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import './AppLayout.css'

const NAV_ITEMS = [
  { to: '/', label: 'Tableau de bord', end: true },
  { to: '/sources', label: 'Sources' },
  { to: '/uploads', label: 'Fichiers' },
]

export function AppLayout() {
  const { logout } = useAuth()

  return (
    <div className="app-layout">
      <aside className="app-sidebar">
        <div className="app-sidebar__brand">DataFlow CI</div>
        <nav className="app-sidebar__nav">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `app-sidebar__link${isActive ? ' app-sidebar__link--active' : ''}`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="app-main">
        <header className="app-topbar">
          <span className="app-topbar__title">Espace de travail</span>
          <button className="app-topbar__logout" onClick={logout}>
            Se déconnecter
          </button>
        </header>
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}