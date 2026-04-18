import { useMemo, useState } from 'react'
import { PageHero } from '../../components/ui/PageHero'
import { MetricCard } from '../../components/ui/MetricCard'
import { Badge } from '../../components/ui/Badge'
import { comparePerExitScenarios } from '../../modules/simulators/per/perExitSimulator'
import './PERSimulatorPage.css'

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

function taxModeLabel(mode: 'DEDUCTED' | 'NON_DEDUCTED') {
  return mode === 'DEDUCTED' ? 'Versements déduits' : 'Versements non déduits'
}

function scenarioReading(key: 'capital' | 'annuity' | 'mixed') {
  if (key === 'capital') return 'Plus adapté à un besoin immédiat de liquidité et de flexibilité.'
  if (key === 'annuity') return 'Plus adapté à une logique de revenus réguliers dans la durée.'
  return 'Compromis entre disponibilité immédiate et recherche de revenus.'
}

function simulatorDecisionLabel(net: number, gross: number, taxMode: 'DEDUCTED' | 'NON_DEDUCTED') {
  if (taxMode === 'DEDUCTED' && net / Math.max(gross, 1) < 0.75) return 'À arbitrer'
  if (taxMode === 'DEDUCTED') return 'Pertinent'
  return 'À contextualiser'
}

type AmountBoxProps = {
  label: string
  value: string
}

function AmountBox({ label, value }: AmountBoxProps) {
  return (
    <div className="per-amount-box">
      <div className="per-amount-label">{label}</div>
      <div className="per-amount-value">{value}</div>
    </div>
  )
}

export function PERSimulatorPage() {
  const [capital, setCapital] = useState(120000)
  const [contributions, setContributions] = useState(90000)
  const [gains, setGains] = useState(30000)
  const [marginalTaxRate, setMarginalTaxRate] = useState(0.3)
  const [taxMode, setTaxMode] = useState<'DEDUCTED' | 'NON_DEDUCTED'>('DEDUCTED')

  const result = useMemo(
    () =>
      comparePerExitScenarios({
        capital,
        contributions,
        gains,
        marginalTaxRate,
        taxMode,
      }),
    [capital, contributions, gains, marginalTaxRate, taxMode],
  )

  const bestNet = Math.max(result.capital.netAmount, result.annuity.netAmount, result.mixed.netAmount)

  const scenarios = [
    { key: 'capital' as const, label: 'Sortie en capital', data: result.capital },
    { key: 'annuity' as const, label: 'Sortie en rente', data: result.annuity },
    { key: 'mixed' as const, label: 'Sortie mixte', data: result.mixed },
  ]

  const estimatedNetEffort = taxMode === 'DEDUCTED' ? contributions * (1 - marginalTaxRate) : contributions
  const mainReading =
    taxMode === 'DEDUCTED'
      ? 'Le PER peut être pertinent si l’intérêt fiscal s’inscrit dans une vraie logique retraite et non comme simple optimisation isolée.'
      : 'Sans déduction à l’entrée, la lecture du PER doit surtout reposer sur l’horizon long terme et la cohérence patrimoniale.'

  return (
    <>
      <PageHero
        title="Simulateur PER"
        description="Comparer les modes de sortie du PER et replacer le gain fiscal, la liquidité et l’horizon retraite dans une vraie lecture de conseil."
      />

      <section className="card per-simulator-summary">
        <div className="per-simulator-summary-main">
          <div>
            <div className="brand-kicker">Lecture cabinet</div>
            <h2>Pertinence du PER</h2>
            <p>{mainReading}</p>
          </div>
          <div className="per-simulator-summary-badges">
            <Badge>{taxModeLabel(taxMode)}</Badge>
            <Badge>TMI {formatPercent(marginalTaxRate)}</Badge>
          </div>
        </div>

        <div className="kpi-row">
          <span className="pill">Capital étudié : {formatCurrency(capital)}</span>
          <span className="pill">Effort versé : {formatCurrency(contributions)}</span>
          <span className="pill">Effort net estimatif : {formatCurrency(estimatedNetEffort)}</span>
        </div>
      </section>

      <section className="card simulator-card">
        <div className="section-title">
          <h2>Hypothèses</h2>
          <Badge>{taxModeLabel(taxMode)}</Badge>
        </div>

        <div className="simulator-form-grid">
          <label className="simulator-field">
            <span>Capital total</span>
            <input type="number" value={capital} onChange={(e) => setCapital(Number(e.target.value) || 0)} />
          </label>
          <label className="simulator-field">
            <span>Versements cumulés</span>
            <input type="number" value={contributions} onChange={(e) => setContributions(Number(e.target.value) || 0)} />
          </label>
          <label className="simulator-field">
            <span>Gains estimés</span>
            <input type="number" value={gains} onChange={(e) => setGains(Number(e.target.value) || 0)} />
          </label>
          <label className="simulator-field">
            <span>TMI retenue</span>
            <input type="number" step="0.01" value={marginalTaxRate} onChange={(e) => setMarginalTaxRate(Number(e.target.value) || 0)} />
          </label>
          <label className="simulator-field simulator-field-wide">
            <span>Mode fiscal des versements</span>
            <select value={taxMode} onChange={(e) => setTaxMode(e.target.value as 'DEDUCTED' | 'NON_DEDUCTED')}>
              <option value="DEDUCTED">Versements déduits</option>
              <option value="NON_DEDUCTED">Versements non déduits</option>
            </select>
          </label>
        </div>
      </section>

      <section className="metrics-grid simulator-metrics-grid">
        <MetricCard label="Capital étudié" value={formatCurrency(capital)} help="Base simulée" />
        <MetricCard label="Versements" value={formatCurrency(contributions)} help="Effort cumulé" />
        <MetricCard label="Gains" value={formatCurrency(gains)} help="Performance estimée" />
        <MetricCard label="TMI" value={formatPercent(marginalTaxRate)} help="Hypothèse fiscale" />
      </section>

      <section className="card simulator-card simulator-compact-note">
        <div className="section-title">
          <h2>Lecture rapide</h2>
        </div>
        <div className="kpi-row">
          <span className="pill">Le PER se juge sur l’horizon retraite, pas seulement sur le gain fiscal.</span>
          <span className="pill">La sortie la plus favorable fiscalement n’est pas toujours la plus pertinente patrimonialement.</span>
        </div>
      </section>

      <section className="cards-grid simulator-result-grid">
        {scenarios.map((scenario) => (
          <article key={scenario.key} className="card simulator-card simulator-result-card">
            <div className="section-title">
              <h2>{scenario.label}</h2>
              <Badge>{scenario.data.netAmount === bestNet ? 'Net le plus élevé' : simulatorDecisionLabel(scenario.data.netAmount, scenario.data.grossAmount, taxMode)}</Badge>
            </div>

            <div className="per-amount-grid">
              <AmountBox label="Brut estimé" value={formatCurrency(scenario.data.grossAmount)} />
              <AmountBox label="Fiscalité estimée" value={formatCurrency(scenario.data.totalTax)} />
              <AmountBox label="Net estimé" value={formatCurrency(scenario.data.netAmount)} />
            </div>

            <div className="simulator-breakdown compact">
              <div className="simulator-breakdown-row">
                <span>Impôt estimé</span>
                <strong>{formatCurrency(scenario.data.incomeTax)}</strong>
              </div>
              <div className="simulator-breakdown-row">
                <span>Prélèvements sociaux</span>
                <strong>{formatCurrency(scenario.data.socialContributions)}</strong>
              </div>
            </div>

            <div className="per-reading-box">
              <div className="per-reading-label">Lecture cabinet</div>
              <p className="simulator-short-reading">{scenarioReading(scenario.key)}</p>
            </div>
          </article>
        ))}
      </section>
    </>
  )
}

export default PERSimulatorPage
