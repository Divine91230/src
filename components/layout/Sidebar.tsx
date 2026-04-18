import { NavLink } from 'react-router-dom'

type NavItem = { label: string; to: string; icon?: string }
type NavGroup = { title: string; items: NavItem[] }

const groups: NavGroup[] = [
  {
    title: 'Cabinet',
    items: [
      { label: 'Dashboard',    to: '/dashboard',  icon: '◈' },
      { label: 'Clients',      to: '/clients',    icon: '◎' },
      { label: 'Tâches',       to: '/tasks',      icon: '◻' },
      { label: 'Paramètres',   to: '/settings',   icon: '◧' },
    ],
  },
  {
    title: 'Dossier client',
    items: [
      { label: 'Découverte patrimoniale',    to: '/discovery',            icon: '◉' },
      { label: 'Analyse',                    to: '/analysis',             icon: '◌' },
      { label: 'Préconisations',             to: '/recommendations',      icon: '◈' },
      { label: 'Scénarios',                  to: '/scenarios',            icon: '◐' },
      { label: 'Enveloppes',                 to: '/envelopes',            icon: '◑' },
      { label: 'Stratégie d\'investissement',to: '/strategy',             icon: '◒' },
      { label: 'Comparatif des contrats',    to: '/contracts-comparison', icon: '◓' },
    ],
  },
  {
    title: 'Outils',
    items: [
      { label: 'Réorganisation patrimoniale',   to: '/envelope-reorganization',     icon: '⬡' },
      { label: 'Simulateur PER',                to: '/simulators/per',              icon: '⬡' },
      { label: 'Sorties AV / Capi',             to: '/simulators/withdrawal',       icon: '⬡' },
      { label: 'Mobilisation épargne',          to: '/simulators/funding-sources',  icon: '⬡' },
    ],
  },
  {
    title: 'Restitution',
    items: [
      { label: 'Rapports',       to: '/reports',           icon: '◧' },
      { label: 'Documents PDF',  to: '/reports/documents', icon: '◨' },
    ],
  },
  {
    title: 'Conformité',
    items: [
      { label: 'Réclamations', to: '/compliance/complaints', icon: '◎' },
    ],
  },
]

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="sidebar-frame">
        {/* Brand */}
        <div className="brand">
          <div className="brand-kicker">Gestion de Patrimoine</div>
          <h1 className="brand-title">DCP</h1>
        </div>

        {/* Navigation */}
        <nav className="nav-tree" aria-label="Navigation principale">
          {groups.map((group) => (
            <section key={group.title} className="nav-group">
              <div className="nav-group-title">{group.title}</div>
              <div className="nav-list">
                {group.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `nav-link${isActive ? ' active' : ''}`
                    }
                  >
                    <span className="nav-link-label">{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </section>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <div className="sidebar-footer-name">Cabinet DCP</div>
          <div className="sidebar-footer-role">Conseiller en gestion</div>
        </div>
      </div>
    </aside>
  )
}
