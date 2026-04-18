import { useEffect, useMemo, useRef, useState } from 'react'
import { PageHero } from '../../components/ui/PageHero'
import { MetricCard } from '../../components/ui/MetricCard'
import { Badge } from '../../components/ui/Badge'
import { useCabinetStore } from '../../store/useCabinetStore'
import { SectionNav, type DiscoverySectionKey } from './components/SectionNav'
import { buildInitialDiscoveryState } from './discovery.initial'
import {
  getEmergencyFundMonths,
  getResolvedRiskProfile,
  getResolvedTaxParts,
  getResolvedTmi,
  getSelectedHouseholdIncome,
  getSelectedSavingsCapacity,
  getTotalAssets,
  getTotalLiabilitiesCapital,
} from './discovery.helpers'
import { AssetsEnvelopesSection } from './sections/AssetsEnvelopesSection'
import { DocumentsNotesSection } from './sections/DocumentsNotesSection'
import { IdentityHouseholdSection } from './sections/IdentityHouseholdSection'
import { IncomeChargesSection } from './sections/IncomeChargesSection'
import { InvestmentProjectSection } from './sections/InvestmentProjectSection'
import { LiabilitiesSection } from './sections/LiabilitiesSection'
import { ObjectivesRiskEsgSection } from './sections/ObjectivesRiskEsgSection'
import { ProtectionSection } from './sections/ProtectionSection'
import { TaxSection } from './sections/TaxSection'

function mergeDiscoveryState(base: any, stored: any) {
  if (!stored || typeof stored !== 'object') return base

  return {
    ...base,
    ...stored,
    mainPerson: { ...(base.mainPerson ?? {}), ...(stored.mainPerson ?? {}) },
    household: { ...(base.household ?? {}), ...(stored.household ?? {}) },
    householdBudget: { ...(base.householdBudget ?? {}), ...(stored.householdBudget ?? {}) },
    tax: { ...(base.tax ?? {}), ...(stored.tax ?? {}) },
    investmentProject: { ...(base.investmentProject ?? {}), ...(stored.investmentProject ?? {}) },
    protection: { ...(base.protection ?? {}), ...(stored.protection ?? {}) },
    objectives: { ...(base.objectives ?? {}), ...(stored.objectives ?? {}) },
    esg: { ...(base.esg ?? {}), ...(stored.esg ?? {}) },
    documents: { ...(base.documents ?? {}), ...(stored.documents ?? {}) },
    notes: { ...(base.notes ?? {}), ...(stored.notes ?? {}) },
    assets: Array.isArray(stored.assets) ? stored.assets : base.assets ?? [],
    liabilities: Array.isArray(stored.liabilities) ? stored.liabilities : base.liabilities ?? [],
    revenues: Array.isArray(stored.revenues) ? stored.revenues : base.revenues ?? [],
    charges: Array.isArray(stored.charges) ? stored.charges : base.charges ?? [],
    linkedPersons: Array.isArray(stored.linkedPersons) ? stored.linkedPersons : base.linkedPersons ?? [],
    riskQuestionnaireAnswers: Array.isArray(stored.riskQuestionnaireAnswers)
      ? stored.riskQuestionnaireAnswers
      : base.riskQuestionnaireAnswers ?? [],
  }
}

function formatMetricValue(value: number, suffix = '€') {
  if (!Number.isFinite(value) || value === 0) return '—'
  return `${value.toLocaleString('fr-FR')} ${suffix}`.trim()
}

function formatMonths(value: number) {
  if (!Number.isFinite(value) || value === 0) return '—'
  return `${value.toFixed(1)} mois`
}

export function DiscoveryPage() {
  const client = useCabinetStore((state) => state.selectedClient)
  const storedDiscovery = useCabinetStore((state) => state.getDiscoveryForSelectedClient())
  const setStoredDiscovery = useCabinetStore((state) => state.setDiscoveryForSelectedClient)
  const syncSelectedClientIdentity = useCabinetStore((state: any) => state.syncSelectedClientIdentity ?? (() => {}))
  const syncLinkedPersonsFromSelectedClientDiscovery = useCabinetStore(
    (state: any) => state.syncLinkedPersonsFromSelectedClientDiscovery ?? (() => {}),
  )

  const [activeSection, setActiveSection] = useState<DiscoverySectionKey>('identity')

  const [state, setState] = useState(() => {
    const base = buildInitialDiscoveryState(client)
    return mergeDiscoveryState(base, storedDiscovery)
  })

  const lastHydratedClientId = useRef<string | null>(null)

  useEffect(() => {
    if (!client) return
    if (lastHydratedClientId.current === client.id) return

    const base = buildInitialDiscoveryState(client)
    setState(mergeDiscoveryState(base, storedDiscovery))
    lastHydratedClientId.current = client.id
  }, [client?.id, storedDiscovery])

  useEffect(() => {
    if (!client) return
    setStoredDiscovery(state)
    syncSelectedClientIdentity(state)
    syncLinkedPersonsFromSelectedClientDiscovery(state)
  }, [state, client?.id, setStoredDiscovery, syncSelectedClientIdentity, syncLinkedPersonsFromSelectedClientDiscovery])

  const summary = useMemo(() => {
    const safeState = mergeDiscoveryState(buildInitialDiscoveryState(client), state)
    const totalAssets = getTotalAssets(safeState.assets ?? [])
    const totalLiabilities = getTotalLiabilitiesCapital(safeState)

    return {
      totalAssets,
      netWorth: totalAssets - totalLiabilities,
      emergencyMonths: getEmergencyFundMonths(safeState),
      selectedIncome: getSelectedHouseholdIncome(safeState),
      selectedSavings: getSelectedSavingsCapacity(safeState),
      taxParts: getResolvedTaxParts(safeState),
      tmi: getResolvedTmi(safeState),
      riskProfile: getResolvedRiskProfile(safeState),
      linkedPersons: Array.isArray(safeState.linkedPersons) ? safeState.linkedPersons.length : 0,
    }
  }, [state, client])

  if (!client) {
    return (
      <>
        <PageHero title="Découverte patrimoniale" description="Aucun client sélectionné." />
        <section className="card">
          <h2>Dossier non sélectionné</h2>
          <p>Passe d’abord par la page Clients pour ouvrir un dossier existant.</p>
        </section>
      </>
    )
  }

  const displayName =
    `${state?.mainPerson?.firstName ?? ''} ${state?.mainPerson?.lastName ?? ''}`.trim() || client.fullName

  return (
    <>
      <PageHero
        title={`Découverte patrimoniale — ${displayName}`}
        description="Collecte structurée du dossier, lecture rapide des indicateurs clés et accès fluide aux sections du rendez-vous."
      />

      <section className="card discovery-refonte-overview">
        <div className="discovery-refonte-overview-main">
          <div>
            <div className="brand-kicker">Dossier actif</div>
            <h2>{displayName}</h2>
            <p>
              Renseigne uniquement les blocs utiles au rendez-vous, puis complète progressivement le reste du dossier.
            </p>
          </div>

          <div className="discovery-refonte-overview-badges">
            <Badge>{client.status}</Badge>
            <Badge>{client.priority}</Badge>
            <Badge>{summary.riskProfile || 'Profil à confirmer'}</Badge>
          </div>
        </div>

        <div className="kpi-row">
          <span className="pill">Revenus retenus : {formatMetricValue(summary.selectedIncome)}</span>
          <span className="pill">Parts fiscales : {summary.taxParts || '—'}</span>
          <span className="pill">TMI : {summary.tmi || '—'}</span>
          <span className="pill">Personnes liées : {summary.linkedPersons}</span>
        </div>
      </section>

      <section className="metrics-grid discovery-refonte-metrics">
        <MetricCard label="Patrimoine brut" value={formatMetricValue(summary.totalAssets)} help="Actifs totaux retenus" />
        <MetricCard label="Patrimoine net" value={formatMetricValue(summary.netWorth)} help="Après passif" />
        <MetricCard label="Réserve de sécurité" value={formatMonths(summary.emergencyMonths)} help="Lecture budgétaire" />
        <MetricCard label="Capacité retenue" value={formatMetricValue(summary.selectedSavings)} help="Effort mensuel retenu" />
      </section>

      <SectionNav active={activeSection} onChange={setActiveSection} />

      <section className="discovery-refonte-section-shell">
        {activeSection === 'identity' && <IdentityHouseholdSection state={state} setState={setState} />}
        {activeSection === 'income' && <IncomeChargesSection state={state} setState={setState} />}
        {activeSection === 'assets' && <AssetsEnvelopesSection state={state} setState={setState} />}
        {activeSection === 'liabilities' && <LiabilitiesSection state={state} setState={setState} />}
        {activeSection === 'tax' && <TaxSection state={state} setState={setState} />}
        {activeSection === 'investment' && <InvestmentProjectSection state={state} setState={setState} />}
        {activeSection === 'protection' && <ProtectionSection state={state} setState={setState} />}
        {activeSection === 'profile' && <ObjectivesRiskEsgSection state={state} setState={setState} />}
        {activeSection === 'documents' && <DocumentsNotesSection state={state} setState={setState} />}
      </section>
    </>
  )
}

export default DiscoveryPage
