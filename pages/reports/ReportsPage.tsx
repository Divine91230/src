import { useEffect, useMemo, useState } from 'react'
import { PageHero } from '../../components/ui/PageHero'
import { Badge } from '../../components/ui/Badge'
import { MetricCard } from '../../components/ui/MetricCard'
import { useCabinetStore } from '../../store/useCabinetStore'
import { useDeviationStore } from '../../store/useDeviationStore'
import { useClientAuditStore } from '../../store/useClientAuditStore'
import { buildClientFreshnessChecks } from '../../modules/compliance/buildClientFreshnessChecks'
import {
  getEmergencyFundMonths,
  getResolvedRiskProfile,
  getResolvedTmi,
  getSelectedHouseholdIncome,
  getSelectedSavingsCapacity,
  getTotalAssets,
  getTotalLiabilitiesCapital,
} from '../discovery/discovery.helpers'
import {
  getResolvedSecurePercent,
  getResolvedUcPercent,
  resolveAllocationToEnvelopes,
  type AllocationLine,
} from '../../lib/allocationMapping'
import {
  getRecommendedContracts,
  type ContractEnvelope,
  type RiskProfile,
  type ScenarioKey as ContractScenarioKey,
} from '../../data/contractsCatalog'
import './ReportsPage.css'

type ScenarioKey = 'secure' | 'balanced' | 'growth'

type StoredScenarioState = {
  recommendedKey: ScenarioKey
  selectedKey: ScenarioKey
  clientFollowsRecommendation: boolean
  adjustedInitialByKey: Record<ScenarioKey, number>
  adjustedMonthlyByKey: Record<ScenarioKey, number>
  allocationsByKey?: Record<ScenarioKey, AllocationLine[]>
}

type StoredContractChoiceState = {
  selectedByEnvelope: Record<string, string>
  noteByEnvelope: Record<string, string>
}

const scenarioLabels: Record<ScenarioKey, string> = {
  secure: 'Sécurisation',
  balanced: 'Équilibre patrimonial',
  growth: 'Retraite & Optimisation',
}

function formatCurrency(value: number) {
  if (!Number.isFinite(value) || value === 0) return '—'
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value)
}

export function ReportsPage() {
  const selectedClient = useCabinetStore((state) => state.selectedClient)
  const discoveryByClientId = useCabinetStore((state) => state.discoveryByClientId)
  const upsertDeviation = useDeviationStore((state) => state.upsertDeviation)
  const getDeviationByClientId = useDeviationStore((state) => state.getDeviationByClientId)
  const activeClient = selectedClient as NonNullable<typeof selectedClient>
  const addAudit = useClientAuditStore((state) => state.addAudit)
  const auditItems = useClientAuditStore((state) => state.items)

  const discovery = activeClient ? discoveryByClientId[activeClient.id] : null
  const existingDeviation = activeClient ? getDeviationByClientId(activeClient.id) : null

  const [justification, setJustification] = useState(existingDeviation?.justification ?? '')
  const [advisorComment, setAdvisorComment] = useState(existingDeviation?.advisorComment ?? '')

  useEffect(() => {
    setJustification(existingDeviation?.justification ?? '')
    setAdvisorComment(existingDeviation?.advisorComment ?? '')
  }, [existingDeviation?.justification, existingDeviation?.advisorComment, selectedClient?.id])

  if (!selectedClient) {
    return (
      <>
        <PageHero title="Rapports" description="Aucun client sélectionné." />
        <section className="card">
          <h2>Dossier non sélectionné</h2>
          <p>Ouvre d’abord un dossier client pour afficher la synthèse finale.</p>
        </section>
      </>
    )
  }
  

  if (!discovery) {
    return (
      <>
        <PageHero title="Rapports" description="Synthèse finale du dossier et des choix patrimoniaux." />
        <section className="card">
          <h2>Données insuffisantes</h2>
          <p>Complète la découverte, les scénarios et la stratégie avant d’utiliser cette page comme synthèse finale.</p>
        </section>
      </>
    )
  }


  const displayName =
    `${discovery?.mainPerson?.firstName ?? ''} ${discovery?.mainPerson?.lastName ?? ''}`.trim() || activeClient.fullName

  const totalAssets = getTotalAssets(discovery.assets ?? [])
  const totalLiabilities = getTotalLiabilitiesCapital(discovery)
  const netWorth = totalAssets - totalLiabilities
  const income = getSelectedHouseholdIncome(discovery)
  const savings = getSelectedSavingsCapacity(discovery)
  const reserve = getEmergencyFundMonths(discovery)
  const risk = getResolvedRiskProfile(discovery)
  const tmi = getResolvedTmi(discovery)

  const freshnessChecks = buildClientFreshnessChecks({
    selectedClient,
    discovery,
  })

  const objective =
    discovery?.objectives?.mainObjective ||
    discovery?.investmentProject?.goal ||
    discovery?.investmentProject?.objective ||
    'Objectif à préciser'

  const scenarioRaw = localStorage.getItem(`dcp-scenarios-v4-${activeClient.id}`)
  const contractChoiceRaw = localStorage.getItem(`dcp-contract-choice-v1-${activeClient.id}`)

  let recommendedScenario = 'Non défini'
  let selectedScenario = 'Non défini'
  let initialAmount = 0
  let monthlyAmount = 0
  let selectedScenarioKey: ScenarioKey | null = null
  let envelopeRows: Array<{
    envelope: string
    initial: number
    monthly: number
    secureInitial: number
    ucInitial: number
    secureMonthly: number
    ucMonthly: number
    contractName: string
    contractCarrier: string
  }> = []

  try {
    if (scenarioRaw) {
      const parsed = JSON.parse(scenarioRaw) as StoredScenarioState
      if (parsed?.recommendedKey) recommendedScenario = scenarioLabels[parsed.recommendedKey]
      if (parsed?.selectedKey) {
        selectedScenarioKey = parsed.selectedKey
        selectedScenario = scenarioLabels[parsed.selectedKey]
        initialAmount = Number(parsed.adjustedInitialByKey?.[parsed.selectedKey] || 0)
        monthlyAmount = Number(parsed.adjustedMonthlyByKey?.[parsed.selectedKey] || 0)

        const resolvedAllocation = resolveAllocationToEnvelopes(parsed.allocationsByKey?.[parsed.selectedKey] || [], {
          riskProfile: risk,
          objective,
        })

        let selectedByEnvelope: Record<string, string> = {}
        try {
          if (contractChoiceRaw) {
            const parsedChoice = JSON.parse(contractChoiceRaw) as StoredContractChoiceState
            selectedByEnvelope = parsedChoice.selectedByEnvelope || {}
          }
        } catch {}

        const contracts = getRecommendedContracts({
          riskProfile: risk as RiskProfile,
          objective,
          scenarioKey: parsed.selectedKey as ContractScenarioKey,
          includeAdvanced: true,
          includeComplementary: true,
        })

        envelopeRows = resolvedAllocation
          .filter((line) => Number(line.euroAmount || 0) > 0 || Number(line.monthlyEuroAmount || 0) > 0)
          .map((line) => {
            const selectedId = selectedByEnvelope[line.envelope] || ''
            const envelopeContracts = contracts.filter((contract) => contract.envelope === (line.envelope as ContractEnvelope))
            const selectedContract =
              envelopeContracts.find((contract) => contract.id === selectedId) ||
              envelopeContracts[0] ||
              null

            return {
              envelope: line.envelope,
              initial: Number(line.euroAmount || 0),
              monthly: Number(line.monthlyEuroAmount || 0),
              secureInitial: getResolvedSecurePercent(line, 'initial'),
              ucInitial: getResolvedUcPercent(line, 'initial'),
              secureMonthly: getResolvedSecurePercent(line, 'monthly'),
              ucMonthly: getResolvedUcPercent(line, 'monthly'),
              contractName: selectedContract?.contractName || 'À définir',
              contractCarrier: selectedContract
                ? `${selectedContract.insurer}${selectedContract.distributor ? ` • ${selectedContract.distributor}` : ''}`
                : 'Contrat non encore arrêté',
            }
          })
      }
    }
  } catch {}

  const hasDeviation = recommendedScenario !== 'Non défini' && selectedScenario !== 'Non défini' && recommendedScenario !== selectedScenario

  const clientAudit = useMemo(
    () => auditItems.filter((item) => item.clientId === activeClient.id).slice(0, 6),
    [auditItems, activeClient.id],
  )

  function handleSaveDeviation() {
    if (!hasDeviation) return
    upsertDeviation({
      clientId: activeClient.id,
      clientName: activeClient.fullName,
      recommendedScenario,
      selectedScenario,
      justification,
      advisorComment,
    })
    addAudit({
      clientId: activeClient.id,
      clientName: activeClient.fullName,
      eventType: 'deviation_saved',
      label: 'Justification de l’écart client / cabinet enregistrée',
      details: `${recommendedScenario} -> ${selectedScenario}`,
    })
  }

  const findings = [
    reserve >= 6
      ? 'Le dossier présente une réserve de sécurité exploitable pour structurer la stratégie dans de bonnes conditions.'
      : 'La réserve de sécurité reste un point central de vigilance avant toute montée en puissance trop rapide.',
    totalLiabilities > 0
      ? 'Le passif doit rester intégré dans la lecture patrimoniale et dans le rythme de mise en place.'
      : 'Le dossier ne fait pas ressortir de passif structurant à ce stade.',
    objective !== 'Objectif à préciser'
      ? `L’objectif principal ressort autour de “${objective}”, ce qui donne une direction claire à la stratégie.`
      : 'L’objectif principal mérite encore d’être précisé pour solidifier la logique de conseil.',
  ]

  const priorities = [
    'Valider la cohérence entre scénario retenu, stratégie d’investissement et enveloppes sélectionnées.',
    'Formaliser les arbitrages utiles sans complexifier inutilement la structure patrimoniale.',
    'Conserver une logique simple entre sécurité, disponibilité, capitalisation et horizon long terme.',
  ]

  const vigilance = [
    reserve < 4
      ? 'Ne pas fragiliser la poche de sécurité dans la mise en place.'
      : 'Conserver une poche de sécurité visible après exécution de la stratégie.',
    'Vérifier systématiquement l’antériorité, la fiscalité et les frais avant toute réorganisation importante.',
    'Documenter clairement tout écart éventuel entre recommandation cabinet et choix client.',
  ]

  const implementation = [
    `Versement initial retenu : ${formatCurrency(initialAmount)}.`,
    `Effort mensuel retenu : ${formatCurrency(monthlyAmount)}.`,
    `Scénario cabinet : ${recommendedScenario}.`,
    `Choix final du client : ${selectedScenario}.`,
  ]

  return (
    <>
      <PageHero
        title="Rapports"
        description="Page de synthèse finale du dossier, récapitulant la situation du client, les constats, les choix stratégiques et la traçabilité du choix final."
      />

      <section className="reports-summary card">
        <div className="reports-summary-main">
          <div>
            <div className="brand-kicker">Synthèse finale du dossier</div>
            <h2>{displayName}</h2>
            <p>
              Cette page sert de lecture globale du dossier : situation patrimoniale, choix retenus, stratégie, vigilance et prochaines étapes.
            </p>
          </div>

          <div className="reports-summary-badges">
            <Badge>{risk || 'Profil à confirmer'}</Badge>
            <Badge>{objective}</Badge>
            <Badge>{selectedScenario}</Badge>
          </div>
        </div>

        <div className="kpi-row">
          <span className="pill">Scénario cabinet : {recommendedScenario}</span>
          <span className="pill">Scénario retenu : {selectedScenario}</span>
          <span className="pill">Initial : {formatCurrency(initialAmount)}</span>
          <span className="pill">Mensuel : {formatCurrency(monthlyAmount)}</span>
        </div>
      </section>

      <section className="metrics-grid reports-metrics">
        <MetricCard label="Patrimoine net" value={formatCurrency(netWorth)} help="Après prise en compte du passif" />
        <MetricCard label="Revenus retenus" value={formatCurrency(income)} help="Base de lecture budgétaire" />
        <MetricCard label="Capacité retenue" value={formatCurrency(savings)} help="Effort mensuel mobilisable" />
        <MetricCard label="TMI" value={String(tmi || '—')} help="Lecture fiscale retenue" />
      </section>

      <section className="reports-two-columns">
        <article className="card">
          <div className="section-title">
            <h2>Constats clés</h2>
          </div>
          <ul className="reports-list">
            {findings.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>

        <article className="card">
          <div className="section-title">
            <h2>Décision patrimoniale</h2>
          </div>
          <ul className="list">
            <li className="list-item"><span>Objectif principal</span><span className="pill">{objective}</span></li>
            <li className="list-item"><span>Profil retenu</span><span className="pill">{risk}</span></li>
            <li className="list-item"><span>Scénario cabinet</span><span className="pill">{recommendedScenario}</span></li>
            <li className="list-item"><span>Scénario client</span><span className="pill">{selectedScenario}</span></li>
            <li className="list-item"><span>Réserve de sécurité</span><span className="pill">{reserve.toFixed(1)} mois</span></li>
          </ul>
        </article>
      </section>

      <section className="card reports-envelopes-card">
        <div className="section-title">
          <h2>Enveloppes retenues, allocations et contrats</h2>
          <Badge>{`${envelopeRows.length} enveloppe${envelopeRows.length > 1 ? 's' : ''}`}</Badge>
        </div>

        {envelopeRows.length ? (
          <>
            <div className="reports-envelope-grid">
              {envelopeRows.map((row) => (
                <article key={row.envelope} className="reports-envelope-item">
                  <div className="reports-envelope-head">
                    <h3>{row.envelope}</h3>
                    <span className="pill">{formatCurrency(row.initial)} init. / {formatCurrency(row.monthly)} mens.</span>
                  </div>

                  <div className="reports-contract-box">
                    <div className="reports-contract-label">Contrat retenu</div>
                    <div className="reports-contract-name">{row.contractName}</div>
                    <div className="reports-contract-carrier">{row.contractCarrier}</div>
                  </div>

                  <div className="metric-strip">
                    <div className="metric-strip-item">
                      <div className="metric-strip-label">Initial</div>
                      <div className="metric-strip-value">{formatCurrency(row.initial)}</div>
                    </div>
                    <div className="metric-strip-item">
                      <div className="metric-strip-label">Mensuel</div>
                      <div className="metric-strip-value">{formatCurrency(row.monthly)}</div>
                    </div>
                  </div>

                  <ul className="list">
                    <li className="list-item"><span>Allocation initiale</span><span className="pill">{row.secureInitial}% sécu / {row.ucInitial}% UC</span></li>
                    <li className="list-item"><span>Allocation mensuelle</span><span className="pill">{row.secureMonthly}% sécu / {row.ucMonthly}% UC</span></li>
                  </ul>
                </article>
              ))}
            </div>

            <section className="table-card reports-envelopes-table">
              <table>
                <thead>
                  <tr>
                    <th>Enveloppe</th>
                    <th>Contrat retenu</th>
                    <th>Initial</th>
                    <th>Mensuel</th>
                    <th>Init. sécuritaire</th>
                    <th>Init. UC</th>
                    <th>Mens. sécuritaire</th>
                    <th>Mens. UC</th>
                  </tr>
                </thead>
                <tbody>
                  {envelopeRows.map((row) => (
                    <tr key={`${row.envelope}-row`}>
                      <td>{row.envelope}</td>
                      <td>
                        <strong>{row.contractName}</strong>
                        <div className="muted reports-inline-note">{row.contractCarrier}</div>
                      </td>
                      <td>{formatCurrency(row.initial)}</td>
                      <td>{formatCurrency(row.monthly)}</td>
                      <td>{row.secureInitial} %</td>
                      <td>{row.ucInitial} %</td>
                      <td>{row.secureMonthly} %</td>
                      <td>{row.ucMonthly} %</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </>
        ) : (
          <p>Aucune enveloppe alimentée n’apparaît encore dans le scénario retenu.</p>
        )}
      </section>

      <section className="reports-two-columns reports-bottom-grid">
        <article className="card">
          <div className="section-title">
            <h2>Priorités</h2>
          </div>
          <ul className="reports-list">
            {priorities.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>

        <article className="card">
          <div className="section-title">
            <h2>Vigilance</h2>
          </div>
          <ul className="reports-list reports-vigilance-list">
            {vigilance.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
      </section>

      <section className="card reports-implementation-card">
        <div className="section-title">
          <h2>Mise en place et prochaines étapes</h2>
        </div>
        <ul className="reports-list">
          {implementation.map((item) => (
            <li key={item}>{item}</li>
          ))}
          <li>Vérifier les enveloppes et contrats retenus avant génération des livrables.</li>
          <li>Utiliser la page dédiée “Documents PDF” pour générer et télécharger les rapports.</li>
        </ul>
      </section>

      <section className="card reports-freshness-card">
        <div className="section-title">
          <h2>Alerte fraîcheur du dossier</h2>
          <Badge>{`${freshnessChecks.length} contrôle${freshnessChecks.length > 1 ? 's' : ''}`}</Badge>
        </div>

        <div className="reports-freshness-list">
          {freshnessChecks.map((item, index) => (
            <div key={`${item.label}-${index}`} className={`reports-freshness-item ${item.level}`}>
              <strong>{item.level === 'ok' ? 'OK' : item.level === 'attention' ? 'Attention' : 'Alerte'}</strong>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </section>

      <section className={`card reports-deviation-card${hasDeviation ? ' warning' : ' ok'}`}>
        <div className="section-title">
          <h2>Traçabilité du choix client</h2>
          <Badge>{hasDeviation ? 'Écart à justifier' : 'Alignement cabinet / client'}</Badge>
        </div>

        {!hasDeviation ? (
          <p className="section-subtitle">
            Le scénario retenu par le client est aligné avec la recommandation du cabinet. Aucune justification d’écart n’est nécessaire à ce stade.
          </p>
        ) : (
          <>
            <p className="section-subtitle">
              Le client ne suit pas strictement la recommandation initiale du cabinet. La justification de cet écart doit être conservée dans le dossier.
            </p>

            <div className="reports-deviation-grid">
              <div className="reports-deviation-item">
                <div className="reports-deviation-label">Recommandation cabinet</div>
                <div className="reports-deviation-value">{recommendedScenario}</div>
              </div>
              <div className="reports-deviation-item">
                <div className="reports-deviation-label">Choix client</div>
                <div className="reports-deviation-value">{selectedScenario}</div>
              </div>
            </div>

            <div className="reports-deviation-form">
              <label className="settings-field">
                <span className="settings-label">Justification de l’écart</span>
                <textarea
                  className="settings-textarea"
                  value={justification}
                  onChange={(e) => setJustification(e.target.value)}
                  placeholder="Expliquer pourquoi le client retient une autre option que celle recommandée par le cabinet."
                />
              </label>

              <label className="settings-field">
                <span className="settings-label">Commentaire conseiller</span>
                <textarea
                  className="settings-textarea"
                  value={advisorComment}
                  onChange={(e) => setAdvisorComment(e.target.value)}
                  placeholder="Préciser les réserves, conditions de validation ou points de vigilance liés à l’écart."
                />
              </label>

              <div className="reports-deviation-actions">
                <button type="button" className="primary-cta" onClick={handleSaveDeviation}>
                  Enregistrer la justification
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      <section className="card reports-audit-card">
        <div className="section-title">
          <h2>Journal du dossier</h2>
          <Badge>{`${clientAudit.length} entrée${clientAudit.length > 1 ? 's' : ''}`}</Badge>
        </div>

        {clientAudit.length ? (
          <div className="reports-audit-list">
            {clientAudit.map((item) => (
              <div key={item.id} className="reports-audit-item">
                <strong>{item.label}</strong>
                <span>{item.details || '—'}</span>
                <span className="muted">{new Date(item.createdAt).toLocaleString('fr-FR')}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="section-subtitle">Aucun événement significatif enregistré pour ce dossier.</p>
        )}
      </section>
    </>
  )
}

export default ReportsPage
