import { PageHero } from '../../components/ui/PageHero'
import { MetricCard } from '../../components/ui/MetricCard'
import { Badge } from '../../components/ui/Badge'
import { useDiscoveryBridge } from '../../hooks/useDiscoveryBridge'
import './AnalysisPage.css'

// ─── Formatters ───────────────────────────────────────────────────────────────
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

function formatPercent(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  return `${Math.round(value * 100)} %`
}

function formatTmi(value: string | number | null | undefined) {
  if (!value) return '—'
  const raw = String(value).trim()
  return raw.includes('%') ? raw : `${raw} %`
}

function formatScore(value: number | null | undefined) {
  if (value === null || value === undefined) return '—'
  return `${value} / 100`
}

// ─── Tone helpers ─────────────────────────────────────────────────────────────
function emergencyTone(months: number | null) {
  if (months === null) return 'neutral'
  if (months >= 6) return 'good'
  if (months >= 3) return 'warning'
  return 'danger'
}

function debtTone(ratio: number | null) {
  if (ratio === null) return 'neutral'
  if (ratio < 0.33) return 'good'
  if (ratio < 0.45) return 'warning'
  return 'danger'
}

function scoreTone(score: number | null) {
  if (score === null) return 'neutral'
  if (score >= 70) return 'good'
  if (score >= 45) return 'warning'
  return 'danger'
}

const TONE_LABELS: Record<string, string> = {
  good: 'Satisfaisant',
  warning: 'Intermédiaire',
  danger: 'Fragile',
  neutral: '—',
}

// ─── Composant ────────────────────────────────────────────────────────────────
export function AnalysisPage() {
  const {
    hasClient,
    hasData,
    selectedClient,
    snapshot,
    kpis,
    scoring,
    priorities,
    qualityIssues,
    analysis,
  } = useDiscoveryBridge()

  // ── Pas de client sélectionné ─────────────────────────────────────────────
  if (!hasClient) {
    return (
      <>
        <PageHero
          title="Analyse patrimoniale"
          description="Aucun client sélectionné."
        />
        <section className="card">
          <p>Ouvrez un dossier client pour afficher l'analyse.</p>
        </section>
      </>
    )
  }

  // ── Données insuffisantes ─────────────────────────────────────────────────
  if (!hasData || !snapshot || !kpis) {
    return (
      <>
        <PageHero
          title="Analyse patrimoniale"
          description="Lecture structurée de la situation du client, des équilibres du foyer et des axes de travail prioritaires."
        />
        <section className="card">
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, marginBottom: 8 }}>
            Données insuffisantes
          </h2>
          <p>Complétez d'abord la découverte patrimoniale pour alimenter l'analyse.</p>
        </section>
      </>
    )
  }

  // ── Alertes qualité bloquantes ────────────────────────────────────────────
  const blockingIssues = qualityIssues.filter((q) => q.severity === 'blocking')
  const warningIssues = qualityIssues.filter((q) => q.severity === 'warning')

  // ── Indicateurs dérivés ───────────────────────────────────────────────────
  const eTone = emergencyTone(kpis.emergencyFundMonths)
  const dTone = debtTone(kpis.debtRatio)
  const sTone = scoreTone(kpis.globalScore)

  // ── Diagnostics depuis scoring ────────────────────────────────────────────
  const scoringItems = scoring?.items ?? []

  return (
    <>
      <PageHero
        title="Analyse patrimoniale"
        description="Lecture structurée de la situation du client, des équilibres du foyer et des axes de travail prioritaires."
      />

      {/* ── En-tête dossier ────────────────────────────────────────────────── */}
      <section className="card" style={{ marginBottom: 'var(--space-5)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-6)', flexWrap: 'wrap' }}>
          <div>
            <div className="hero-kicker">Lecture du dossier</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 'var(--space-2)' }}>
              {selectedClient?.fullName}
            </h2>
            <p style={{ color: 'var(--text-2)', maxWidth: 540 }}>
              Cette page transforme les données collectées en lecture patrimoniale exploitable,
              avec constats, scoring, priorités et points de vigilance.
            </p>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)', alignItems: 'flex-start' }}>
            <Badge variant={selectedClient?.status === 'Client' ? 'client' : 'prospect'}>
              {selectedClient?.status}
            </Badge>
            <Badge variant="default">{snapshot.riskProfile === 'DYNAMIQUE' ? 'Dynamique' : snapshot.riskProfile === 'PRUDENT' ? 'Prudent' : 'Équilibré'}</Badge>
            <Badge variant="gold">{snapshot.goals[0] === 'RETRAITE' ? 'Retraite' : snapshot.goals[0] === 'TRANSMISSION' ? 'Transmission' : snapshot.goals[0] === 'PROTECTION' ? 'Protection' : 'Diversification'}</Badge>
          </div>
        </div>
      </section>

      {/* ── Alertes qualité bloquantes ─────────────────────────────────────── */}
      {blockingIssues.length > 0 && (
        <section style={{ display: 'grid', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
          {blockingIssues.map((issue) => (
            <div key={issue.id} className="dashboard-v3-priority-item danger">
              <div style={{ fontSize: 20 }}>⚠️</div>
              <div>
                <div className="dashboard-v3-priority-title">{issue.title}</div>
                <div className="dashboard-v3-priority-helper">{issue.message}</div>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* ── KPIs principaux ────────────────────────────────────────────────── */}
      <div className="grid-auto grid-4" style={{ marginBottom: 'var(--space-5)' }}>
        <MetricCard
          label="Patrimoine net"
          value={formatCurrency(kpis.netWorth)}
          help="Actif brut moins passif total"
        />
        <MetricCard
          label="Revenus retenus"
          value={formatCurrency(snapshot.budget.monthlyNetIncome)}
          help="Base de lecture budgétaire mensuelle"
        />
        <MetricCard
          label="Capacité retenue"
          value={formatCurrency(kpis.monthlySavings)}
          help="Effort mensuel mobilisable"
        />
        <MetricCard
          label="Score global"
          value={formatScore(kpis.globalScore)}
          help="Évaluation patrimoniale 8 axes"
          gold
        />
      </div>

      {/* ── Indicateurs clés ───────────────────────────────────────────────── */}
      <div className="grid-auto grid-3" style={{ marginBottom: 'var(--space-5)' }}>
        {/* Réserve de sécurité */}
        <div className={`dashboard-v3-priority-item ${eTone}`}>
          <div>
            <div className="dashboard-v3-priority-value">{formatMonths(kpis.emergencyFundMonths)}</div>
            <div className="dashboard-v3-priority-title">Réserve de sécurité</div>
            <div className="dashboard-v3-priority-helper">{TONE_LABELS[eTone]} — seuil recommandé : 6 mois</div>
          </div>
        </div>

        {/* Ratio d'endettement */}
        <div className={`dashboard-v3-priority-item ${dTone}`}>
          <div>
            <div className="dashboard-v3-priority-value">{formatPercent(kpis.debtRatio)}</div>
            <div className="dashboard-v3-priority-title">Charges / Revenus</div>
            <div className="dashboard-v3-priority-helper">{TONE_LABELS[dTone]} — seuil de vigilance : 33 %</div>
          </div>
        </div>

        {/* TMI */}
        <div className="dashboard-v3-priority-item success">
          <div>
            <div className="dashboard-v3-priority-value">{formatTmi(snapshot.marginalTaxRate ? `${Math.round(snapshot.marginalTaxRate * 100)} %` : null)}</div>
            <div className="dashboard-v3-priority-title">TMI retenue</div>
            <div className="dashboard-v3-priority-helper">
              {snapshot.marginalTaxRate >= 0.3 ? 'Levier fiscal mobilisable' : 'Fiscalité modérée'}
            </div>
          </div>
        </div>
      </div>

      {/* ── Scoring 8 axes ─────────────────────────────────────────────────── */}
      {scoringItems.length > 0 && (
        <section className="card" style={{ marginBottom: 'var(--space-5)' }}>
          <div className="section-head">
            <div>
              <div className="section-title">Scoring patrimonial</div>
              <div className="section-subtitle">8 axes d'évaluation — score de 0 à 100</div>
            </div>
            <div className={`field-state-badge ${sTone === 'good' ? 'auto' : sTone === 'warning' ? 'warning' : 'incomplete'}`}>
              Score global : {kpis.globalScore} / 100
            </div>
          </div>

          <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
            {scoringItems.map((item) => (
              <div key={item.code} style={{ display: 'grid', gridTemplateColumns: '180px 1fr 48px', gap: 'var(--space-4)', alignItems: 'center' }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink-700)' }}>{item.label}</div>
                <div>
                  <div style={{ height: 6, borderRadius: 999, background: 'var(--cream-200)', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      borderRadius: 999,
                      width: `${item.value}%`,
                      background: item.tone === 'good'
                        ? 'linear-gradient(90deg, var(--sage-500), #8fb592)'
                        : item.tone === 'warning'
                        ? 'linear-gradient(90deg, var(--amber-500), #c8a66a)'
                        : 'linear-gradient(90deg, var(--rose-500), #c47070)',
                      transition: 'width 0.6s var(--ease-out)',
                    }} />
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 4 }}>{item.summary}</div>
                </div>
                <div style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: 20,
                  fontWeight: 600,
                  textAlign: 'right',
                  color: item.tone === 'good' ? 'var(--sage-500)' : item.tone === 'warning' ? 'var(--amber-500)' : 'var(--rose-500)',
                }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Priorités ─────────────────────────────────────────────────────── */}
      {priorities.length > 0 && (
        <section className="card" style={{ marginBottom: 'var(--space-5)' }}>
          <div className="section-head">
            <div className="section-title">Plan de priorités</div>
          </div>
          <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
            {priorities.slice(0, 5).map((item, i) => (
              <div key={item.step} style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-start' }}>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: i === 0 ? 'linear-gradient(135deg, var(--gold-300), var(--gold-500))' : 'var(--cream-200)',
                  color: i === 0 ? '#1c1a15' : 'var(--ink-500)',
                  fontWeight: 800,
                  fontSize: 13,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}>
                  {i + 1}
                </div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--ink-900)', marginBottom: 3 }}>{item.title}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.55 }}>{item.summary}</div>
                </div>
                <div style={{ marginLeft: 'auto', flexShrink: 0 }}>
                  <span style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 999,
                    background: item.score >= 70 ? 'var(--rose-100)' : item.score >= 45 ? 'var(--amber-100)' : 'var(--sage-100)',
                    color: item.score >= 70 ? 'var(--rose-500)' : item.score >= 45 ? 'var(--amber-500)' : 'var(--sage-500)',
                  }}>
                    {item.score >= 70 ? 'Élevée' : item.score >= 45 ? 'Moyenne' : 'Faible'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Alertes de vigilance ───────────────────────────────────────────── */}
      {warningIssues.length > 0 && (
        <section className="card">
          <div className="section-title" style={{ marginBottom: 'var(--space-4)' }}>Points de vigilance</div>
          <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
            {warningIssues.map((issue) => (
              <div key={issue.id} className="internal-note-box">
                <div className="internal-note-title">{issue.title}</div>
                <div className="internal-note-content">{issue.message}</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </>
  )
}

export default AnalysisPage
