import { useMemo, useState } from 'react'
import { PageHero } from '../../components/ui/PageHero'
import { MetricCard } from '../../components/ui/MetricCard'
import { Badge } from '../../components/ui/Badge'
import { buildFundingSourceComparison } from '../../modules/liquidity/buildFundingSourceComparison'
import { useCabinetStore } from '../../store/useCabinetStore'
import type { AssetLine, DiscoveryFormState } from '../discovery/discovery.types'
import { getEmergencyFundMonths } from '../discovery/discovery.helpers'
import type { FundingSourceInput, FundingSourceType } from '../../modules/liquidity/liquidity.types'
import './FundingSourceComparisonPage.css'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value)
}

function normalizeText(value: unknown) {
  return String(value ?? '').trim().toLowerCase()
}

function inferFundingSourceType(asset: AssetLine): FundingSourceType | null {
  const envelope = asset.envelopeType
  const label = normalizeText(asset.label)
  const comment = normalizeText(asset.comment)

  if (envelope === 'Assurance-vie') return 'ASSURANCE_VIE'
  if (envelope === 'PEA') return 'PEA'
  if (envelope === 'CTO') return 'CTO'
  if (envelope === 'PER') return 'PER'
  if (envelope === 'SCPI') return 'SCPI'
  if (label.includes('capitalisation') || comment.includes('capitalisation')) return 'CAPITALISATION'

  if (
    envelope === 'Compte courant' ||
    envelope === 'Livret A' ||
    envelope === 'LDDS' ||
    envelope === 'LEP' ||
    envelope === 'PEL' ||
    envelope === 'Compte à terme'
  ) {
    return 'CASH'
  }

  return null
}

function estimateAvailableAmount(asset: AssetLine, type: FundingSourceType) {
  const amount = Math.max(0, Number(asset.amount || 0))
  switch (type) {
    case 'CASH':
      return amount
    case 'ASSURANCE_VIE':
    case 'CAPITALISATION':
      return amount * 0.5
    case 'PEA':
      return amount * 0.8
    case 'CTO':
      return amount
    case 'PER':
      return amount * 0.4
    case 'SCPI':
      return amount * 0.5
    default:
      return amount
  }
}

function estimateContributions(asset: AssetLine, type: FundingSourceType) {
  const amount = Math.max(0, Number(asset.amount || 0))
  if (type === 'CASH') return amount
  return amount * 0.85
}

function buildFundingSourcesFromDiscovery(discovery: DiscoveryFormState | null): FundingSourceInput[] {
  if (!discovery) return []

  const reserveMonths = getEmergencyFundMonths(discovery)
  const mainObjective = discovery.objectives?.mainObjective ?? ''
  const isCouple = Boolean(discovery.tax?.commonTaxHousehold)

  return (discovery.assets ?? [])
    .filter((asset) => Number(asset.amount || 0) > 0)
    .map((asset) => {
      const type = inferFundingSourceType(asset)
      if (!type) return null

      const label = asset.label?.trim() || asset.envelopeType || 'Enveloppe existante'
      const strategicRole =
        type === 'ASSURANCE_VIE' ||
        type === 'PEA' ||
        (type === 'PER' && mainObjective === 'Préparer la retraite') ||
        (type === 'CASH' && reserveMonths < 6)
          ? 'Source stratégique'
          : 'Source complémentaire'

      return {
        id: asset.id || `${type}-${label}`,
        label,
        type,
        contractValue: Number(asset.amount || 0),
        availableAmount: estimateAvailableAmount(asset, type),
        totalContributions: estimateContributions(asset, type),
        holdingYears:
          type === 'PEA' ? 6 : type === 'ASSURANCE_VIE' || type === 'CAPITALISATION' ? 8 : undefined,
        isCouple,
        strategicRole,
      } satisfies FundingSourceInput
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
}

type AmountBoxProps = {
  label: string
  value: string
}

function AmountBox({ label, value }: AmountBoxProps) {
  return (
    <div className="funding-amount-box">
      <div className="funding-amount-label">{label}</div>
      <div className="funding-amount-value">{value}</div>
    </div>
  )
}

export function FundingSourceComparisonPage() {
  const [requestedAmount, setRequestedAmount] = useState(20000)
  const selectedClient = useCabinetStore((state) => state.selectedClient)
  const discoveryByClientId = useCabinetStore((state) => state.discoveryByClientId)

  const discovery = selectedClient
    ? ((discoveryByClientId[selectedClient.id] as DiscoveryFormState | null) ?? null)
    : null

  const fundingSources = useMemo(() => buildFundingSourcesFromDiscovery(discovery), [discovery])
  const reviews = useMemo(() => buildFundingSourceComparison(fundingSources, requestedAmount), [fundingSources, requestedAmount])

  return (
    <>
      <PageHero
        title="Mobilisation de l’épargne existante"
        description="Comparer les enveloppes réellement présentes dans le dossier selon leur liquidité, leur coût fiscal estimé et leur impact patrimonial."
      />

      <section className="card funding-summary">
        <div className="funding-summary-main">
          <div>
            <div className="brand-kicker">Lecture cabinet</div>
            <h2>Ordre de mobilisation</h2>
            <p>
              Ce simulateur ne se limite pas au montant disponible : il aide à déterminer quelle poche mobiliser en priorité, laquelle préserver et laquelle éviter selon l’impact patrimonial global.
            </p>
          </div>
          <div className="funding-summary-badges">
            <Badge>{selectedClient ? selectedClient.fullName : 'Aucun dossier'}</Badge>
            <Badge>{discovery ? 'Dossier alimenté' : 'Dossier incomplet'}</Badge>
          </div>
        </div>

        <div className="kpi-row">
          <span className="pill">Montant étudié : {formatCurrency(requestedAmount)}</span>
          <span className="pill">Poches détectées : {String(fundingSources.length)}</span>
        </div>
      </section>

      <section className="card simulator-card">
        <div className="section-title">
          <h2>Hypothèse</h2>
          <Badge>{selectedClient ? selectedClient.fullName : 'Aucun dossier'}</Badge>
        </div>

        <div className="simulator-form-grid">
          <label className="simulator-field simulator-field-wide">
            <span>Montant à mobiliser</span>
            <input type="number" value={requestedAmount} onChange={(e) => setRequestedAmount(Number(e.target.value) || 0)} />
          </label>
        </div>
      </section>

      {!selectedClient ? (
        <section className="card simulator-card">
          <h2>Aucun client sélectionné</h2>
          <p>Sélectionne un client pour lancer le comparatif.</p>
        </section>
      ) : null}

      {selectedClient && !discovery ? (
        <section className="card simulator-card">
          <h2>Dossier découverte introuvable</h2>
          <p>Complète d’abord la découverte patrimoniale du client.</p>
        </section>
      ) : null}

      {selectedClient && discovery && fundingSources.length === 0 ? (
        <section className="card simulator-card">
          <h2>Aucune enveloppe mobilisable détectée</h2>
          <p>Le dossier ne contient pas encore d’enveloppe exploitable pour ce comparatif.</p>
        </section>
      ) : null}

      {reviews.length > 0 ? (
        <section className="metrics-grid simulator-metrics-grid">
          <MetricCard label="Montant étudié" value={formatCurrency(requestedAmount)} help="Besoin simulé" />
          <MetricCard label="Enveloppes analysées" value={String(reviews.length)} help="Poches détectées" />
          <MetricCard label="Meilleure lecture nette" value={formatCurrency(reviews[0]?.estimatedNet ?? 0)} help={reviews[0]?.label ?? '—'} />
          <MetricCard label="Lecture prioritaire" value={reviews[0]?.recommendation ?? '—'} help="À confronter au dossier" />
        </section>
      ) : null}

      {reviews.length > 0 ? (
        <section className="card simulator-card simulator-compact-note">
          <div className="section-title">
            <h2>Lecture rapide</h2>
          </div>
          <div className="kpi-row">
            <span className="pill">La poche la plus liquide n’est pas toujours la plus pertinente stratégiquement.</span>
            <span className="pill">Il faut lire ensemble fiscalité, disponibilité et impact patrimonial.</span>
          </div>
        </section>
      ) : null}

      <section className="cards-grid simulator-result-grid">
        {reviews.map((review, index) => (
          <article key={review.id} className="card simulator-card simulator-result-card funding-result-card">
            <div className="section-title">
              <h2>{review.label}</h2>
              <Badge>{index === 0 ? 'À privilégier' : review.taxVigilance === 'Faible' ? 'Alternative simple' : 'À surveiller'}</Badge>
            </div>

            <div className="funding-amount-grid">
              <AmountBox label="Mobilisable" value={formatCurrency(review.availableAmount)} />
              <AmountBox label="Fiscalité estimée" value={formatCurrency(review.estimatedTax)} />
              <AmountBox label="Net estimé" value={formatCurrency(review.estimatedNet)} />
            </div>

            <div className="simulator-badges">
              <Badge>{`Fiscalité ${review.taxVigilance.toLowerCase()}`}</Badge>
              <Badge>{`Impact ${review.patrimonialVigilance.toLowerCase()}`}</Badge>
            </div>

            <div className="funding-reading-box">
              <div className="funding-reading-label">Lecture cabinet</div>
              <p className="simulator-short-reading">{review.recommendation}</p>
            </div>
          </article>
        ))}
      </section>
    </>
  )
}

export default FundingSourceComparisonPage
