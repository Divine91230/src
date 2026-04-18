import { useEffect, useMemo, useState } from 'react'
import { PageHero } from '../../components/ui/PageHero'
import { MetricCard } from '../../components/ui/MetricCard'
import { Badge } from '../../components/ui/Badge'
import { useCabinetStore } from '../../store/useCabinetStore'
import {
  getResolvedRiskProfile,
  getResolvedTmi,
} from '../discovery/discovery.helpers'
import {
  getEnvelopeRecommendations,
  getRecommendedContracts,
  type ContractEnvelope,
  type ContractRecord,
  type RiskProfile,
  type ScenarioKey,
} from '../../data/contractsCatalog'
import {
  findResolvedEnvelopeAllocation,
  getResolvedSecurePercent,
  getResolvedUcPercent,
  resolveAllocationToEnvelopes,
  type AllocationLine,
} from '../../lib/allocationMapping'
import './ContractsComparisonPage.css'

type StoredScenarioState = {
  recommendedKey: ScenarioKey
  selectedKey: ScenarioKey
  clientFollowsRecommendation: boolean
  adjustedInitialByKey: Record<ScenarioKey, number>
  adjustedMonthlyByKey: Record<ScenarioKey, number>
  allocationsByKey: Record<ScenarioKey, AllocationLine[]>
}

type ContractChoiceState = {
  selectedByEnvelope: Record<string, string>
  noteByEnvelope: Record<string, string>
}

type EnvelopeComparison = {
  envelope: ContractEnvelope
  initialAmount: number
  monthlyAmount: number
  securePercent: number
  ucPercent: number
  recommended: ContractRecord | null
  alternatives: ContractRecord[]
  all: ContractRecord[]
  recommendationLevel: string
}

const scenarioLabels: Record<ScenarioKey, string> = {
  secure: 'Sécurisation',
  balanced: 'Équilibre patrimonial',
  growth: 'Retraite & Optimisation',
}

function formatCurrency(value: number) {
  return `${Math.round(value || 0).toLocaleString('fr-FR')} €`
}


function getRecommendationScore(contract: ContractRecord) {
  const tierScore = contract.tier === 'core' ? 35 : contract.tier === 'advanced' ? 25 : 15
  const liquidityScore = contract.liquidityLevel === 'Élevée' ? 20 : contract.liquidityLevel === 'Intermédiaire' ? 12 : 6
  const complexityScore =
  contract.complexityLevel === 'Standard'
    ? 15
    : contract.complexityLevel === 'Patrimonial'
      ? 10
      : 6
  const entryScore = !contract.entryFeesLabel || contract.entryFeesLabel.includes('0') ? 15 : 8
  const strengthsScore = Math.min((contract.strengths?.length || 0) * 3, 10)
  return Math.round(Math.min(95, tierScore + liquidityScore + complexityScore + entryScore + strengthsScore))
}

function buildChoiceStorageKey(clientId: string) {
  return `dcp-contract-choice-v1-${clientId}`
}

function getDefaultChoiceState(comparisons: EnvelopeComparison[]): ContractChoiceState {
  return {
    selectedByEnvelope: Object.fromEntries(
      comparisons.map((group) => [group.envelope, group.recommended?.id || '']),
    ),
    noteByEnvelope: Object.fromEntries(comparisons.map((group) => [group.envelope, ''])),
  }
}

export function ContractsComparisonPage() {
  const client = useCabinetStore((state) => state.selectedClient)
  const discovery = useCabinetStore((state) => state.getDiscoveryForSelectedClient())

  const [choiceState, setChoiceState] = useState<ContractChoiceState>({
    selectedByEnvelope: {},
    noteByEnvelope: {},
  })

  if (!client) {
    return (
      <>
        <PageHero title="Comparatif des contrats" description="Aucun client sélectionné." />
        <section className="card">
          <h2>Dossier non sélectionné</h2>
          <p>Passe par la page Clients pour ouvrir un dossier.</p>
        </section>
      </>
    )
  }

  if (!discovery) {
    return (
      <>
        <PageHero
          title={`Comparatif des contrats — ${client.fullName}`}
          description="Aucune découverte patrimoniale disponible pour ce dossier."
        />
        <section className="card">
          <h2>Données insuffisantes</h2>
          <p>Commence par renseigner la découverte et les scénarios avant de comparer les contrats.</p>
        </section>
      </>
    )
  }

  const displayName =
    `${discovery?.mainPerson?.firstName ?? ''} ${discovery?.mainPerson?.lastName ?? ''}`.trim() ||
    client.fullName

  const riskProfile = getResolvedRiskProfile(discovery) as RiskProfile
  const tmi = getResolvedTmi(discovery)
  const objective = discovery?.objectives?.mainObjective || 'Objectif non renseigné'

  const selectedIncome = Number(
    discovery?.budgetOverrides?.householdIncomeMode === 'manual'
      ? discovery?.budgetOverrides?.householdIncomeManual || 0
      : (discovery?.revenues ?? [])
          .filter((line: any) => line.includedInBudget)
          .reduce((sum: number, line: any) => sum + Number(line.monthlyAmount || 0), 0),
  )

  const selectedCharges = Number(
    discovery?.budgetOverrides?.chargesMode === 'manual'
      ? discovery?.budgetOverrides?.chargesManual || 0
      : (discovery?.charges ?? [])
          .filter((line: any) => line.includedInBudget)
          .reduce((sum: number, line: any) => sum + Number(line.monthlyAmount || 0), 0),
  )

  const debtRatio = selectedIncome > 0 ? Math.round((selectedCharges / selectedIncome) * 100) : 0

  const liquidAssets = Array.isArray(discovery?.assets)
    ? discovery.assets
        .filter((line: any) => line.category === 'Liquidités')
        .reduce((sum: number, line: any) => sum + Number(line.amount || 0), 0)
    : 0

  const emergencyMonths = selectedCharges > 0 ? liquidAssets / selectedCharges : 0

  const storageKey = `dcp-scenarios-v4-${client.id}`
  const rawScenarioState = localStorage.getItem(storageKey)

  if (!rawScenarioState) {
    return (
      <>
        <PageHero
          title={`Comparatif des contrats — ${displayName}`}
          description="La comparaison dépend du scénario et de l’allocation retenus."
        />
        <section className="card">
          <h2>Scénarios non renseignés</h2>
          <p>Va d’abord dans la page Scénarios pour sélectionner une trajectoire et une allocation.</p>
        </section>
      </>
    )
  }

  let scenarioState: StoredScenarioState | null = null

  try {
    scenarioState = JSON.parse(rawScenarioState) as StoredScenarioState
  } catch {
    scenarioState = null
  }

  if (!scenarioState) {
    return (
      <>
        <PageHero
          title={`Comparatif des contrats — ${displayName}`}
          description="Impossible de lire les données de scénarios."
        />
        <section className="card">
          <h2>Données scénarios invalides</h2>
          <p>Retourne sur la page Scénarios et enregistre de nouveau la sélection.</p>
        </section>
      </>
    )
  }

  const selectedScenarioKey = scenarioState.selectedKey
  const selectedScenarioLabel = scenarioLabels[selectedScenarioKey]
  const recommendedScenarioLabel = scenarioLabels[scenarioState.recommendedKey]
  const initialAmount = scenarioState.adjustedInitialByKey?.[selectedScenarioKey] ?? 0
  const monthlyAmount = scenarioState.adjustedMonthlyByKey?.[selectedScenarioKey] ?? 0
  const allocation = scenarioState.allocationsByKey?.[selectedScenarioKey] ?? []

  const resolvedAllocation = resolveAllocationToEnvelopes(allocation, {
    riskProfile,
    objective,
  })

  const envelopeRecommendations = getEnvelopeRecommendations({
    riskProfile,
    objective,
    tmi,
    emergencyMonths,
    debtRatio,
  })

  const activeEnvelopes = resolvedAllocation
    .filter((line) => Number(line.euroAmount || 0) > 0 || Number(line.monthlyEuroAmount || 0) > 0)
    .map((line) => line.envelope)

  const envelopeUniverse = Array.from(
    new Set([
      ...activeEnvelopes,
      ...envelopeRecommendations.recommended,
      ...envelopeRecommendations.secondary,
    ]),
  )

  const scoredContracts = getRecommendedContracts({
    riskProfile,
    objective,
    scenarioKey: selectedScenarioKey,
    includeAdvanced: true,
    includeComplementary: true,
  })

  const comparisons = useMemo<EnvelopeComparison[]>(() => {
    return envelopeUniverse.map((envelope) => {
      const envelopeAllocation = findResolvedEnvelopeAllocation(resolvedAllocation, envelope)

      const matches = scoredContracts
        .filter((contract) => contract.envelope === envelope)
        .sort((a, b) => getRecommendationScore(b) - getRecommendationScore(a))

      return {
        envelope,
        initialAmount: envelopeAllocation?.euroAmount ?? 0,
        monthlyAmount: envelopeAllocation?.monthlyEuroAmount ?? 0,
        securePercent: getResolvedSecurePercent(envelopeAllocation, 'initial'),
        ucPercent: getResolvedUcPercent(envelopeAllocation, 'initial'),
        recommended: matches[0] ?? null,
        alternatives: matches.slice(1, 4),
        all: matches,
        recommendationLevel: envelopeRecommendations.recommended.includes(envelope)
          ? 'Principale'
          : envelopeRecommendations.secondary.includes(envelope)
            ? 'Secondaire'
            : 'À étudier',
      }
    })
  }, [envelopeUniverse.join('|'), scoredContracts, envelopeRecommendations, resolvedAllocation])

  useEffect(() => {
    const defaultState = getDefaultChoiceState(comparisons)
    const raw = localStorage.getItem(buildChoiceStorageKey(client.id))

    if (!raw) {
      setChoiceState(defaultState)
      return
    }

    try {
      const parsed = JSON.parse(raw) as ContractChoiceState
      setChoiceState({
        selectedByEnvelope: { ...defaultState.selectedByEnvelope, ...(parsed.selectedByEnvelope || {}) },
        noteByEnvelope: { ...defaultState.noteByEnvelope, ...(parsed.noteByEnvelope || {}) },
      })
    } catch {
      setChoiceState(defaultState)
    }
  }, [client.id, comparisons])

  useEffect(() => {
    localStorage.setItem(buildChoiceStorageKey(client.id), JSON.stringify(choiceState))
  }, [client.id, choiceState])

  const selectedContractsCount = comparisons.filter((group) => choiceState.selectedByEnvelope[group.envelope]).length
  const clientFollowsCabinetCount = comparisons.filter((group) => {
    const selectedId = choiceState.selectedByEnvelope[group.envelope]
    return selectedId && selectedId === group.recommended?.id
  }).length

  return (
    <>
      <PageHero
        title={`Comparatif des contrats — ${displayName}`}
        description="Présentation structurée des solutions comparées, justification de la sélection cabinet et formalisation du choix final du client dans le respect de l’obligation de conseil."
      />

      <section className="contracts-summary card">
        <div className="contracts-summary-main">
          <div>
            <div className="brand-kicker">Cadre de lecture</div>
            <h2>{displayName}</h2>
            <p>
              Le cabinet compare plusieurs contrats par enveloppe, justifie la sélection recommandée et laisse au client la possibilité de retenir une autre solution proposée lorsque cela reste cohérent avec le dossier.
            </p>
          </div>

          <div className="contracts-summary-badges">
            <Badge>{riskProfile}</Badge>
            <Badge>{objective}</Badge>
            <Badge>{selectedScenarioLabel}</Badge>
          </div>
        </div>

        <div className="kpi-row">
          <span className="pill">Scénario cabinet : {recommendedScenarioLabel}</span>
          <span className="pill">Scénario retenu : {selectedScenarioLabel}</span>
          <span className="pill">Initial : {formatCurrency(initialAmount)}</span>
          <span className="pill">Mensuel : {formatCurrency(monthlyAmount)}</span>
        </div>
      </section>

      <section className="metrics-grid contracts-metrics">
        <MetricCard label="Enveloppes comparées" value={String(comparisons.length)} help="Univers présenté au client" />
        <MetricCard label="Contrats retenus par le client" value={String(selectedContractsCount)} help="Choix formalisés" />
        <MetricCard label="Alignement avec le cabinet" value={String(clientFollowsCabinetCount)} help="Choix conformes à la recommandation" />
        <MetricCard label="Réserve de sécurité" value={`${emergencyMonths.toFixed(1)} mois`} help="Lecture de liquidité du dossier" />
      </section>

      <section className="contracts-top-grid">
        <article className="card">
          <div className="section-title">
            <h2>Logique cabinet</h2>
          </div>
          <ul className="contracts-list">
            <li>Comparer plusieurs solutions par enveloppe et mettre en avant 1 à 3 contrats réellement pertinents.</li>
            <li>Justifier la sélection selon le profil, l’objectif, la fiscalité, la liquidité et le scénario retenu.</li>
            <li>Laisser au client la possibilité de retenir une autre solution proposée, avec une traçabilité claire.</li>
          </ul>
        </article>

        <article className="card">
          <div className="section-title">
            <h2>Contexte du dossier</h2>
          </div>

          <ul className="list">
            <li className="list-item"><span>Objectif principal</span><span className="pill">{objective}</span></li>
            <li className="list-item"><span>TMI retenue</span><span className="pill">{tmi}</span></li>
            <li className="list-item"><span>Taux d’endettement</span><span className="pill">{debtRatio} %</span></li>
            <li className="list-item"><span>Enveloppes concernées</span><span className="pill">{envelopeUniverse.join(', ') || 'Aucune'}</span></li>
          </ul>
        </article>
      </section>

      <section className="contracts-sections">
        {comparisons.map((group) => {
          const selectedId = choiceState.selectedByEnvelope[group.envelope] || ''
          const selectedContract =
            group.all.find((contract) => contract.id === selectedId) ||
            group.recommended ||
            null

          const followsCabinet = !!group.recommended && selectedContract?.id === group.recommended.id

          return (
            <article key={group.envelope} className="card contracts-envelope-card">
              <div className="section-title">
                <div>
                  <h2>{group.envelope}</h2>
                  <p className="section-subtitle">
                    Lecture comparative pour l’enveloppe {group.envelope.toLowerCase()}, avec recommandation cabinet et alternatives proposées.
                  </p>
                </div>
                <Badge>{group.recommendationLevel}</Badge>
              </div>

              <div className="kpi-row contracts-envelope-kpis">
                <span className="pill">Initial : {formatCurrency(group.initialAmount)}</span>
                <span className="pill">Mensuel : {formatCurrency(group.monthlyAmount)}</span>
                <span className="pill">Allocation : {group.securePercent}% sécuritaire / {group.ucPercent}% UC</span>
              </div>

              <div className="contracts-layout">
                <section className="contracts-panel contracts-panel-primary">
                  <div className="contracts-panel-head">
                    <h3>Contrat recommandé par le cabinet</h3>
                    <Badge>Recommandé</Badge>
                  </div>

                  {group.recommended ? (
                    <ContractCard
                      contract={group.recommended}
                      scenarioKey={selectedScenarioKey}
                      isSelected={selectedContract?.id === group.recommended.id}
                      onSelect={() =>
                        setChoiceState((current) => ({
                          ...current,
                          selectedByEnvelope: {
                            ...current.selectedByEnvelope,
                            [group.envelope]: group.recommended?.id || '',
                          },
                        }))
                      }
                    />
                  ) : (
                    <p>Aucun contrat recommandé n’est disponible pour cette enveloppe.</p>
                  )}
                </section>

                <section className="contracts-panel">
                  <div className="contracts-panel-head">
                    <h3>Alternatives présentées</h3>
                    <Badge>{group.alternatives.length}</Badge>
                  </div>

                  {group.alternatives.length ? (
                    <div className="contracts-alternatives">
                      {group.alternatives.map((contract) => (
                        <ContractCard
                          key={contract.id}
                          contract={contract}
                          scenarioKey={selectedScenarioKey}
                          compact
                          isSelected={selectedContract?.id === contract.id}
                          onSelect={() =>
                            setChoiceState((current) => ({
                              ...current,
                              selectedByEnvelope: {
                                ...current.selectedByEnvelope,
                                [group.envelope]: contract.id,
                              },
                            }))
                          }
                        />
                      ))}
                    </div>
                  ) : (
                    <p>Aucune alternative comparable n’est enregistrée à ce stade.</p>
                  )}
                </section>
              </div>

              <section className="contracts-choice-card">
                <div className="contracts-choice-head">
                  <div>
                    <h3>Choix final du client</h3>
                    <p className="section-subtitle">
                      Cette zone formalise le contrat retenu et la logique de sélection.
                    </p>
                  </div>
                  <Badge>{followsCabinet ? 'Suit la recommandation cabinet' : 'Alternative retenue'}</Badge>
                </div>

                <div className="contracts-choice-grid">
                  <div className="contracts-choice-box">
                    <div className="contracts-choice-label">Contrat retenu</div>
                    <div className="contracts-choice-value">
                      {selectedContract ? selectedContract.contractName : 'Aucun contrat retenu'}
                    </div>
                    <div className="contracts-choice-help">
                      {selectedContract
                        ? `${selectedContract.insurer}${selectedContract.distributor ? ` • ${selectedContract.distributor}` : ''}`
                        : 'Le client n’a pas encore arrêté son choix.'}
                    </div>
                  </div>

                  <div className="contracts-choice-box">
                    <div className="contracts-choice-label">Justification</div>
                    <div className="contracts-choice-value">
                      {followsCabinet
                        ? 'Le client suit la recommandation du cabinet.'
                        : 'Le client retient une autre solution proposée dans le comparatif.'}
                    </div>
                    <div className="contracts-choice-help">
                      {followsCabinet
                        ? 'Le contrat conseillé reste celui jugé le plus cohérent avec le dossier.'
                        : 'Le choix reste traçable et repose sur une alternative réellement présentée.'}
                    </div>
                  </div>
                </div>

                <label className="contracts-note-field">
                  <span>Note cabinet / client</span>
                  <textarea
                    value={choiceState.noteByEnvelope[group.envelope] || ''}
                    onChange={(event) =>
                      setChoiceState((current) => ({
                        ...current,
                        noteByEnvelope: {
                          ...current.noteByEnvelope,
                          [group.envelope]: event.target.value,
                        },
                      }))
                    }
                    placeholder="Expliquer le choix retenu, l’écart éventuel avec la recommandation cabinet, ou tout point utile à tracer."
                  />
                </label>
              </section>

              <section className="table-card contracts-table-card">
                <table>
                  <thead>
                    <tr>
                      <th>Contrat</th>
                      <th>Assureur</th>
                      <th>Frais</th>
                      <th>Liquidité</th>
                      <th>Complexité</th>
                      <th>Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {group.all.length === 0 ? (
                      <tr>
                        <td colSpan={6}>Aucune donnée disponible</td>
                      </tr>
                    ) : (
                      group.all.map((contract) => (
                        <tr key={`${group.envelope}-${contract.id}`}>
                          <td>
                            <strong>{contract.contractName}</strong>
                            {group.recommended?.id === contract.id ? (
                              <div className="muted contracts-inline-note">Recommandé cabinet</div>
                            ) : null}
                            {selectedContract?.id === contract.id ? (
                              <div className="muted contracts-inline-note">Retenu par le client</div>
                            ) : null}
                          </td>
                          <td>{contract.insurer}</td>
                          <td>{contract.entryFeesLabel || 'À préciser'}</td>
                          <td>{contract.liquidityLevel}</td>
                          <td>{contract.complexityLevel}</td>
                          <td><strong>{getRecommendationScore(contract)}/95</strong></td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </section>
            </article>
          )
        })}
      </section>
    </>
  )
}

function ContractCard({
  contract,
  scenarioKey,
  compact = false,
  isSelected,
  onSelect,
}: {
  contract: ContractRecord
  scenarioKey: ScenarioKey
  compact?: boolean
  isSelected: boolean
  onSelect: () => void
}) {
  return (
    <article className={`contracts-contract-card${compact ? ' compact' : ''}${isSelected ? ' selected' : ''}`}>
      <div className="contracts-contract-head">
        <div>
          <h4>{contract.contractName}</h4>
          <p>
            {contract.insurer}
            {contract.distributor ? ` • ${contract.distributor}` : ''}
          </p>
        </div>
        <div className="contracts-contract-badges">
          <span className="pill">{labelTier(contract.tier)}</span>
          <span className="pill">{getRecommendationScore(contract)}/95</span>
        </div>
      </div>

      <div className="contracts-contract-grid">
        <div>
          <div className="contracts-label">Adéquation</div>
          <div className="contracts-text">{contract.roleInStrategy}</div>
        </div>

        <div>
          <div className="contracts-label">Points forts</div>
          <div className="contracts-text">{contract.strengths.join(' • ')}</div>
        </div>

        <div>
          <div className="contracts-label">Vigilance</div>
          <div className="contracts-text">{contract.watchPoints.join(' • ')}</div>
        </div>
      </div>

      <ul className="list contracts-mini-list">
        <li className="list-item"><span>Frais d’entrée</span><span className="pill">{contract.entryFeesLabel || 'À préciser'}</span></li>
        <li className="list-item"><span>Frais UC</span><span className="pill">{contract.managementFeesUcLabel || 'À préciser'}</span></li>
        <li className="list-item"><span>Liquidité</span><span className="pill">{contract.liquidityLevel}</span></li>
        <li className="list-item"><span>Univers d’investissement</span><span className="pill">{contract.supportsSummary}</span></li>
        <li className="list-item"><span>Rendement hypothétique</span><span className="pill">{getReturnHypothesis(contract, scenarioKey) || 'À préciser'}</span></li>
      </ul>

      <div className="contracts-choice-actions">
        <button type="button" className={isSelected ? 'primary-cta' : 'ghost-cta'} onClick={onSelect}>
          {isSelected ? 'Contrat retenu' : 'Retenir ce contrat'}
        </button>
      </div>
    </article>
  )
}

function getReturnHypothesis(contract: ContractRecord, scenarioKey: ScenarioKey) {
  if (!contract.expectedReturnHypothesis) return ''
  if (scenarioKey === 'secure') return contract.expectedReturnHypothesis.secure || ''
  if (scenarioKey === 'balanced') return contract.expectedReturnHypothesis.balanced || ''
  return contract.expectedReturnHypothesis.growth || ''
}

function labelTier(value: ContractRecord['tier']) {
  if (value === 'core') return 'Cœur de gamme'
  if (value === 'advanced') return 'Avancé'
  return 'Complémentaire'
}

export default ContractsComparisonPage
