import './SectionNav.css'

export type DiscoverySectionKey =
  | 'identity'
  | 'income'
  | 'assets'
  | 'liabilities'
  | 'tax'
  | 'investment'
  | 'protection'
  | 'profile'
  | 'documents'

type NavItem = {
  key: DiscoverySectionKey
  step: string
  label: string
  helper: string
}

const items: NavItem[] = [
  { key: 'identity', step: '01', label: 'Identité & foyer', helper: 'Base dossier' },
  { key: 'income', step: '02', label: 'Revenus & charges', helper: 'Budget' },
  { key: 'assets', step: '03', label: 'Actifs & enveloppes', helper: 'Patrimoine' },
  { key: 'liabilities', step: '04', label: 'Passif', helper: 'Engagements' },
  { key: 'tax', step: '05', label: 'Fiscalité', helper: 'Cadre fiscal' },
  { key: 'investment', step: '06', label: 'Projet d’investissement', helper: 'Projet' },
  { key: 'protection', step: '07', label: 'Protection', helper: 'Couverture' },
  { key: 'profile', step: '08', label: 'Objectifs • Risque • ESG', helper: 'Profil' },
  { key: 'documents', step: '09', label: 'Documents & notes', helper: 'Notes' },
]

export function SectionNav({
  active,
  onChange,
}: {
  active: DiscoverySectionKey
  onChange: (key: DiscoverySectionKey) => void
}) {
  return (
    <section className="card discovery-refonte-nav-card">
      <div className="section-title discovery-refonte-nav-title">
        <div>
          <h2>Parcours découverte</h2>
          <p className="section-subtitle">
            Un chemin de collecte clair pour avancer naturellement pendant le rendez-vous.
          </p>
        </div>
      </div>

      <div className="discovery-refonte-steps-v2">
        {items.map((item) => {
          const isActive = item.key === active

          return (
            <button
              key={item.key}
              type="button"
              onClick={() => onChange(item.key)}
              className={`discovery-refonte-step-v2${isActive ? ' active' : ''}`}
            >
              <div className="discovery-refonte-step-v2-top">
                <span className="discovery-refonte-step-v2-number">{item.step}</span>
                <span className="discovery-refonte-step-v2-helper">{item.helper}</span>
              </div>

              <div className="discovery-refonte-step-v2-body">
                <span className="discovery-refonte-step-v2-title">{item.label}</span>
              </div>
            </button>
          )
        })}
      </div>
    </section>
  )
}

export default SectionNav
