import { useState, useMemo } from 'react'
import type { ReactNode } from 'react'
import { PageHero } from '../../components/ui/PageHero'
import { Badge } from '../../components/ui/Badge'
import { useDiscoveryBridge } from '../../hooks/useDiscoveryBridge'
import { getResolvedRiskProfile, getResolvedTmi, getSelectedSavingsCapacity } from '../discovery/discovery.helpers'
import { getRecommendedScenarioKey, getScenarioNarrativeLabel, scoreScenarios } from '../../lib/recommendationScoring'
import './ScenariosPage.css'

// ─── Types ────────────────────────────────────────────────────────────────────
type ScenarioKey = 'secure' | 'balanced' | 'growth'
type ScenarioTab = 'comparison' | 'choice' | 'allocation'

type AllocationLine = {
  id: string
  envelope: string
  initialPercent: number
  euroAmount: number
  monthlyPercent: number
  monthlyEuroAmount: number
  securePercent: number
  ucPercent: number
}

type ProjectionPoint = { year: number; value: number }

// ─── Constantes visuelles ─────────────────────────────────────────────────────
const GOLD = '#c8a66a'
const SCENARIO_COLORS: Record<ScenarioKey, string> = {
  secure: '#c8a66a',
  balanced: '#8f6f43',
  growth: '#6f8f72',
}
const ALLOCATION_COLORS = ['#c8a66a', '#8f6f43', '#d8c39a', '#6f7d6d', '#9b7b5a', '#7c6a58']

// ─── Helpers ──────────────────────────────────────────────────────────────────
function clamp(value: number, min = 0, max = 100) {
  return Math.min(max, Math.max(min, Number.isFinite(value) ? value : 0))
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
}

function readBool(source: any, ...keys: string[]) {
  for (const key of keys) {
    if (source && typeof source[key] === 'boolean') return source[key]
  }
  return false
}

function normalizePercents(lines: AllocationLine[], key: 'initialPercent' | 'monthlyPercent') {
  const total = lines.reduce((sum, l) => sum + Number(l[key] || 0), 0)
  if (lines.length === 0) return lines
  if (total <= 0) {
    const equal = Math.round(100 / lines.length)
    return lines.map((l, i) => ({ ...l, [key]: i === lines.length - 1 ? 100 - equal * (lines.length - 1) : equal }))
  }
  const norm = lines.map((l) => ({ ...l, [key]: Math.round((Number(l[key] || 0) / total) * 100) }))
  const diff = 100 - norm.reduce((s, l) => s + Number(l[key] || 0), 0)
  if (norm[0]) norm[0] = { ...norm[0], [key]: Number(norm[0][key] || 0) + diff }
  return norm
}

function buildDefaultAllocation(key: ScenarioKey, initial: number, monthly: number): AllocationLine[] {
  const defs =
    key === 'secure'
      ? [
          { id: 'assurance-vie', envelope: 'Assurance-vie', initialPercent: 40, monthlyPercent: 35, securePercent: 80, ucPercent: 20 },
          { id: 'liquidites', envelope: 'Liquidités / réserve', initialPercent: 25, monthlyPercent: 20, securePercent: 100, ucPercent: 0 },
          { id: 'scpi', envelope: 'SCPI / immobilier papier', initialPercent: 20, monthlyPercent: 20, securePercent: 60, ucPercent: 40 },
          { id: 'pea-cto', envelope: 'PEA / CTO', initialPercent: 15, monthlyPercent: 25, securePercent: 10, ucPercent: 90 },
        ]
      : key === 'balanced'
      ? [
          { id: 'assurance-vie', envelope: 'Assurance-vie', initialPercent: 35, monthlyPercent: 35, securePercent: 65, ucPercent: 35 },
          { id: 'per', envelope: 'PER', initialPercent: 20, monthlyPercent: 20, securePercent: 40, ucPercent: 60 },
          { id: 'scpi', envelope: 'SCPI / immobilier papier', initialPercent: 20, monthlyPercent: 15, securePercent: 40, ucPercent: 60 },
          { id: 'pea-cto', envelope: 'PEA / CTO', initialPercent: 25, monthlyPercent: 30, securePercent: 10, ucPercent: 90 },
        ]
      : [
          { id: 'assurance-vie', envelope: 'Assurance-vie', initialPercent: 25, monthlyPercent: 25, securePercent: 45, ucPercent: 55 },
          { id: 'per', envelope: 'PER', initialPercent: 25, monthlyPercent: 20, securePercent: 25, ucPercent: 75 },
          { id: 'pea-cto', envelope: 'PEA / CTO', initialPercent: 35, monthlyPercent: 40, securePercent: 5, ucPercent: 95 },
          { id: 'scpi', envelope: 'SCPI / immobilier papier', initialPercent: 15, monthlyPercent: 15, securePercent: 20, ucPercent: 80 },
        ]

  let lines = defs.map((d) => ({ ...d, euroAmount: 0, monthlyEuroAmount: 0 }))
  lines = normalizePercents(lines, 'initialPercent') as AllocationLine[]
  lines = normalizePercents(lines, 'monthlyPercent') as AllocationLine[]
  return lines.map((l) => ({
    ...l,
    euroAmount: Math.round((initial * l.initialPercent) / 100),
    monthlyEuroAmount: Math.round((monthly * l.monthlyPercent) / 100),
  }))
}

function buildProjection(initial: number, monthly: number, annualRate: number, years: number): ProjectionPoint[] {
  const pts: ProjectionPoint[] = []
  let cur = initial
  for (let y = 0; y <= years; y++) {
    if (y === 0) { pts.push({ year: y, value: Math.round(cur) }); continue }
    cur = (cur + monthly * 12) * (1 + annualRate / 100)
    pts.push({ year: y, value: Math.round(cur) })
  }
  return pts
}

// ─── Sous-composants ──────────────────────────────────────────────────────────
function MetricPanel({ title, value, helper }: { title: string; value: ReactNode; helper?: string }) {
  return (
    <div style={{ background: 'var(--cream-100)', border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', padding: 'var(--space-4) var(--space-5)' }}>
      <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 'var(--space-2)' }}>{title}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600, letterSpacing: '-0.03em', color: 'var(--ink-900)', lineHeight: 1 }}>{value}</div>
      {helper && <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6, lineHeight: 1.5 }}>{helper}</div>}
    </div>
  )
}

function ScenarioCard({
  scenario,
  isRecommended,
  isSelected,
  onSelect,
  initial,
  monthly,
}: {
  scenario: any
  isRecommended: boolean
  isSelected: boolean
  onSelect: () => void
  initial: number
  monthly: number
}) {
  const color = SCENARIO_COLORS[scenario.key as ScenarioKey]
  const projection = buildProjection(initial, monthly, scenario.expectedNetReturn, 10)
  const value10y = projection[projection.length - 1]?.value ?? 0

  return (
    <article
      onClick={onSelect}
      style={{
        background: isSelected ? 'var(--gold-50)' : 'var(--surface)',
        border: `1.5px solid ${isSelected ? GOLD : 'var(--line)'}`,
        borderRadius: 'var(--r-xl)',
        padding: 'var(--space-6)',
        cursor: 'pointer',
        transition: 'all var(--t-base) var(--ease-out)',
        boxShadow: isSelected ? 'var(--shadow-gold)' : 'var(--shadow-sm)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-4)' }}>
        <div>
          {isRecommended && (
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', textTransform: 'uppercase', color: GOLD, marginBottom: 6 }}>
              ★ Recommandé
            </div>
          )}
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', color: 'var(--ink-900)' }}>
            {scenario.title}
          </h3>
        </div>
        <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 11, fontWeight: 700, background: `${color}22`, color, border: `1px solid ${color}44` }}>
          {scenario.code}
        </span>
      </div>

      <p style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.65, marginBottom: 'var(--space-5)' }}>
        {scenario.description}
      </p>

      {/* Métriques */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
        <MetricPanel
          title="Rendement net estimé"
          value={`${scenario.expectedNetReturn} %`}
          helper="Hypothèse annuelle nette"
        />
        <MetricPanel
          title="Effort mensuel"
          value={formatCurrency(monthly)}
          helper="Base retenue"
        />
        <MetricPanel
          title="Projection 10 ans"
          value={formatCurrency(value10y)}
          helper="Capital estimé"
        />
      </div>

      {/* Barre Sécurisé / UC */}
      <div style={{ marginBottom: 'var(--space-4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--muted)', marginBottom: 6 }}>
          <span>Sécurisé {scenario.secureShare} %</span>
          <span>UC {scenario.dynamicShare} %</span>
        </div>
        <div style={{ height: 6, borderRadius: 999, background: 'var(--cream-200)', overflow: 'hidden' }}>
          <div style={{ height: '100%', width: `${scenario.secureShare}%`, background: `linear-gradient(90deg, ${color}, ${color}88)`, borderRadius: 999 }} />
        </div>
      </div>

      {/* Adéquation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>{scenario.profileFit}</span>
        <Badge variant={scenario.suitability === 'ADAPTEE' ? 'client' : scenario.suitability === 'ADAPTEE_SOUS_RESERVE' ? 'prospect' : 'default'}>
          {scenario.suitability === 'ADAPTEE' ? 'Adapté' : scenario.suitability === 'ADAPTEE_SOUS_RESERVE' ? 'Sous réserve' : 'À discuter'}
        </Badge>
      </div>
    </article>
  )
}

// ─── Page principale ──────────────────────────────────────────────────────────
export function ScenariosPage() {
  const { hasClient, hasData, selectedClient, discovery, snapshot, kpis, scenarios } = useDiscoveryBridge()
  const [activeTab, setActiveTab] = useState<ScenarioTab>('comparison')
  const [selectedKey, setSelectedKey] = useState<ScenarioKey>('balanced')

  // ── Garde-fous ────────────────────────────────────────────────────────────
  if (!hasClient) {
    return (
      <>
        <PageHero title="Scénarios" description="Aucun client sélectionné." />
        <section className="card"><p>Ouvrez un dossier client pour générer des scénarios.</p></section>
      </>
    )
  }

  if (!hasData || !snapshot || !kpis || !discovery) {
    return (
      <>
        <PageHero title={`Scénarios — ${selectedClient?.fullName}`} description="Découverte patrimoniale insuffisante pour générer des scénarios." />
        <section className="card">
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, marginBottom: 8 }}>Données insuffisantes</h2>
          <p>Complétez d'abord la découverte patrimoniale pour générer des scénarios cohérents.</p>
        </section>
      </>
    )
  }

  // ── Données brutes depuis discovery (logique existante préservée) ──────────
  const riskProfile = getResolvedRiskProfile(discovery)
  const rawTmi = getResolvedTmi(discovery)
  const tmi = typeof rawTmi === 'number' ? rawTmi
    : typeof rawTmi === 'string' ? Number(rawTmi.replace('%', '').replace(',', '.').trim()) || 0 : 0
  const selectedSavings = Number(getSelectedSavingsCapacity(discovery) || 0)

  const investmentProject = discovery?.investmentProject ?? {}
  const protection = discovery?.protection ?? {}

  const hasDeathCoverage = readBool(protection, 'deathCoverage', 'hasDeathCoverage', 'deathCoverageInPlace')
  const hasDisabilityCoverage = readBool(protection, 'disabilityCoverage', 'hasDisabilityCoverage')
  const spouseProtected = readBool(protection, 'spouseProtected', 'partnerProtected', 'conjointProtege')
  const dependantsProtected = readBool(protection, 'dependantsProtected', 'childrenProtected')

  const synchronizedExistingAmount = Array.isArray(investmentProject.existingEnvelopeUsages)
    ? investmentProject.existingEnvelopeUsages
        .filter((i: any) => i.selected)
        .reduce((s: number, i: any) => s + Number(i.amountUsed || 0), 0)
    : 0

  const baseInitial = (() => {
    const explicit = Number(investmentProject?.initialLumpSumAmount || investmentProject?.initialLumpSum || investmentProject?.initialAmount || 0)
    if (explicit > 0) return explicit
    return Number(synchronizedExistingAmount || 0)
  })()

  const baseMonthly = (() => {
    const explicit = Number(investmentProject?.monthlyContributionAmount || investmentProject?.monthlyContribution || investmentProject?.monthlyAmount || 0)
    if (explicit > 0) return explicit
    return Math.max(0, selectedSavings)
  })()

  const projectObjective = investmentProject?.projectGoal || discovery?.objectives?.mainObjective || 'Non renseigné'
  const horizonYears = Number(investmentProject?.targetAvailabilityHorizon || discovery?.objectives?.horizonYears || 0) || 10

  const objectiveLiquidityNeed = discovery?.objectives?.liquidityNeed
  const liquidityNeed = objectiveLiquidityNeed === 'Très élevé' ? 'high' : objectiveLiquidityNeed === 'Faible' ? 'low' : 'medium'

  // ── Scoring scénarios (logique existante) ─────────────────────────────────
  const scenarioInput = {
    riskProfile,
    tmi,
    emergencyMonths: kpis.emergencyFundMonths ?? 0,
    debtRatio: Math.round((kpis.debtRatio ?? 0) * 100),
    realEstateWeight: snapshot.assets.realEstate > 0
      ? Math.round((snapshot.assets.realEstate / (kpis.grossAssets || 1)) * 100) : 0,
    selectedSavings,
    baseInitialCapital: baseInitial,
    baseMonthlyContribution: baseMonthly,
    objective: projectObjective,
    liquidityNeed,
    flexibilityNeed: liquidityNeed,
    illiquidityTolerance: liquidityNeed === 'high' ? 'low' : liquidityNeed === 'low' ? 'high' : 'medium',
    spouseProtected,
    dependantsProtected,
    hasDeathCoverage,
    hasDisabilityCoverage,
    investmentHorizonYears: horizonYears,
  }

  // Scénarios construits par useDiscoveryBridge depuis buildScenarios()
  // On les enrichit avec le scoring de suitability
  const scoredScenarios = useMemo(() => {
    const keys: ScenarioKey[] = ['secure', 'balanced', 'growth']
    const SCENARIO_DEFAULTS = {
      secure:   { secureShare: 80, dynamicShare: 20, profileFit: 'Convient aux profils prudents et aux horizons courts.' },
      balanced: { secureShare: 55, dynamicShare: 45, profileFit: 'Adapté aux profils équilibrés avec un horizon moyen terme.' },
      growth:   { secureShare: 25, dynamicShare: 75, profileFit: 'Pour les profils dynamiques avec un horizon long terme.' },
    }
    return keys.map((key, i) => {
      const base = scenarios[i] ?? { key, code: key.toUpperCase(), title: key, description: '', expectedNetReturn: 3, suitability: 'ADAPTEE_SOUS_RESERVE', rationale: [] }
      return { ...base, ...SCENARIO_DEFAULTS[key] }
    })
  }, [scenarios])

  const recommendedKey: ScenarioKey = useMemo(() => {
    try { return getRecommendedScenarioKey(scenarioInput) as ScenarioKey }
    catch { return 'balanced' }
  }, [scenarioInput])

  const selectedScenario = scoredScenarios.find((s: any) => s.key === selectedKey) ?? scoredScenarios[1]
  const allocations = useMemo(() => buildDefaultAllocation(selectedKey, baseInitial, baseMonthly), [selectedKey, baseInitial, baseMonthly])
  const projections = useMemo(() =>
    scoredScenarios.map((s: any) => buildProjection(baseInitial, baseMonthly, s.expectedNetReturn, horizonYears)),
    [scoredScenarios, baseInitial, baseMonthly, horizonYears]
  )

  const TABS: { key: ScenarioTab; label: string }[] = [
    { key: 'comparison', label: 'Comparatif' },
    { key: 'choice', label: 'Choix du scénario' },
    { key: 'allocation', label: 'Répartition' },
  ]

  return (
    <>
      <PageHero
        title="Scénarios"
        description="Trois trajectoires patrimoniales construites depuis le dossier du client, avec projection, allocation et adéquation profil."
      />

      {/* ── En-tête client ──────────────────────────────────────────────────── */}
      <section className="card" style={{ marginBottom: 'var(--space-5)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
          <div>
            <div className="hero-kicker">Dossier en cours</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em' }}>
              {selectedClient?.fullName}
            </h2>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', alignItems: 'center' }}>
            <MetricPanel title="Capital initial" value={formatCurrency(baseInitial)} />
            <MetricPanel title="Mensualité" value={formatCurrency(baseMonthly)} />
            <MetricPanel title="Horizon" value={`${horizonYears} ans`} />
          </div>
        </div>
      </section>

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <div className="section-nav" style={{ marginBottom: 'var(--space-5)' }}>
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`section-nav-item${activeTab === tab.key ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab : Comparatif ────────────────────────────────────────────────── */}
      {activeTab === 'comparison' && (
        <div style={{ display: 'grid', gap: 'var(--space-5)' }}>
          {/* Tableau comparatif */}
          <section className="card">
            <div className="section-head">
              <div className="section-title">Comparatif des 3 scénarios</div>
            </div>
            <div className="table-wrap" style={{ boxShadow: 'none', border: 'none' }}>
              <table>
                <thead>
                  <tr>
                    <th>Scénario</th>
                    <th>Rendement estimé</th>
                    <th>Effort mensuel</th>
                    <th>Liquidité</th>
                    <th>Profil cible</th>
                    <th>Adéquation</th>
                  </tr>
                </thead>
                <tbody>
                  {scoredScenarios.map((s: any) => (
                    <tr key={s.key} style={{ background: s.key === recommendedKey ? 'var(--gold-50)' : undefined }}>
                      <td>
                        <div style={{ fontWeight: 600, color: SCENARIO_COLORS[s.key as ScenarioKey] }}>{s.title}</div>
                        {s.key === recommendedKey && <div style={{ fontSize: 11, color: GOLD, fontWeight: 700 }}>★ Recommandé</div>}
                      </td>
                      <td style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600 }}>{s.expectedNetReturn} %</td>
                      <td>{formatCurrency(baseMonthly)}</td>
                      <td>
                        <Badge variant={s.key === 'secure' ? 'client' : s.key === 'balanced' ? 'prospect' : 'default'}>
                          {s.key === 'secure' ? 'Forte' : s.key === 'balanced' ? 'Moyenne' : 'Faible'}
                        </Badge>
                      </td>
                      <td style={{ fontSize: 12.5, color: 'var(--muted)' }}>{s.profileFit}</td>
                      <td>
                        <Badge variant={s.suitability === 'ADAPTEE' ? 'client' : s.suitability === 'ADAPTEE_SOUS_RESERVE' ? 'prospect' : 'default'}>
                          {s.suitability === 'ADAPTEE' ? 'Adapté' : s.suitability === 'ADAPTEE_SOUS_RESERVE' ? 'Sous réserve' : 'À discuter'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Projection simplifiée */}
          <section className="card">
            <div className="section-head">
              <div className="section-title">Projections sur {horizonYears} ans</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)' }}>
              {scoredScenarios.map((s: any, i: number) => {
                const pts = projections[i] ?? []
                const final = pts[pts.length - 1]?.value ?? 0
                const mid = pts[Math.floor(pts.length / 2)]?.value ?? 0
                return (
                  <div key={s.key} className={`card${s.key === recommendedKey ? ' card-gold' : ''}`}>
                    <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: SCENARIO_COLORS[s.key as ScenarioKey], marginBottom: 'var(--space-3)' }}>
                      {s.title}
                    </div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, letterSpacing: '-0.03em', marginBottom: 4 }}>
                      {formatCurrency(final)}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 'var(--space-3)' }}>À {horizonYears} ans</div>
                    <div style={{ fontSize: 12.5, color: 'var(--ink-600)' }}>
                      Mi-parcours ({Math.round(horizonYears / 2)} ans) : {formatCurrency(mid)}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        </div>
      )}

      {/* ── Tab : Choix du scénario ────────────────────────────────────────── */}
      {activeTab === 'choice' && (
        <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
          {scoredScenarios.map((s: any) => (
            <ScenarioCard
              key={s.key}
              scenario={s}
              isRecommended={s.key === recommendedKey}
              isSelected={selectedKey === s.key}
              onSelect={() => { setSelectedKey(s.key); setActiveTab('allocation') }}
              initial={baseInitial}
              monthly={baseMonthly}
            />
          ))}
        </div>
      )}

      {/* ── Tab : Répartition ─────────────────────────────────────────────── */}
      {activeTab === 'allocation' && selectedScenario && (
        <section className="card">
          <div className="section-head">
            <div>
              <div className="section-title">Répartition — {selectedScenario.title}</div>
              <div className="section-subtitle">
                Capital initial : {formatCurrency(baseInitial)} · Mensualité : {formatCurrency(baseMonthly)}
              </div>
            </div>
            <Badge variant={selectedKey === recommendedKey ? 'gold' : 'default'}>
              {selectedKey === recommendedKey ? '★ Recommandé' : 'Scénario sélectionné'}
            </Badge>
          </div>

          <div className="table-wrap" style={{ boxShadow: 'none', border: 'none', marginTop: 'var(--space-4)' }}>
            <table>
              <thead>
                <tr>
                  <th>Enveloppe</th>
                  <th>Initial (%)</th>
                  <th>Initial (€)</th>
                  <th>Mensuel (%)</th>
                  <th>Mensuel (€)</th>
                  <th>Sécurisé / UC</th>
                </tr>
              </thead>
              <tbody>
                {allocations.map((line, i) => (
                  <tr key={line.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: ALLOCATION_COLORS[i % ALLOCATION_COLORS.length], flexShrink: 0 }} />
                        {line.envelope}
                      </div>
                    </td>
                    <td style={{ fontWeight: 600 }}>{line.initialPercent} %</td>
                    <td style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600 }}>{formatCurrency(line.euroAmount)}</td>
                    <td style={{ fontWeight: 600 }}>{line.monthlyPercent} %</td>
                    <td style={{ fontFamily: 'var(--font-display)', fontSize: 15, fontWeight: 600 }}>{formatCurrency(line.monthlyEuroAmount)}</td>
                    <td>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                        {line.securePercent} % / {line.ucPercent} %
                      </div>
                      <div style={{ height: 4, borderRadius: 999, background: 'var(--cream-200)', marginTop: 4, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${line.securePercent}%`, background: GOLD, borderRadius: 999 }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Rationale */}
          {selectedScenario.rationale && selectedScenario.rationale.length > 0 && (
            <div style={{ marginTop: 'var(--space-5)', padding: 'var(--space-4) var(--space-5)', background: 'var(--gold-50)', border: '1px solid var(--gold-200)', borderRadius: 'var(--r-lg)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gold-600)', marginBottom: 'var(--space-3)' }}>
                Points clés de ce scénario
              </div>
              <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
                {selectedScenario.rationale.map((pt: string, i: number) => (
                  <div key={i} style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start' }}>
                    <span style={{ color: GOLD, fontWeight: 700, flexShrink: 0 }}>→</span>
                    <span style={{ fontSize: 13.5, color: 'var(--ink-700)', lineHeight: 1.6 }}>{pt}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}
    </>
  )
}

export default ScenariosPage
