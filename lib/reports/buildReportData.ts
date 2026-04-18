import type { CabinetDocumentConfig } from '../../domain/cabinetSettings.types'
import {
  getEmergencyFundMonths,
  getRemainingToLive,
  getResolvedRiskProfile,
  getResolvedTaxParts,
  getResolvedTmi,
  getSelectedCharges,
  getSelectedHouseholdIncome,
  getSelectedSavingsCapacity,
  getTotalAssets,
  getTotalLiabilitiesCapital,
  getRiskScore,
  toSafeNumber,
} from '../../pages/discovery/discovery.helpers'
import { buildSuitability } from '../../modules/suitability/buildSuitability'
import type {
  AllocationLine,
  ReportActionStep,
  ReportAllocationTotals,
  ReportBreakdownLine,
  ReportData,
  ReportDiagnosticBlock,
  ReportExistingEnvelopeUseLine,
  ScenarioKey,
  StoredScenarioChoice,
} from './report.types'

const defaultCabinet: CabinetDocumentConfig = {
  cabinetName: 'DCP Patrimoine',
  tagline: 'Structurer. Protéger. Élever votre patrimoine',
  advisorName: 'Conseiller patrimonial',
  email: 'contact@dcp.com',
  phone: '',
  website: '',
  orias: '',
  legalStatus: 'Cabinet de conseil patrimonial',
  cifStatus: '',
  intermediaryStatus: '',
  professionalAssociation: '',
  rcPro: '',
  mediator: '',
  remunerationDisclosure:
    'Le cabinet peut être rémunéré sous forme d’honoraires, de commissions ou d’une combinaison des deux selon la mission et les solutions retenues.',
  complaintsEmail: 'contact@dcp.com',
  complaintsHandlingDelay: 'Deux mois maximum à compter de la réception de la réclamation, sauf réglementation particulière plus favorable.',
  headOfficeAddress: '',
}

function getTodayForReport(): string {
  return new Date().toLocaleDateString('fr-FR')
}

function getScenarioLabel(key: ScenarioKey | undefined): string {
  switch (key) {
    case 'secure': return 'Sécurisation'
    case 'balanced': return 'Équilibre patrimonial'
    case 'growth': return 'Retraite & Optimisation'
    default: return 'À confirmer'
  }
}

function toOptionalSafeNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined
  const parsed = toSafeNumber(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function normalizeText(value: unknown) {
  return String(value ?? '').trim().toLowerCase()
}

function normalizeAssetEnvelopeLabel(asset: any) {
  const label = normalizeText(asset?.label)
  const envelopeType = normalizeText(asset?.envelopeType)
  const assetType = normalizeText(asset?.assetType)

  if (
    label.includes('assurance vie') ||
    label.includes('assurance-vie') ||
    envelopeType.includes('assurance vie') ||
    envelopeType.includes('assurance-vie') ||
    label === 'av' ||
    envelopeType === 'av'
  ) return 'assurance vie'

  if (label === 'pea' || label.includes('pea') || envelopeType.includes('pea')) return 'pea'
  if (label.includes('per') || envelopeType.includes('per')) return 'per'
  if (label.includes('compte titres') || label.includes('compte-titres') || label.includes('cto') || envelopeType.includes('cto')) return 'compte titres'
  if (label.includes('capitalisation') || envelopeType.includes('capitalisation')) return 'contrat de capitalisation'
  if (label.includes('scpi') || envelopeType.includes('scpi')) return 'scpi'
  if (label.includes('trésorerie') || label.includes('tresorerie') || label.includes('livret')) return 'trésorerie/livret'
  if (assetType.includes('immobilier')) return 'immobilier direct'

  return String(asset?.label || asset?.envelopeType || asset?.assetType || 'Actif existant')
    .trim()
    .toLowerCase()
}

function sanitizeAllocationLines(lines: AllocationLine[] | undefined | null): AllocationLine[] {
  return (lines ?? []).map((line, index) => ({
    id: line.id || `allocation-${index + 1}`,
    envelope: String(line.envelope || 'Enveloppe à préciser'),
    initialPercent: toSafeNumber(line.initialPercent),
    euroAmount: toSafeNumber(line.euroAmount),
    monthlyPercent: toSafeNumber(line.monthlyPercent),
    monthlyEuroAmount: toSafeNumber(line.monthlyEuroAmount),
    securePercent: toSafeNumber(line.securePercent),
    ucPercent: toSafeNumber(line.ucPercent),
    initialSecurePercent: toOptionalSafeNumber(line.initialSecurePercent),
    initialUcPercent: toOptionalSafeNumber(line.initialUcPercent),
    monthlySecurePercent: toOptionalSafeNumber(line.monthlySecurePercent),
    monthlyUcPercent: toOptionalSafeNumber(line.monthlyUcPercent),
  }))
}

function computeAllocationTotals(lines: AllocationLine[]): ReportAllocationTotals {
  const initialTotal = lines.reduce((sum, line) => sum + toSafeNumber(line.euroAmount), 0)
  const monthlyTotal = lines.reduce((sum, line) => sum + toSafeNumber(line.monthlyEuroAmount), 0)
  const secureInitial = lines.reduce((sum, line) => sum + toSafeNumber(line.euroAmount) * (toSafeNumber(line.initialSecurePercent ?? line.securePercent) / 100), 0)
  const ucInitial = lines.reduce((sum, line) => sum + toSafeNumber(line.euroAmount) * (toSafeNumber(line.initialUcPercent ?? line.ucPercent) / 100), 0)
  const secureMonthly = lines.reduce((sum, line) => sum + toSafeNumber(line.monthlyEuroAmount) * (toSafeNumber(line.monthlySecurePercent ?? line.securePercent) / 100), 0)
  const ucMonthly = lines.reduce((sum, line) => sum + toSafeNumber(line.monthlyEuroAmount) * (toSafeNumber(line.monthlyUcPercent ?? line.ucPercent) / 100), 0)

  return {
    initialTotal,
    monthlyTotal,
    secureInitial,
    ucInitial,
    secureMonthly,
    ucMonthly,
    secureInitialPct: initialTotal > 0 ? Math.round((secureInitial / initialTotal) * 100) : 0,
    ucInitialPct: initialTotal > 0 ? Math.round((ucInitial / initialTotal) * 100) : 0,
    secureMonthlyPct: monthlyTotal > 0 ? Math.round((secureMonthly / monthlyTotal) * 100) : 0,
    ucMonthlyPct: monthlyTotal > 0 ? Math.round((ucMonthly / monthlyTotal) * 100) : 0,
  }
}

function buildDiagnosticBlocks(input: { netWorth: number; selectedSavings: number; emergencyMonths: number; tmi: number; riskProfile: string }): ReportDiagnosticBlock[] {
  return [
    {
      title: 'Structurer',
      text: input.netWorth > 0
        ? 'Le patrimoine présente une base exploitable qui mérite une structuration cohérente avec l’objectif poursuivi.'
        : 'La priorité consiste à structurer progressivement la situation patrimoniale autour d’un cadre simple et lisible.',
    },
    {
      title: 'Protéger',
      text: input.emergencyMonths < 6
        ? 'La réserve de sécurité apparaît encore perfectible. Il convient de préserver un niveau de liquidité suffisant avant d’accentuer la prise de risque.'
        : 'Le niveau de réserve semble offrir une base de protection correcte à ce stade.',
    },
    {
      title: 'Élever',
      text: input.selectedSavings > 0
        ? `La capacité d’épargne retenue permet d’envisager une stratégie progressive. Avec une TMI de ${input.tmi} % et un profil ${String(input.riskProfile).toLowerCase()}, les leviers patrimoniaux peuvent être séquencés.`
        : 'Le potentiel d’élévation patrimoniale doit rester prudent tant que la capacité d’épargne n’est pas pleinement validée.',
    },
  ]
}

function buildActionPlan(): ReportActionStep[] {
  return [
    { index: 1, title: 'Valider la stratégie', text: 'Confirmer le scénario retenu, le rythme de mise en place et le niveau de liquidité cible.' },
    { index: 2, title: 'Arbitrer les enveloppes', text: 'Déterminer les enveloppes à ouvrir, renforcer ou mobiliser selon l’objectif patrimonial.' },
    { index: 3, title: 'Préparer la mise en œuvre', text: 'Rassembler les pièces, finaliser les documents réglementaires et planifier le suivi.' },
  ]
}

function buildInvestorProfile(discovery: any) {
  const score = toSafeNumber(getRiskScore(discovery))
  return {
    score,
    profile: String(getResolvedRiskProfile(discovery) ?? 'Non renseigné'),
    items: [
      { label: 'Horizon accepté', value: String(discovery?.objectives?.horizonTolerance ?? 'Non renseigné') },
      { label: 'Connaissance marchés', value: String(discovery?.objectives?.marketKnowledge ?? 'Non renseigné') },
      { label: 'Expérience investissement', value: String(discovery?.objectives?.investmentExperience ?? 'Non renseigné') },
      { label: 'Réaction à la baisse', value: String(discovery?.objectives?.drawdownReaction ?? 'Non renseigné') },
      { label: 'Capacité de perte', value: String(discovery?.objectives?.lossCapacity ?? 'Non renseigné') },
      { label: 'Stabilité du capital', value: String(discovery?.objectives?.capitalStabilityNeed ?? 'Non renseigné') },
    ],
  }
}

function normalizeNeed(value: unknown) {
  const text = String(value ?? '').trim()
  return text || 'Non renseigné'
}

function buildAssetsBreakdown(discovery: any): ReportBreakdownLine[] {
  return (discovery?.assets ?? [])
    .filter((line: any) => toSafeNumber(line.amount) > 0)
    .map((line: any, index: number) => ({
      id: line.id || `asset-${index + 1}`,
      label: String(line.label || line.envelopeType || 'Actif'),
      family: String(line.category || 'Autre'),
      amount: toSafeNumber(line.amount),
      institution: String(line.institution || ''),
      comment: String(line.comment || ''),
    }))
    .sort((a: ReportBreakdownLine, b: ReportBreakdownLine) => b.amount - a.amount)
}

function buildLiabilitiesBreakdown(discovery: any): ReportBreakdownLine[] {
  return (discovery?.liabilities ?? [])
    .filter((line: any) => toSafeNumber(line.outstandingCapital) > 0)
    .map((line: any, index: number) => ({
      id: line.id || `liability-${index + 1}`,
      label: String(line.label || line.debtType || 'Passif'),
      family: String(line.debtType || 'Autre'),
      amount: toSafeNumber(line.outstandingCapital),
      institution: '',
      comment: String(line.comment || ''),
    }))
    .sort((a: ReportBreakdownLine, b: ReportBreakdownLine) => b.amount - a.amount)
}

function buildExistingEnvelopeUses(discovery: any): ReportExistingEnvelopeUseLine[] {
  const usages = Array.isArray(discovery?.investmentProject?.existingEnvelopeUsages)
    ? discovery.investmentProject.existingEnvelopeUsages
    : []

  const assets = Array.isArray(discovery?.assets) ? discovery.assets : []
  const assetIndex = new Map<string, number>()

  for (const asset of assets) {
    const key = normalizeAssetEnvelopeLabel(asset)
    const amount = toSafeNumber(asset.amount)
    if (amount > 0) assetIndex.set(key, (assetIndex.get(key) || 0) + amount)
  }

  return usages
    .filter((usage: any) => usage?.selected)
    .map((usage: any, index: number) => {
      const normalizedLabel = normalizeText(usage.envelopeName || usage.label || `enveloppe ${index + 1}`)
      const currentAmount = toSafeNumber(assetIndex.get(normalizedLabel) || 0)
      const useMode: 'full' | 'partial' = usage?.useMode === 'full' ? 'full' : 'partial'
      const amountUsed = toSafeNumber(usage?.amountUsed)
      const mobilizedAmount = useMode === 'full'
        ? currentAmount
        : Math.max(0, Math.min(currentAmount || amountUsed, amountUsed))
      const remainingAmount = Math.max(0, currentAmount - mobilizedAmount)
      const mobilizedPercent = currentAmount > 0 ? Math.round((mobilizedAmount / currentAmount) * 100) : 0

      const decision =
        mobilizedAmount <= 0
          ? 'Conservée'
          : mobilizedPercent < 50
            ? 'Mobilisation partielle'
            : 'Mobilisation majoritaire'

      const rationale =
        mobilizedAmount <= 0
          ? 'Enveloppe sélectionnée dans le projet mais non encore mobilisée financièrement.'
          : remainingAmount > 0
            ? 'Une partie de l’enveloppe reste en place après mobilisation, ce qui permet de ne pas la vider intégralement.'
            : 'L’enveloppe est entièrement ou quasi entièrement mobilisée pour contribuer à la mise en place initiale.'

      return {
        id: usage.id || `existing-envelope-${index + 1}`,
        label: String(usage.envelopeName || usage.label || `Enveloppe ${index + 1}`),
        currentAmount,
        mobilizedAmount,
        remainingAmount,
        mobilizedPercent,
        useMode,
        decision,
        rationale,
      }
    })
}

export function buildReportData(args: { client: any; discovery: any; storedScenarioChoice?: StoredScenarioChoice | null; cabinetSettings?: CabinetDocumentConfig | null }): ReportData {
  const { client, discovery, storedScenarioChoice, cabinetSettings } = args
  const safeDiscovery = discovery ?? {}
  const displayName = `${safeDiscovery?.mainPerson?.firstName ?? ''} ${safeDiscovery?.mainPerson?.lastName ?? ''}`.trim() || client?.fullName || 'Client'
  const totalAssets = toSafeNumber(getTotalAssets(safeDiscovery?.assets ?? []))
  const totalLiabilities = toSafeNumber(getTotalLiabilitiesCapital(safeDiscovery))
  const selectedIncome = toSafeNumber(getSelectedHouseholdIncome(safeDiscovery))
  const selectedCharges = toSafeNumber(getSelectedCharges(safeDiscovery))
  const selectedSavings = toSafeNumber(getSelectedSavingsCapacity(safeDiscovery))
  const remainingToLive = toSafeNumber(getRemainingToLive(safeDiscovery))
  const emergencyMonths = toSafeNumber(getEmergencyFundMonths(safeDiscovery))
  const taxParts = toSafeNumber(getResolvedTaxParts(safeDiscovery))
  const tmi = toSafeNumber(getResolvedTmi(safeDiscovery))
  const riskProfile = getResolvedRiskProfile(safeDiscovery)
  const recommendedScenarioKey = storedScenarioChoice?.recommendedKey
  const selectedScenarioKey = storedScenarioChoice?.selectedKey
  const recommendedScenarioLabel = getScenarioLabel(recommendedScenarioKey)
  const selectedScenarioLabel = getScenarioLabel(selectedScenarioKey)
  const initialAmount = selectedScenarioKey && storedScenarioChoice ? toSafeNumber(storedScenarioChoice.adjustedInitialByKey?.[selectedScenarioKey]) : 0
  const monthlyAmount = selectedScenarioKey && storedScenarioChoice ? toSafeNumber(storedScenarioChoice.adjustedMonthlyByKey?.[selectedScenarioKey]) : 0
  const allocationLines = selectedScenarioKey && storedScenarioChoice ? sanitizeAllocationLines(storedScenarioChoice.allocationsByKey?.[selectedScenarioKey]) : []
  const allocationTotals = computeAllocationTotals(allocationLines)
  const objective = safeDiscovery?.investmentProject?.projectGoal || safeDiscovery?.objectives?.mainObjective || 'À préciser'
  const secondaryObjective = safeDiscovery?.investmentProject?.projectSecondaryGoal || safeDiscovery?.objectives?.secondaryObjective || 'Non précisé'
  const horizon = safeDiscovery?.investmentProject?.targetAvailabilityHorizon ?? safeDiscovery?.objectives?.horizonYears ?? 'À préciser'

  const suitability = buildSuitability({
    riskProfile,
    tmi: `${tmi} %`,
    emergencyMonths,
    debtRatio: selectedIncome > 0 ? Math.round((selectedCharges / selectedIncome) * 100) : 0,
    realEstateWeight: 0,
    selectedSavings,
    baseInitialCapital: initialAmount,
    baseMonthlyContribution: monthlyAmount || selectedSavings,
    objective: String(objective),
    secondaryObjective: String(secondaryObjective),
    fundingMode: safeDiscovery?.investmentProject?.fundingMode,
    investingMode: safeDiscovery?.investmentProject?.investingMode,
    hasInitialLumpSum: Boolean(initialAmount > 0),
    hasMonthlyContribution: Boolean((monthlyAmount || selectedSavings) > 0),
    liquidityNeed: safeDiscovery?.investmentProject?.liquidityNeed === 'Très élevé' ? 'high' : safeDiscovery?.investmentProject?.liquidityNeed === 'Faible' ? 'low' : 'medium',
    flexibilityNeed: 'medium',
    illiquidityTolerance: 'medium',
    investmentHorizonYears: typeof horizon === 'number' ? horizon : toSafeNumber(horizon),
  })

  return {
    client: {
      id: String(client?.id ?? ''),
      fullName: displayName,
      firstName: safeDiscovery?.mainPerson?.firstName ?? client?.firstName,
      lastName: safeDiscovery?.mainPerson?.lastName ?? client?.lastName,
      reportDate: getTodayForReport(),
    },
    cabinet: { ...defaultCabinet, ...(cabinetSettings ?? {}) },
    summary: {
      totalAssets,
      totalLiabilities,
      netWorth: totalAssets - totalLiabilities,
      selectedIncome,
      selectedCharges,
      selectedSavings,
      remainingToLive,
      emergencyMonths,
      taxParts,
      tmi,
      riskProfile,
    },
    assetsBreakdown: buildAssetsBreakdown(safeDiscovery),
    liabilitiesBreakdown: buildLiabilitiesBreakdown(safeDiscovery),
    investorProfile: buildInvestorProfile(safeDiscovery),
    project: {
      objective: String(objective),
      secondaryObjective: String(secondaryObjective),
      horizon,
      liquidityNeed: normalizeNeed(safeDiscovery?.investmentProject?.liquidityNeed ?? safeDiscovery?.objectives?.liquidityNeed),
      fundingMode: normalizeNeed(safeDiscovery?.investmentProject?.fundingMode),
      initialAmount,
      monthlyAmount,
    },
    suitability,
    strategy: {
      recommendedScenarioKey,
      selectedScenarioKey,
      recommendedScenarioLabel,
      selectedScenarioLabel,
      objective: String(objective),
      secondaryObjective: String(secondaryObjective),
      horizon,
      initialAmount,
      monthlyAmount,
      clientFollowsRecommendation: storedScenarioChoice?.clientFollowsRecommendation ?? true,
    },
    allocation: {
      lines: allocationLines,
      totals: allocationTotals,
    },
    existingEnvelopeUses: buildExistingEnvelopeUses(safeDiscovery),
    diagnostics: buildDiagnosticBlocks({ netWorth: totalAssets - totalLiabilities, selectedSavings, emergencyMonths, tmi, riskProfile }),
    actionPlan: buildActionPlan(),
  }
}
