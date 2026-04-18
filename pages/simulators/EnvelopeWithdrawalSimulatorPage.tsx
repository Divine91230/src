import { useMemo, useState } from 'react'
import { PageHero } from '../../components/ui/PageHero'
import { MetricCard } from '../../components/ui/MetricCard'
import { Badge } from '../../components/ui/Badge'
import { simulateLifeInsuranceWithdrawal } from '../../modules/simulators/lifeInsurance/lifeInsuranceExitSimulator'
import { simulateCapitalisationWithdrawal } from '../../modules/simulators/capitalisation/capitalisationExitSimulator'
import './EnvelopeWithdrawalSimulatorPage.css'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatPercent(value: number) {
  return `${Math.round(value * 100)} %`
}

export function EnvelopeWithdrawalSimulatorPage() {
  const [contractValue, setContractValue] = useState(85000)
  const [contributions, setContributions] = useState(70000)
  const [requested, setRequested] = useState(20000)
  const [holdingYears, setHoldingYears] = useState(10)
  const [isCouple, setIsCouple] = useState(true)

  const av = useMemo(
    () =>
      simulateLifeInsuranceWithdrawal({
        contractValue,
        totalContributions: contributions,
        requestedGrossWithdrawal: requested,
        holdingYears,
        isCouple,
      }),
    [contractValue, contributions, requested, holdingYears, isCouple],
  )

  const capi = useMemo(
    () =>
      simulateCapitalisationWithdrawal({
        contractValue,
        totalContributions: contributions,
        requestedGrossWithdrawal: requested,
        holdingYears,
        isCouple,
      }),
    [contractValue, contributions, requested, holdingYears, isCouple],
  )

  const cards = [
    { key: 'av', label: 'Assurance-vie', result: av, reading: 'Utile pour dégager une liquidité sans fermer l’enveloppe et avec une fiscalité souvent lisible.' },
    { key: 'capi', label: 'Capitalisation', result: capi, reading: 'À lire dans une logique patrimoniale globale, notamment si le contrat répond à une fonction de structuration.' },
  ]

  const bestNet = Math.max(av.netWithdrawal, capi.netWithdrawal)

  return (
    <>
      <PageHero
        title="Sorties assurance-vie / capitalisation"
        description="Comparer le capital restitué, les produits fiscalisés et le net perçu estimatif afin d’éclairer un besoin de liquidité."
      />

      <section className="card withdrawal-summary">
        <div className="withdrawal-summary-main">
          <div>
            <div className="brand-kicker">Lecture cabinet</div>
            <h2>Sortie en capital</h2>
            <p>
              La bonne solution dépend moins du support seul que du besoin réel du client : liquidité immédiate, optimisation fiscale ou maintien d’une enveloppe patrimoniale utile.
            </p>
          </div>
          <div className="withdrawal-summary-badges">
            <Badge>{holdingYears >= 8 ? 'Contrat de plus de 8 ans' : 'Contrat de moins de 8 ans'}</Badge>
            <Badge>{isCouple ? 'Couple' : 'Personne seule'}</Badge>
          </div>
        </div>

        <div className="kpi-row">
          <span className="pill">Encours : {formatCurrency(contractValue)}</span>
          <span className="pill">Rachat étudié : {formatCurrency(requested)}</span>
          <span className="pill">Ancienneté : {holdingYears} ans</span>
        </div>
      </section>

      <section className="card simulator-card">
        <div className="section-title">
          <h2>Hypothèses</h2>
          <Badge>{holdingYears >= 8 ? 'Contrat de plus de 8 ans' : 'Contrat de moins de 8 ans'}</Badge>
        </div>

        <div className="simulator-form-grid">
          <label className="simulator-field">
            <span>Encours</span>
            <input type="number" value={contractValue} onChange={(e) => setContractValue(Number(e.target.value) || 0)} />
          </label>
          <label className="simulator-field">
            <span>Versements cumulés</span>
            <input type="number" value={contributions} onChange={(e) => setContributions(Number(e.target.value) || 0)} />
          </label>
          <label className="simulator-field">
            <span>Rachat souhaité</span>
            <input type="number" value={requested} onChange={(e) => setRequested(Number(e.target.value) || 0)} />
          </label>
          <label className="simulator-field">
            <span>Ancienneté</span>
            <input type="number" value={holdingYears} onChange={(e) => setHoldingYears(Number(e.target.value) || 0)} />
          </label>
          <label className="simulator-field simulator-field-wide">
            <span>Situation fiscale</span>
            <select value={String(isCouple)} onChange={(e) => setIsCouple(e.target.value === 'true')}>
              <option value="true">Couple</option>
              <option value="false">Personne seule</option>
            </select>
          </label>
        </div>
      </section>

      <section className="metrics-grid simulator-metrics-grid">
        <MetricCard label="Encours" value={formatCurrency(contractValue)} help="Valeur actuelle" />
        <MetricCard label="Versements" value={formatCurrency(contributions)} help="Capital versé" />
        <MetricCard label="Rachat" value={formatCurrency(requested)} help="Montant étudié" />
        <MetricCard label="Ancienneté" value={`${holdingYears} ans`} help="Impact sur l’abattement" />
      </section>

      <section className="card simulator-card simulator-compact-note">
        <div className="section-title">
          <h2>Lecture rapide</h2>
        </div>
        <div className="kpi-row">
          <span className="pill">Seule la part de produits est fiscalisée.</span>
          <span className="pill">Après 8 ans, l’abattement s’applique sur les produits et non sur le retrait total.</span>
        </div>
      </section>

      <section className="cards-grid simulator-result-grid simulator-two-columns">
        {cards.map((card) => (
          <article key={card.key} className="card simulator-card simulator-result-card">
            <div className="section-title">
              <h2>{card.label}</h2>
              <Badge>{card.result.netWithdrawal === bestNet ? 'Net le plus favorable' : card.result.totalTax <= requested * 0.08 ? 'Impact fiscal faible' : 'Impact fiscal à surveiller'}</Badge>
            </div>

            <div className="metrics-grid simulator-inline-metrics">
              <MetricCard label="Capital restitué" value={formatCurrency(card.result.contributionPortion)} />
              <MetricCard label="Produits imposables" value={formatCurrency(card.result.gainPortion)} />
              <MetricCard label="Net estimé" value={formatCurrency(card.result.netWithdrawal)} />
            </div>

            <div className="simulator-breakdown compact">
              <div className="simulator-breakdown-row">
                <span>Abattement utilisé</span>
                <strong>{formatCurrency(card.result.allowanceUsed)}</strong>
              </div>
              <div className="simulator-breakdown-row">
                <span>Base taxable</span>
                <strong>{formatCurrency(card.result.taxableGainAfterAllowance)}</strong>
              </div>
              <div className="simulator-breakdown-row">
                <span>Taux effectif estimé</span>
                <strong>{formatPercent(card.result.effectiveTaxRate)}</strong>
              </div>
            </div>

            <div className="withdrawal-reading-box">
              <div className="withdrawal-reading-label">Lecture cabinet</div>
              <p className="simulator-short-reading">{card.reading}</p>
            </div>
          </article>
        ))}
      </section>
    </>
  )
}

export default EnvelopeWithdrawalSimulatorPage
