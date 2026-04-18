import type { CabinetDocumentConfig } from '../../domain/cabinetSettings.types'
import { buildDiscoveryCompleteness } from '../quality/buildDiscoveryCompleteness'
import type { ClientDeviationRecord } from '../../domain/deviation.types'

export type ComplianceCheck = {
  id: string
  label: string
  isOk: boolean
  severity: 'bloquant' | 'attention'
}

export type ComplianceCheckSummary = {
  isFinalizable: boolean
  blockingChecks: ComplianceCheck[]
  warningChecks: ComplianceCheck[]
  allChecks: ComplianceCheck[]
}

function hasValue(value: unknown) {
  return String(value ?? '').trim().length > 0
}

export function buildComplianceChecks(args: {
  documents: CabinetDocumentConfig
  discovery: any | null
  hasScenario: boolean
  recommendedScenarioLabel?: string | null
  selectedScenarioLabel?: string | null
  deviation?: ClientDeviationRecord | null
}) : ComplianceCheckSummary {
  const { documents, discovery, hasScenario, recommendedScenarioLabel, selectedScenarioLabel, deviation } = args
  const discoveryCompleteness = discovery ? buildDiscoveryCompleteness(discovery) : null
  const hasDeviation = Boolean(
    recommendedScenarioLabel &&
    selectedScenarioLabel &&
    recommendedScenarioLabel !== selectedScenarioLabel,
  )
  const hasDeviationJustification = !hasDeviation || Boolean(deviation?.justification?.trim())

  const checks: ComplianceCheck[] = [
    { id: 'cabinet-phone', label: 'Téléphone cabinet renseigné', isOk: hasValue(documents.phone), severity: 'bloquant' },
    { id: 'cabinet-orias', label: 'ORIAS renseigné', isOk: hasValue(documents.orias), severity: 'bloquant' },
    { id: 'cabinet-cif', label: 'Statut CIF renseigné', isOk: hasValue(documents.cifStatus), severity: 'bloquant' },
    { id: 'cabinet-intermediary', label: 'Statut courtage / intermédiaire renseigné', isOk: hasValue(documents.intermediaryStatus), severity: 'attention' },
    { id: 'cabinet-association', label: 'Association professionnelle renseignée', isOk: hasValue(documents.professionalAssociation), severity: 'bloquant' },
    { id: 'cabinet-rcpro', label: 'RC Pro renseignée', isOk: hasValue(documents.rcPro), severity: 'bloquant' },
    { id: 'cabinet-mediator', label: 'Médiateur renseigné', isOk: hasValue(documents.mediator), severity: 'bloquant' },
    { id: 'cabinet-address', label: 'Adresse cabinet renseignée', isOk: hasValue(documents.headOfficeAddress), severity: 'attention' },
    { id: 'cabinet-complaints', label: 'Email réclamations renseigné', isOk: hasValue(documents.complaintsEmail), severity: 'bloquant' },
    { id: 'cabinet-remuneration', label: 'Politique de rémunération renseignée', isOk: hasValue(documents.remunerationDisclosure), severity: 'bloquant' },
    { id: 'discovery', label: 'Découverte patrimoniale suffisamment complétée', isOk: Boolean(discoveryCompleteness?.isComplete), severity: 'bloquant' },
    { id: 'scenario', label: 'Scénario sélectionné et enregistré', isOk: hasScenario, severity: 'bloquant' },
    { id: 'deviation-justification', label: 'Écart client / cabinet justifié', isOk: hasDeviationJustification, severity: hasDeviation ? 'bloquant' : 'attention' },
  ]

  return {
    isFinalizable: checks.filter((item) => item.severity === 'bloquant').every((item) => item.isOk),
    blockingChecks: checks.filter((item) => item.severity === 'bloquant' && !item.isOk),
    warningChecks: checks.filter((item) => item.severity === 'attention' && !item.isOk),
    allChecks: checks,
  }
}
