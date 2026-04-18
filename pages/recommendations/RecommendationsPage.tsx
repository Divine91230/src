import { PageHero } from '../../components/ui/PageHero'
import { MetricCard } from '../../components/ui/MetricCard'
import { Badge } from '../../components/ui/Badge'
import { useDiscoveryBridge } from '../../hooks/useDiscoveryBridge'
import './RecommendationsPage.css'

function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value) || value === 0) return '—'
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatMonths(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value) || value <= 0) return '—'
  return `${value.toFixed(1)} mois`
}

const URGENCY_CONFIG = {
  ELEVEE: { label: 'Prioritaire', variant: 'danger' as const, dot: 'var(--rose-500)' },
  MOYENNE: { label: 'Important', variant: 'prospect' as const, dot: 'var(--amber-500)' },
  FAIBLE: { label: 'À étudier', variant: 'default' as const, dot: 'var(--sage-500)' },
}

const AXIS_LABELS: Record<string, string> = {
  LIQUIDITE: 'Liquidité & sécurité',
  DIVERSIFICATION: 'Diversification',
  FISCALITE: 'Optimisation fiscale',
  PROTECTION: 'Protection du foyer',
  RETRAITE: 'Préparation retraite',
  TRANSMISSION: 'Transmission',
}

export function RecommendationsPage() {
  const {
    hasClient,
    hasData,
    selectedClient,
    snapshot,
    kpis,
    recommendations,
  } = useDiscoveryBridge()

  // ── Pas de client ─────────────────────────────────────────────────────────
  if (!hasClient) {
    return (
      <>
        <PageHero title="Préconisations" description="Aucun client sélectionné." />
        <section className="card">
          <p>Ouvrez un dossier pour afficher les préconisations.</p>
        </section>
      </>
    )
  }

  // ── Données insuffisantes ─────────────────────────────────────────────────
  if (!hasData || !snapshot || !kpis) {
    return (
      <>
        <PageHero
          title="Préconisations"
          description="Axes de conseil structurés issus de l'analyse du dossier."
        />
        <section className="card">
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, marginBottom: 8 }}>
            Données insuffisantes
          </h2>
          <p>Complétez d'abord la découverte patrimoniale pour faire ressortir les axes de conseil.</p>
        </section>
      </>
    )
  }

  // ── Résumé stratégique ────────────────────────────────────────────────────
  const strategySummary =
    (kpis.emergencyFundMonths ?? 0) >= 6 && snapshot.budget.monthlySavingsCapacity > 0
      ? 'Le dossier permet d\u2019avancer vers une stratégie progressive, avec une base budgétaire déjà exploitable et un cadre de mise en place lisible.'
      : (kpis.emergencyFundMonths ?? 0) >= 3
      ? 'La stratégie doit rester mesurée : le dossier peut avancer, mais en préservant la liquidité et le rythme d\u2019effort du foyer.'
      : 'La recommandation doit d\u2019abord sécuriser le socle du foyer avant de rechercher une construction plus ambitieuse.'

  const riskLabel =
    snapshot.riskProfile === 'DYNAMIQUE'
      ? 'Dynamique'
      : snapshot.riskProfile === 'PRUDENT'
      ? 'Prudent'
      : 'Équilibré'

  const mainGoalLabel =
    snapshot.goals[0] === 'RETRAITE'
      ? 'Retraite'
      : snapshot.goals[0] === 'TRANSMISSION'
      ? 'Transmission'
      : snapshot.goals[0] === 'PROTECTION'
      ? 'Protection'
      : 'Diversification'

  // ── Tri recommandations : ELEVEE en premier ───────────────────────────────
  const sorted = [...recommendations].sort((a, b) => {
    const order = { ELEVEE: 0, MOYENNE: 1, FAIBLE: 2 }
    return (order[a.urgency] ?? 2) - (order[b.urgency] ?? 2)
  })

  return (
    <>
      <PageHero
        title="Préconisations"
        description="Axes de conseil structurés, hiérarchisés et argumentés issus de l'analyse patrimoniale du dossier."
      />

      {/* ── En-tête dossier ───────────────────────────────────────────────── */}
      <section className="card" style={{ marginBottom: 'var(--space-5)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-6)', flexWrap: 'wrap' }}>
          <div>
            <div className="hero-kicker">Orientation recommandée</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 'var(--space-2)' }}>
              {selectedClient?.fullName}
            </h2>
            <p style={{ color: 'var(--text-2)', maxWidth: 560, lineHeight: 1.7 }}>
              {strategySummary}
            </p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', alignItems: 'flex-start' }}>
            <Badge variant={selectedClient?.status === 'Client' ? 'client' : 'prospect'}>
              {selectedClient?.status}
            </Badge>
            <Badge variant="default">{riskLabel}</Badge>
            <Badge variant="gold">{mainGoalLabel}</Badge>
          </div>
        </div>
      </section>

      {/* ── KPIs ─────────────────────────────────────────────────────────── */}
      <div className="grid-auto grid-4" style={{ marginBottom: 'var(--space-5)' }}>
        <MetricCard
          label="Patrimoine net"
          value={formatCurrency(kpis.netWorth)}
          help="Base patrimoniale retenue"
        />
        <MetricCard
          label="Capacité retenue"
          value={formatCurrency(kpis.monthlySavings)}
          help="Effort mensuel mobilisable"
        />
        <MetricCard
          label="Réserve"
          value={formatMonths(kpis.emergencyFundMonths)}
          help="Liquidité de sécurité disponible"
        />
        <MetricCard
          label="TMI"
          value={`${Math.round(snapshot.marginalTaxRate * 100)} %`}
          help="Lecture fiscale retenue"
          gold
        />
      </div>

      {/* ── Recommandations ───────────────────────────────────────────────── */}
      {sorted.length === 0 ? (
        <section className="card">
          <div className="empty-state">
            <div className="empty-state-icon">✓</div>
            <div className="empty-state-title">Aucune préconisation prioritaire</div>
            <p>Le dossier ne fait pas ressortir d'axe prioritaire à ce stade. Complétez la découverte pour affiner l'analyse.</p>
          </div>
        </section>
      ) : (
        <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
          {sorted.map((reco) => {
            const urgency = URGENCY_CONFIG[reco.urgency] ?? URGENCY_CONFIG.FAIBLE
            const axisLabel = AXIS_LABELS[reco.axis] ?? reco.axis

            return (
              <article key={reco.title} className="card">
                {/* En-tête recommandation */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-4)', gap: 'var(--space-4)' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                      <span style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: urgency.dot,
                        display: 'inline-block',
                        flexShrink: 0,
                      }} />
                      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)' }}>
                        {axisLabel}
                      </span>
                    </div>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--ink-900)' }}>
                      {reco.title}
                    </h3>
                  </div>
                  <Badge variant={urgency.variant}>{urgency.label}</Badge>
                </div>

                {/* Résumé */}
                <p style={{ fontSize: 14, color: 'var(--text-2)', lineHeight: 1.7, marginBottom: 'var(--space-5)', borderBottom: '1px solid var(--line-2)', paddingBottom: 'var(--space-4)' }}>
                  {reco.summary}
                </p>

                {/* Argumentaire */}
                {reco.rationale && reco.rationale.length > 0 && (
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gold-600)', marginBottom: 'var(--space-3)' }}>
                      Argumentaire
                    </div>
                    <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
                      {reco.rationale.map((point, i) => (
                        <div key={i} style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start' }}>
                          <span style={{ color: 'var(--gold-400)', fontWeight: 700, flexShrink: 0, marginTop: 1 }}>→</span>
                          <span style={{ fontSize: 13.5, color: 'var(--ink-700)', lineHeight: 1.6 }}>{point}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}
    </>
  )
}

export default RecommendationsPage
