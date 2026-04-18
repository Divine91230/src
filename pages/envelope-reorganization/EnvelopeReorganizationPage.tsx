import { useMemo } from 'react'
import { PageHero } from '../../components/ui/PageHero'
import { MetricCard } from '../../components/ui/MetricCard'
import { Badge } from '../../components/ui/Badge'
import { useCabinetStore } from '../../store/useCabinetStore'
import {
  getEmergencyFundMonths,
  getResolvedRiskProfile,
  getResolvedTmi,
  getSelectedSavingsCapacity,
  getTotalAssets,
  getTotalLiabilitiesCapital,
} from '../discovery/discovery.helpers'
import './EnvelopeReorganizationPage.css'

type ScenarioKey = 'secure' | 'balanced' | 'growth'

type StoredScenarioState = {
  recommendedKey: ScenarioKey
  selectedKey: ScenarioKey
  clientFollowsRecommendation: boolean
  adjustedInitialByKey: Record<ScenarioKey, number>
  adjustedMonthlyByKey: Record<ScenarioKey, number>
}

type ReorgAction = {
  id: string
  source: string
  action: string
  amount: number
  target: string
  rationale: string
  priority: 'Immédiat' | 'Progressif' | 'À arbitrer'
}

const scenarioLabels: Record<ScenarioKey, string> = {
  secure: 'Sécurisation',
  balanced: 'Équilibre patrimonial',
  growth: 'Retraite & Optimisation',
}

function normalize(value: unknown) {
  return String(value ?? '').trim().toLowerCase()
}

function formatCurrency(value: number) {
  if (!Number.isFinite(value) || value === 0) return '—'
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatMonths(value: number) {
  if (!Number.isFinite(value) || value <= 0) return '—'
  return `${value.toFixed(1)} mois`
}

function assetAmountByMatcher(assets: any[], matchers: string[]) {
  return assets
    .filter((asset: any) => {
      const text = `${asset?.label || ''} ${asset?.assetType || ''} ${asset?.category || ''} ${asset?.envelopeType || ''}`.toLowerCase()
      return matchers.some((matcher) => text.includes(matcher))
    })
    .reduce((sum: number, asset: any) => sum + Number(asset.amount || 0), 0)
}

function buildReorganizationData(discovery: any, clientId: string) {
  const assets = Array.isArray(discovery?.assets) ? discovery.assets : []
  const totalAssets = getTotalAssets(assets)
  const totalLiabilities = getTotalLiabilitiesCapital(discovery)
  const netWorth = totalAssets - totalLiabilities
  const reserve = getEmergencyFundMonths(discovery)
  const risk = getResolvedRiskProfile(discovery)
  const tmi = getResolvedTmi(discovery)
  const savings = getSelectedSavingsCapacity(discovery)

  const objective =
    discovery?.objectives?.mainObjective ||
    discovery?.investmentProject?.goal ||
    discovery?.investmentProject?.objective ||
    'Objectif à préciser'

  const liquidities = assetAmountByMatcher(assets, [
    'livret',
    'épargne de sécurité',
    'epargne de securite',
    'trésorerie',
    'tresorerie',
    'compte courant',
    'liquid',
    'cash',
  ])

  const assuranceVie = assetAmountByMatcher(assets, ['assurance-vie', 'av'])
  const peaCto = assetAmountByMatcher(assets, ['pea', 'cto'])
  const per = assetAmountByMatcher(assets, [' per', 'per '])
  const realEstateDirect = assets
    .filter((asset: any) => {
      const text = `${asset?.label || ''} ${asset?.assetType || ''} ${asset?.category || ''}`.toLowerCase()
      return (
        text.includes('immobilier') ||
        text.includes('bien locatif') ||
        text.includes('résidence principale') ||
        text.includes('residence principale') ||
        text === 'rp'
      )
    })
    .reduce((sum: number, asset: any) => sum + Number(asset.amount || 0), 0)

  const rawScenario = localStorage.getItem(`dcp-scenarios-v4-${clientId}`)
  let scenarioState: StoredScenarioState | null = null
  try {
    scenarioState = rawScenario ? (JSON.parse(rawScenario) as StoredScenarioState) : null
  } catch {
    scenarioState = null
  }

  const selectedScenario = scenarioState?.selectedKey ? scenarioLabels[scenarioState.selectedKey] : 'Non défini'
  const recommendedScenario = scenarioState?.recommendedKey ? scenarioLabels[scenarioState.recommendedKey] : 'Non défini'
  const initialAmount = scenarioState?.selectedKey ? Number(scenarioState.adjustedInitialByKey?.[scenarioState.selectedKey] || 0) : 0
  const monthlyAmount = scenarioState?.selectedKey ? Number(scenarioState.adjustedMonthlyByKey?.[scenarioState.selectedKey] || 0) : 0

  const actions: ReorgAction[] = []

  if (liquidities > 0) {
    const secureBase = reserve < 6
      ? Math.min(liquidities, Math.max(liquidities * 0.5, monthlyAmount * 6 || liquidities * 0.4))
      : Math.min(liquidities, liquidities * 0.35)

    const redirectable = Math.max(liquidities - secureBase, 0)

    actions.push({
      id: 'keep-security',
      source: 'Liquidités disponibles',
      action: 'Conserver en sécurité',
      amount: secureBase,
      target: 'Poche de disponibilité',
      rationale: 'Préserver un socle de liquidité cohérent avec les besoins du foyer.',
      priority: 'Immédiat',
    })

    if (redirectable > 0) {
      actions.push({
        id: 'redirect-liquidities',
        source: 'Liquidités disponibles',
        action: 'Réorienter progressivement',
        amount: redirectable,
        target: selectedScenario === 'Retraite & Optimisation' ? 'PER / Assurance-vie' : 'Assurance-vie / enveloppes de capitalisation',
        rationale: 'Éviter de laisser une épargne durablement inerte au-delà du besoin de sécurité.',
        priority: reserve < 4 ? 'À arbitrer' : 'Progressif',
      })
    }
  }

  if (assuranceVie > 0) {
    actions.push({
      id: 'optimize-av',
      source: 'Assurance-vie existante',
      action: 'Renforcer / réallouer',
      amount: assuranceVie,
      target: 'Allocation cible du scénario',
      rationale: 'Utiliser l’enveloppe existante comme socle de structuration plutôt que de multiplier les ouvertures inutiles.',
      priority: 'Progressif',
    })
  }

  if (peaCto > 0) {
    actions.push({
      id: 'review-market',
      source: 'PEA / CTO existants',
      action: 'Arbitrer selon profil',
      amount: peaCto,
      target: 'Poche marché cohérente',
      rationale: 'Vérifier la cohérence entre l’exposition de marché, le profil de risque et l’horizon déclaré.',
      priority: 'À arbitrer',
    })
  }

  if (per > 0 || normalize(objective).includes('retraite')) {
    actions.push({
      id: 'retirement-build',
      source: per > 0 ? 'PER existant' : 'Capacité d’épargne',
      action: per > 0 ? 'Renforcer' : 'Ouvrir en complément',
      amount: per > 0 ? per : monthlyAmount * 12,
      target: 'Poche retraite',
      rationale: 'Donner une vraie place à l’horizon long terme lorsque l’objectif retraite ressort dans le dossier.',
      priority: normalize(objective).includes('retraite') ? 'Immédiat' : 'Progressif',
    })
  }

  const findings = [
    liquidities > 0
      ? 'Une partie des liquidités peut être mieux organisée entre sécurité et capitalisation.'
      : 'Le dossier ne fait pas ressortir de poche de liquidité importante à réorganiser.',
    assuranceVie > 0
      ? 'Les enveloppes déjà ouvertes doivent être relues avant toute multiplication de contrats.'
      : 'La structuration patrimoniale peut nécessiter l’ouverture d’au moins une enveloppe socle.',
    realEstateDirect > 0
      ? 'Le patrimoine immobilier détenu en direct doit être lu à part et ne pas être confondu avec les enveloppes financières.'
      : 'La réorganisation porte principalement sur des poches financières plutôt que sur des actifs immobiliers directs.',
  ]

  const vigilance = [
    reserve < 4 ? 'Ne pas réduire excessivement la réserve de sécurité pendant la réorganisation.' : 'Conserver une poche de sécurité identifiable après arbitrage.',
    'Prendre en compte l’antériorité, les frais et la fiscalité avant toute réorientation importante.',
    normalize(risk).includes('prudent')
      ? 'Maintenir une progressivité forte dans toute poche exposée aux marchés.'
      : 'S’assurer que le niveau d’exposition final reste cohérent avec le profil accepté.',
  ]

  return {
    objective,
    risk,
    tmi,
    reserve,
    savings,
    totalAssets,
    totalLiabilities,
    netWorth,
    liquidities,
    assuranceVie,
    peaCto,
    per,
    realEstateDirect,
    selectedScenario,
    recommendedScenario,
    initialAmount,
    monthlyAmount,
    actions,
    findings,
    vigilance,
  }
}

export function EnvelopeReorganizationPage() {
  const client = useCabinetStore((state) => state.selectedClient)
  const discovery = useCabinetStore((state) => state.getDiscoveryForSelectedClient())

  if (!client) {
    return (
      <>
        <PageHero title="Réorganisation patrimoniale" description="Aucun client sélectionné." />
        <section className="card">
          <h2>Dossier non sélectionné</h2>
          <p>Ouvre d’abord un dossier client pour afficher la réorganisation patrimoniale.</p>
        </section>
      </>
    )
  }

  if (!discovery) {
    return (
      <>
        <PageHero
          title={`Réorganisation patrimoniale — ${client.fullName}`}
          description="Aucune découverte patrimoniale exploitable n’est disponible pour ce dossier."
        />
        <section className="card">
          <h2>Données insuffisantes</h2>
          <p>Complète la découverte, les scénarios et les enveloppes pour construire un plan de réorganisation.</p>
        </section>
      </>
    )
  }

  const displayName =
    `${discovery?.mainPerson?.firstName ?? ''} ${discovery?.mainPerson?.lastName ?? ''}`.trim() || client.fullName

  const data = buildReorganizationData(discovery, client.id)

  return (
    <>
      <PageHero
        title={`Réorganisation patrimoniale — ${displayName}`}
        description="Passage structuré de l’existant vers la cible patrimoniale, avec constats, arbitrages, chiffrage et plan d’action."
      />

      <section className="reorg-summary card">
        <div className="reorg-summary-main">
          <div>
            <div className="brand-kicker">Lecture de départ</div>
            <h2>{displayName}</h2>
            <p>
              Cette page explique ce qui est conservé, ce qui est réorganisé, ce qui est renforcé et comment la transition s’opère concrètement, avec des montants.
            </p>
          </div>

          <div className="reorg-summary-badges">
            <Badge>{data.risk || 'Profil à confirmer'}</Badge>
            <Badge>{data.objective}</Badge>
            <Badge>{data.selectedScenario}</Badge>
          </div>
        </div>

        <div className="kpi-row">
          <span className="pill">Scénario cabinet : {data.recommendedScenario}</span>
          <span className="pill">Scénario retenu : {data.selectedScenario}</span>
          <span className="pill">Initial : {formatCurrency(data.initialAmount)}</span>
          <span className="pill">Mensuel : {formatCurrency(data.monthlyAmount)}</span>
        </div>
      </section>

      <section className="metrics-grid reorg-metrics">
        <MetricCard label="Patrimoine net" value={formatCurrency(data.netWorth)} help="Après prise en compte du passif" />
        <MetricCard label="Liquidités" value={formatCurrency(data.liquidities)} help="Base de réorganisation immédiate" />
        <MetricCard label="Réserve" value={formatMonths(data.reserve)} help="Socle de sécurité du foyer" />
        <MetricCard label="Capacité retenue" value={formatCurrency(data.savings)} help="Effort mensuel mobilisable" />
      </section>

      <section className="reorg-two-columns">
        <article className="card">
          <div className="section-title">
            <h2>Constats de réorganisation</h2>
          </div>
          <ul className="reorg-list">
            {data.findings.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>

        <article className="card">
          <div className="section-title">
            <h2>Lecture de l’existant</h2>
          </div>
          <ul className="list">
            <li className="list-item"><span>Liquidités disponibles</span><span className="pill">{formatCurrency(data.liquidities)}</span></li>
            <li className="list-item"><span>Assurance-vie existante</span><span className="pill">{formatCurrency(data.assuranceVie)}</span></li>
            <li className="list-item"><span>PEA / CTO existants</span><span className="pill">{formatCurrency(data.peaCto)}</span></li>
            <li className="list-item"><span>PER existant</span><span className="pill">{formatCurrency(data.per)}</span></li>
            <li className="list-item"><span>Immobilier détenu en direct</span><span className="pill">{formatCurrency(data.realEstateDirect)}</span></li>
            <li className="list-item"><span>TMI retenue</span><span className="pill">{String(data.tmi || '—')}</span></li>
          </ul>
        </article>
      </section>

      <section className="card reorg-actions-card">
        <div className="section-title">
          <h2>Réorganisation proposée</h2>
          <Badge>{data.actions.length}</Badge>
        </div>

        <div className="reorg-actions-grid">
          {data.actions.map((action) => (
            <article key={action.id} className="reorg-action-item">
              <div className="reorg-action-head">
                <h3>{action.action}</h3>
                <Badge>{action.priority}</Badge>
              </div>

              <div className="metric-strip">
                <div className="metric-strip-item">
                  <div className="metric-strip-label">Source</div>
                  <div className="metric-strip-value">{action.source}</div>
                </div>
                <div className="metric-strip-item">
                  <div className="metric-strip-label">Montant</div>
                  <div className="metric-strip-value">{formatCurrency(action.amount)}</div>
                </div>
                <div className="metric-strip-item">
                  <div className="metric-strip-label">Cible</div>
                  <div className="metric-strip-value">{action.target}</div>
                </div>
              </div>

              <p>{action.rationale}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="table-card reorg-table-card">
        <table>
          <thead>
            <tr>
              <th>Source</th>
              <th>Action</th>
              <th>Montant</th>
              <th>Cible</th>
              <th>Priorité</th>
            </tr>
          </thead>
          <tbody>
            {data.actions.map((action) => (
              <tr key={`${action.id}-row`}>
                <td>{action.source}</td>
                <td>{action.action}</td>
                <td>{formatCurrency(action.amount)}</td>
                <td>{action.target}</td>
                <td>{action.priority}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="reorg-two-columns reorg-bottom-grid">
        <article className="card">
          <div className="section-title">
            <h2>Cible après réorganisation</h2>
          </div>

          <ul className="reorg-list">
            <li>Conserver une poche de sécurité clairement identifiable.</li>
            <li>Réorienter l’épargne excédentaire vers les enveloppes cohérentes avec le scénario retenu.</li>
            <li>Renforcer les enveloppes déjà pertinentes avant de multiplier les ouvertures inutiles.</li>
            <li>Maintenir une lecture simple entre sécurité, capitalisation, marché et horizon long terme.</li>
          </ul>
        </article>

        <article className="card">
          <div className="section-title">
            <h2>Vigilance</h2>
          </div>

          <ul className="reorg-list reorg-vigilance-list">
            {data.vigilance.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </section>
    </>
  )
}

export default EnvelopeReorganizationPage
