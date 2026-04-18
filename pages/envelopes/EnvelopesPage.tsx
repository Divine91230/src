import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHero } from '../../components/ui/PageHero'
import { Badge } from '../../components/ui/Badge'
import { useCabinetStore } from '../../store/useCabinetStore'
import {
  getEmergencyFundMonths,
  getResolvedRiskProfile,
  getResolvedTmi,
  getSelectedSavingsCapacity,
} from '../discovery/discovery.helpers'
import {
  resolveAllocationToEnvelopes,
  type AllocationLine,
} from '../../lib/allocationMapping'
import './EnvelopesPage.css'

// ─── Types ────────────────────────────────────────────────────────────────────
type ScenarioKey = 'secure' | 'balanced' | 'growth'

type StoredScenarioState = {
  recommendedKey: ScenarioKey
  selectedKey: ScenarioKey
  clientFollowsRecommendation: boolean
  adjustedInitialByKey: Record<ScenarioKey, number>
  adjustedMonthlyByKey: Record<ScenarioKey, number>
  allocationsByKey?: Record<ScenarioKey, AllocationLine[]>
}

type DecisionType = 'À ouvrir' | 'À renforcer' | 'À conserver' | 'À réorganiser'

type ExistingEnvelopeRow = {
  id: string
  label: string
  normalizedLabel: string
  amount: number
  family: 'financial' | 'direct_real_estate' | 'liquidity'
  envelopeType: string
  plafond?: number
  capaciteRestante?: number
}

type RecommendedEnvelopeRow = {
  id: string
  label: string
  initialAmount: number
  monthlyAmount: number
  primaryLabel: string
  secondaryLabel: string
  initialMix: string
  monthlyMix: string
  decision: DecisionType
  rationale: string
  vigilance?: string
  isMobilisationExistant: boolean
  existingAmount?: number
}

// ─── Formatters ───────────────────────────────────────────────────────────────
function formatCurrency(value: number) {
  if (!Number.isFinite(value) || value === 0) return '\u2014'
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value)
}

function normalizeText(value: unknown) {
  return String(value ?? '').trim().toLowerCase()
}

function getMainObjective(discovery: any) {
  return (
    discovery?.investmentProject?.projectGoal ||
    discovery?.objectives?.mainObjective ||
    'Objectif à préciser'
  )
}

// ─── Catégorisation fiable (#4) ───────────────────────────────────────────────
function categorizeAsset(asset: any): ExistingEnvelopeRow['family'] {
  const category = normalizeText(asset?.category)
  const envelopeType = normalizeText(asset?.envelopeType)
  if (category === 'immobilier') return 'direct_real_estate'
  if (category === 'liquidités') return 'liquidity'
  if (['livret a','ldds','lep','pel','compte courant','compte à terme'].includes(envelopeType)) return 'liquidity'
  return 'financial'
}

function normalizeEnvelopeLabel(asset: any): string {
  const et = normalizeText(asset?.envelopeType)
  if (et === 'assurance-vie') return 'assurance-vie'
  if (et === 'per') return 'per'
  if (et === 'pea') return 'pea'
  if (et === 'cto') return 'compte-titres ordinaire'
  if (et === 'scpi') return 'scpi'
  if (et === 'épargne salariale') return 'épargne salariale'
  if (asset?.category === 'Immobilier') return 'immobilier direct'
  if (et === 'livret a') return 'Livret A'
  if (et === 'ldds') return 'LDDS'
  if (et === 'lep') return 'LEP'
  if (et === 'pel') return 'PEL'
  if (et === 'compte courant') return 'Compte courant'
  if (et === 'compte à terme') return 'Compte à terme'
  return String(asset?.label || asset?.envelopeType || 'Actif').trim()
}

// Plafonds légaux 2026 (#6)
const ENVELOPE_PLAFONDS: Record<string, number> = {
  'pea': 150000,
  'livret a': 22950,
  'ldds': 12000,
  'lep': 10000,
  'pel': 61200,
}

// ─── Logique décision améliorée (#1) ─────────────────────────────────────────
function inferDecision(
  recommendedLabel: string,
  existingRows: ExistingEnvelopeRow[],
): { decision: DecisionType; existingAmount?: number; vigilance?: string } {
  const norm = normalizeText(recommendedLabel)

  const match = existingRows.find((row) => {
    const r = row.normalizedLabel
    if (norm === 'assurance-vie' && r === 'assurance-vie') return true
    if (norm === 'per' && r === 'per') return true
    if ((norm.includes('pea') || norm.includes('cto')) && (r === 'pea' || r === 'compte-titres ordinaire')) return true
    if (norm === 'scpi' && r === 'scpi') return true
    return false
  })

  if (!match || match.amount <= 0) return { decision: 'À ouvrir' }

  const plafond = ENVELOPE_PLAFONDS[match.normalizedLabel]
  let vigilance: string | undefined

  if (plafond) {
    const capacite = plafond - match.amount
    if (capacite <= 0) {
      vigilance = `\u26a0\ufe0f Plafond ${match.normalizedLabel.toUpperCase()} atteint (${formatCurrency(plafond)}) \u2014 envisager un CTO en compl\u00e9ment.`
      return { decision: 'À réorganiser', existingAmount: match.amount, vigilance }
    }
    if (capacite < 10000) {
      vigilance = `Capacité restante limitée : ${formatCurrency(capacite)} avant plafond.`
    }
  }

  return { decision: 'À renforcer', existingAmount: match.amount, vigilance }
}

// ─── Détection mobilisation (#3) ─────────────────────────────────────────────
function detectMobilisation(recommendedLabel: string, investmentProject: any): boolean {
  if (!Array.isArray(investmentProject?.existingEnvelopeUsages)) return false
  const norm = normalizeText(recommendedLabel)
  return investmentProject.existingEnvelopeUsages.some((usage: any) => {
    if (!usage.selected || Number(usage.amountUsed || 0) <= 0) return false
    const u = normalizeText(usage.envelopeName || '')
    return (u.includes('assurance') && norm.includes('assurance')) ||
           (u.includes('per') && norm === 'per') ||
           (u.includes('pea') && norm.includes('pea'))
  })
}

// ─── Rationale ────────────────────────────────────────────────────────────────
function buildRationale(params: {
  label: string; risk: string; objective: string
  tmi: string; reserve: number; decision: DecisionType; isMobilisation: boolean
}) {
  const label = normalizeText(params.label)
  const tmiValue = Number(String(params.tmi).replace('%', '').replace(',', '.')) || 0
  const objective = normalizeText(params.objective)
  const risk = normalizeText(params.risk)

  if (label.includes('per')) {
    return tmiValue >= 30 || objective.includes('retraite')
      ? 'Enveloppe long terme pertinente pour structurer l\u2019objectif retraite et capter un levier fiscal \u00e0 l\u2019entr\u00e9e (TMI \u2265 30\u00a0%).'
      : 'Enveloppe long terme \u00e0 utiliser avec discernement selon l\u2019horizon r\u00e9el et la logique fiscale du dossier.'
  }
  if (label.includes('assurance-vie')) {
    if (params.isMobilisation) return 'Mobilisation partielle de l\u2019enveloppe existante pour financer le projet, puis versements programm\u00e9s pour renforcer progressivement.'
    return params.reserve < 4
      ? 'Enveloppe souple \u00e0 utiliser progressivement, sans affaiblir la poche de s\u00e9curit\u00e9 du foyer.'
      : 'Enveloppe centrale de structuration patrimoniale, utile pour loger une allocation lisible et progressive.'
  }
  if (label.includes('pea') || label.includes('compte-titres')) {
    return risk.includes('prudent')
      ? 'Poche de march\u00e9 \u00e0 doser prudemment, avec un cadrage clair de la volatilit\u00e9 acceptable.'
      : 'Poche de march\u00e9 coh\u00e9rente avec une logique de diversification et de rendement potentiel long terme.'
  }
  if (label.includes('scpi')) {
    return 'Brique de diversification patrimoniale, \u00e0 int\u00e9grer seulement si la disponibilit\u00e9 plus contrainte est bien comprise et accept\u00e9e.'
  }
  if (params.decision === '\u00c0 ouvrir') return 'Enveloppe recommand\u00e9e par le cabinet \u2014 non identifi\u00e9e dans l\u2019existant du client.'
  return 'Enveloppe existante \u00e0 conserver ou renforcer dans la strat\u00e9gie retenue.'
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export function EnvelopesPage() {
  const navigate = useNavigate()
  const selectedClient = useCabinetStore((s) => s.selectedClient)
  const discoveryByClientId = useCabinetStore((s) => s.discoveryByClientId)
  const discovery = selectedClient ? discoveryByClientId[selectedClient.id] : null

  const pageData = useMemo(() => {
    if (!selectedClient || !discovery) return null

    const reserve = getEmergencyFundMonths(discovery)
    const risk = getResolvedRiskProfile(discovery)
    const tmi = getResolvedTmi(discovery)
    const savings = getSelectedSavingsCapacity(discovery)
    const objective = getMainObjective(discovery)
    const investmentProject = discovery?.investmentProject ?? {}

    let recommendedScenarioLabel = 'À confirmer'
    let selectedScenarioLabel = 'À confirmer'
    let selectedScenarioKey: ScenarioKey | null = null
    let allocations: AllocationLine[] = []

    try {
      const raw = localStorage.getItem(`dcp-scenarios-v4-${selectedClient.id}`)
      if (raw) {
        const parsed = JSON.parse(raw) as StoredScenarioState
        selectedScenarioKey = parsed?.selectedKey ?? null
        const labelMap: Record<ScenarioKey, string> = {
          secure: 'Sécurisation',
          balanced: 'Équilibre patrimonial',
          growth: 'Retraite & Optimisation',
        }
        recommendedScenarioLabel = labelMap[parsed?.recommendedKey] ?? 'À confirmer'
        selectedScenarioLabel = labelMap[parsed?.selectedKey] ?? 'À confirmer'
        if (selectedScenarioKey) allocations = parsed.allocationsByKey?.[selectedScenarioKey] ?? []
      }
    } catch { allocations = [] }

    const recommendedResolved = resolveAllocationToEnvelopes(allocations, { riskProfile: risk, objective })

    const assets = Array.isArray(discovery.assets) ? discovery.assets : []
    const allRows: ExistingEnvelopeRow[] = assets
      .filter((a: any) => Number(a.amount || 0) > 0)
      .map((asset: any) => {
        const normalizedLabel = normalizeEnvelopeLabel(asset)
        const family = categorizeAsset(asset)
        const plafond = ENVELOPE_PLAFONDS[normalizeText(asset?.envelopeType)]
        return {
          id: asset.id || String(Math.random()),
          label: asset.label || normalizedLabel,
          normalizedLabel,
          amount: Number(asset.amount || 0),
          family,
          envelopeType: asset.envelopeType || '',
          plafond,
          capaciteRestante: plafond ? Math.max(0, plafond - Number(asset.amount || 0)) : undefined,
        }
      })

    const existingFinancial = allRows.filter((r) => r.family === 'financial')
    const existingLiquidity = allRows.filter((r) => r.family === 'liquidity')
    const existingDirect = allRows.filter((r) => r.family === 'direct_real_estate')

    const recommendedRows: RecommendedEnvelopeRow[] = recommendedResolved.map((item) => {
      const { decision, existingAmount, vigilance } = inferDecision(item.displayLabel, allRows)
      const isMobilisation = detectMobilisation(item.displayLabel, investmentProject)
      return {
        id: item.envelope,
        label: item.displayLabel,
        initialAmount: item.euroAmount,
        monthlyAmount: item.monthlyEuroAmount,
        primaryLabel: item.supportLabelPrimary,
        secondaryLabel: item.supportLabelSecondary,
        initialMix: `${item.initialSecurePercent}% / ${item.initialUcPercent}%`,
        monthlyMix: `${item.monthlySecurePercent}% / ${item.monthlyUcPercent}%`,
        decision, vigilance, isMobilisationExistant: isMobilisation, existingAmount,
        rationale: buildRationale({ label: item.displayLabel, risk, objective, tmi, reserve, decision, isMobilisation }),
      }
    })

    // Totaux (#2)
    const totalInitial = recommendedRows.reduce((s, r) => s + r.initialAmount, 0)
    const totalMonthly = recommendedRows.reduce((s, r) => s + r.monthlyAmount, 0)
    const totalMobilise = recommendedRows.filter((r) => r.isMobilisationExistant).reduce((s, r) => s + r.initialAmount, 0)
    const totalApportFrais = totalInitial - totalMobilise

    const implementation = [
      'Utiliser cette page comme lecture de pr\u00e9conisation d\u2019enveloppes, distincte de l\u2019inventaire de l\u2019existant.',
      'Ouvrir en priorit\u00e9 les enveloppes absentes jug\u00e9es utiles par le cabinet dans la strat\u00e9gie retenue.',
      'Renforcer ou r\u00e9organiser les enveloppes d\u00e9j\u00e0 d\u00e9tenues seulement lorsqu\u2019elles ont un r\u00f4le clair.',
      reserve < 6
        ? 'Conserver une poche de s\u00e9curit\u00e9 visible avant d\u2019intensifier la mise en place.'
        : 'Maintenir les liquidit\u00e9s existantes intactes \u2014 elles constituent la r\u00e9serve de s\u00e9curit\u00e9 du foyer.',
    ]

    return {
      risk, tmi, reserve, savings, objective,
      recommendedScenarioLabel, selectedScenarioLabel,
      recommendedRows, existingFinancial, existingLiquidity, existingDirect,
      implementation, totalInitial, totalMonthly, totalMobilise, totalApportFrais,
    }
  }, [selectedClient, discovery])

  if (!selectedClient) {
    return (<><PageHero title="Enveloppes" description="Aucun client sélectionné." /><section className="card"><p>Ouvre d'abord un dossier client.</p></section></>)
  }
  if (!pageData) {
    return (<><PageHero title="Enveloppes" description="Préconisation des enveloppes patrimoniales." /><section className="card"><h2 style={{ fontFamily: 'var(--font-display)', fontSize: 20, marginBottom: 8 }}>Données insuffisantes</h2><p>Complète la découverte et les scénarios.</p></section></>)
  }

  const DECISION_VARIANT: Record<DecisionType, any> = {
    'À ouvrir': 'gold',
    'À renforcer': 'client',
    'À conserver': 'default',
    'À réorganiser': 'prospect',
  }

  return (
    <>
      <PageHero title="Enveloppes" description="Préconisation des enveloppes patrimoniales utiles à la stratégie retenue, confrontées à l'existant du client." />

      {/* En-tête */}
      <section className="card envelopes-v2-hero" style={{ marginBottom: 'var(--space-5)' }}>
        <div>
          <div className="hero-kicker">Architecture recommandée</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 'var(--space-2)' }}>{selectedClient.fullName}</h2>
          <p style={{ color: 'var(--text-2)', fontSize: 13.5 }}>Enveloppes recommandées par le cabinet, confrontées à l'existant du client.</p>
        </div>
        <div className="envelopes-v2-badges">
          <Badge variant="default">{pageData.risk}</Badge>
          <Badge variant="default">{pageData.objective}</Badge>
          <Badge variant="gold">{pageData.selectedScenarioLabel}</Badge>
        </div>
      </section>

      {/* KPIs */}
      <div className="envelopes-v2-kpis" style={{ marginBottom: 'var(--space-5)' }}>
        {[
          { label: 'Scénario recommandé', value: pageData.recommendedScenarioLabel, small: true },
          { label: 'Scénario retenu', value: pageData.selectedScenarioLabel, small: true },
          { label: 'TMI', value: pageData.tmi },
          { label: 'Réserve', value: `${pageData.reserve.toFixed(1)} mois` },
        ].map((k) => (
          <article key={k.label} className="envelopes-v2-kpi card">
            <strong>{k.label}</strong>
            <span style={k.small ? { fontSize: 15, fontWeight: 700 } : {}}>{k.value}</span>
          </article>
        ))}
      </div>

      {/* Synthèse déploiement (#2 + #3) */}
      <section className="card" style={{ marginBottom: 'var(--space-5)', background: 'linear-gradient(135deg, var(--gold-50), #fff)', border: '1px solid var(--gold-200)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-4)' }}>
          <div>
            <div className="hero-kicker">Synthèse du déploiement</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 600 }}>{formatCurrency(pageData.totalInitial)} déployés au total</div>
            <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>+ {formatCurrency(pageData.totalMonthly)} / mois en versements programmés</div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
            {pageData.totalMobilise > 0 && (
              <div style={{ background: 'var(--gold-100)', border: '1px solid var(--gold-200)', borderRadius: 'var(--r-lg)', padding: 'var(--space-3) var(--space-4)', textAlign: 'center' }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gold-600)', marginBottom: 4 }}>Mobilisation existant</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600 }}>{formatCurrency(pageData.totalMobilise)}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Rachat enveloppe(s)</div>
              </div>
            )}
            {pageData.totalApportFrais > 0 && (
              <div style={{ background: 'var(--sage-100)', border: '1px solid rgba(107,143,113,0.22)', borderRadius: 'var(--r-lg)', padding: 'var(--space-3) var(--space-4)', textAlign: 'center' }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--sage-500)', marginBottom: 4 }}>Apport frais</div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600 }}>{formatCurrency(pageData.totalApportFrais)}</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>Nouveaux versements</div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Enveloppes recommandées */}
      <section className="card envelopes-v2-section" style={{ marginBottom: 'var(--space-5)' }}>
        <div className="section-head">
          <div>
            <div className="section-title">Enveloppes recommandées</div>
            <div className="section-subtitle">{pageData.recommendedRows.length} enveloppe(s) — {pageData.selectedScenarioLabel}</div>
          </div>
        </div>

        {pageData.recommendedRows.length ? (
          <div className="envelopes-v2-grid">
            {pageData.recommendedRows.map((row) => (
              <article key={row.id} className="envelopes-v2-card">
                <div className="envelopes-v2-card-head">
                  <div>
                    {row.isMobilisationExistant && (
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gold-600)', marginBottom: 4 }}>
                        ↩ Mobilisation enveloppe existante
                      </div>
                    )}
                    <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 600, margin: 0 }}>{row.label}</h3>
                    {row.existingAmount !== undefined && (
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3 }}>Existant : {formatCurrency(row.existingAmount)}</div>
                    )}
                  </div>
                  <Badge variant={DECISION_VARIANT[row.decision]}>{row.decision}</Badge>
                </div>

                <p className="envelopes-v2-rationale" style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.65, marginBottom: 'var(--space-4)' }}>{row.rationale}</p>

                {row.vigilance && (
                  <div style={{ background: 'var(--amber-100)', border: '1px solid rgba(176,120,48,0.20)', borderRadius: 'var(--r-md)', padding: 'var(--space-2) var(--space-3)', fontSize: 12.5, color: 'var(--amber-500)', marginBottom: 'var(--space-4)', lineHeight: 1.55 }}>
                    {row.vigilance}
                  </div>
                )}

                <div className="metric-strip" style={{ marginBottom: 'var(--space-4)' }}>
                  <div className="metric-strip-item">
                    <div className="metric-strip-label">Initial</div>
                    <div className="metric-strip-value">{formatCurrency(row.initialAmount)}</div>
                  </div>
                  <div className="metric-strip-item">
                    <div className="metric-strip-label">Mensuel</div>
                    <div className="metric-strip-value">{formatCurrency(row.monthlyAmount)}</div>
                  </div>
                </div>

                <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
                  {[
                    { label: 'Lecture', value: row.primaryLabel },
                    { label: 'Complément', value: row.secondaryLabel },
                    { label: 'Mix initial', value: row.initialMix },
                    { label: 'Mix mensuel', value: row.monthlyMix },
                  ].map((item) => (
                    <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-3)', fontSize: 12.5 }}>
                      <span style={{ color: 'var(--muted)' }}>{item.label}</span>
                      <span style={{ background: 'var(--cream-200)', borderRadius: 999, padding: '2px 10px', fontWeight: 600, fontSize: 12 }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p style={{ color: 'var(--muted)' }}>Aucune enveloppe recommandée. Vérifie la page Scénarios.</p>
        )}
      </section>

      {/* Existant + Liquidités + Immobilier */}
      <div className="envelopes-v2-two-columns" style={{ marginBottom: 'var(--space-5)' }}>
        <article className="card envelopes-v2-section">
          <div className="section-head" style={{ marginBottom: 'var(--space-4)' }}>
            <div className="section-title">Enveloppes détenues</div>
            <Badge variant="default">{pageData.existingFinancial.length} ligne(s)</Badge>
          </div>
          {pageData.existingFinancial.length ? (
            <div className="envelopes-v2-existing-list">
              {pageData.existingFinancial.map((row) => (
                <div key={row.id} className="envelopes-v2-existing-item">
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13.5, marginBottom: 2 }}>{row.label}</div>
                    {row.capaciteRestante !== undefined && row.capaciteRestante > 0 && (
                      <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>Capacité restante : {formatCurrency(row.capaciteRestante)}</div>
                    )}
                    {row.capaciteRestante === 0 && (
                      <div style={{ fontSize: 11.5, color: 'var(--amber-500)', fontWeight: 600 }}>Plafond atteint</div>
                    )}
                  </div>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600 }}>{formatCurrency(row.amount)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--muted)', fontSize: 13.5 }}>Aucune enveloppe financière identifiée.</p>
          )}
        </article>

        <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
          {/* Liquidités (#5) */}
          {pageData.existingLiquidity.length > 0 && (
            <article className="card envelopes-v2-section">
              <div className="section-head" style={{ marginBottom: 'var(--space-3)' }}>
                <div className="section-title">Liquidités</div>
                <Badge variant="default">À conserver</Badge>
              </div>
              <div style={{ background: 'var(--sage-100)', border: '1px solid rgba(107,143,113,0.22)', borderRadius: 'var(--r-md)', padding: 'var(--space-3) var(--space-4)', fontSize: 12.5, color: 'var(--sage-500)', marginBottom: 'var(--space-3)', lineHeight: 1.55 }}>
                ✓ Réserve de sécurité du foyer ({pageData.reserve.toFixed(1)} mois). À ne pas mobiliser dans le cadre du projet.
              </div>
              <div className="envelopes-v2-existing-list">
                {pageData.existingLiquidity.map((row) => (
                  <div key={row.id} className="envelopes-v2-existing-item">
                    <span style={{ fontWeight: 500, fontSize: 13.5 }}>{row.label}</span>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600 }}>{formatCurrency(row.amount)}</span>
                  </div>
                ))}
              </div>
            </article>
          )}

          {/* Actifs en direct */}
          <article className="card envelopes-v2-section">
            <div className="section-head" style={{ marginBottom: 'var(--space-4)' }}>
              <div className="section-title">Actifs en direct</div>
              <Badge variant="default">{pageData.existingDirect.length} ligne(s)</Badge>
            </div>
            {pageData.existingDirect.length ? (
              <div className="envelopes-v2-existing-list">
                {pageData.existingDirect.map((row) => (
                  <div key={row.id} className="envelopes-v2-existing-item">
                    <span style={{ fontWeight: 500, fontSize: 13.5 }}>{row.label}</span>
                    <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600 }}>{formatCurrency(row.amount)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: 'var(--muted)', fontSize: 13.5 }}>Aucun actif immobilier direct identifié.</p>
            )}
          </article>
        </div>
      </div>

      {/* Logique de mise en place (#8) */}
      <section className="card envelopes-v2-section" style={{ marginBottom: 'var(--space-5)' }}>
        <div className="section-title" style={{ marginBottom: 'var(--space-4)' }}>Logique de mise en place</div>
        <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
          {pageData.implementation.map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start' }}>
              <div style={{ width: 24, height: 24, borderRadius: '50%', flexShrink: 0, background: 'var(--gold-100)', border: '1px solid var(--gold-200)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: 'var(--gold-600)' }}>{i + 1}</div>
              <span style={{ fontSize: 13.5, color: 'var(--ink-700)', lineHeight: 1.65, paddingTop: 2 }}>{item}</span>
            </div>
          ))}
        </div>
      </section>

      {/* CTA vers Stratégie (#7) */}
      <section className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--ink-900)', marginBottom: 3 }}>Voir le détail de la mise en place</div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>La page Stratégie détaille l'ordre des actions et les étapes de déploiement.</div>
        </div>
        <button className="btn btn-gold" onClick={() => navigate('/strategy')}>
          Stratégie d'investissement →
        </button>
      </section>
    </>
  )
}

export default EnvelopesPage
