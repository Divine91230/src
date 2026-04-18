import type {
  EnvelopeReorganizationContext,
  EnvelopeReorganizationDecision,
  EnvelopeReorganizationScores,
  ExistingEnvelopeRecord,
} from './envelopeReorg.types'

function clamp(value: number, min = 0, max = 10) {
  return Math.max(min, Math.min(max, value))
}

function parseTmiLabel(label: string) {
  const match = String(label ?? '').replace('%', '').trim()
  const value = Number(match)
  return Number.isFinite(value) ? value : 0
}

function normalize(value: string | undefined) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

function objectiveMatchesRetirement(objective: string) {
  const text = normalize(objective)
  return text.includes('retraite') || text.includes('fiscal')
}

function objectiveMatchesDiversification(objective: string) {
  const text = normalize(objective)
  return text.includes('divers') || text.includes('capital') || text.includes('valor')
}

function objectiveMatchesLiquidity(objective: string) {
  return normalize(objective).includes('liquid')
}

function yearsFromOpening(openingDate?: string) {
  if (!openingDate) return undefined
  const date = new Date(openingDate)
  if (Number.isNaN(date.getTime())) return undefined
  const today = new Date()
  let years = today.getFullYear() - date.getFullYear()
  const monthDiff = today.getMonth() - date.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < date.getDate())) years -= 1
  return Math.max(0, years)
}

function inferFeePenalty(envelope: ExistingEnvelopeRecord) {
  const text = normalize(envelope.comment)
  if (text.includes('frais eleves') || text.includes('frais élevés') || text.includes('charge')) return -3
  if (text.includes('frais moderes') || text.includes('frais modérés')) return 1
  return 0
}

function inferUniverseQuality(envelope: ExistingEnvelopeRecord) {
  const text = normalize(envelope.comment)
  if (text.includes('supports faibles') || text.includes('univers faible')) return -2
  if (text.includes('bons supports') || text.includes('univers riche')) return 2
  return 0
}

export function buildEnvelopeReorganizationScores(
  envelope: ExistingEnvelopeRecord,
  context: EnvelopeReorganizationContext,
): EnvelopeReorganizationScores {
  const age = envelope.taxSeniorityYears ?? yearsFromOpening(envelope.openingDate)
  const tmi = parseTmiLabel(context.tmiLabel)
  const objective = normalize(context.objective)
  const profile = context.riskProfile
  const feePenalty = inferFeePenalty(envelope)
  const universeQuality = inferUniverseQuality(envelope)

  let fiscalQuality = 5
  let financialQuality = 5
  let costQuality = 5 + feePenalty
  let liquidityQuality =
    envelope.liquidityLevel === 'Élevée'
      ? 9
      : envelope.liquidityLevel === 'Intermédiaire'
        ? 6
        : 3
  let suitabilityProfile = 5
  let suitabilityObjective = 5
  let conservationRelevance = 5
  let transferRelevance = 2
  let complementRelevance = 2

  if (envelope.type === 'ASSURANCE_VIE') {
    fiscalQuality += age && age >= 8 ? 3 : 1
    financialQuality += 1 + universeQuality
    conservationRelevance += age && age >= 8 ? 3 : 1
    complementRelevance += universeQuality < 0 || feePenalty < 0 ? 3 : 1
    transferRelevance += feePenalty < 0 && (age ?? 0) < 8 ? 2 : 0
    if (profile === 'Prudent') suitabilityProfile += 1
    if (objectiveMatchesDiversification(objective) || objective.includes('transmis')) suitabilityObjective += 2
    if (envelope.beneficiaryClauseUpdated === false) conservationRelevance -= 1
  }

  if (envelope.type === 'PEA') {
    fiscalQuality += age && age >= 5 ? 3 : 1
    financialQuality += 2 + universeQuality
    transferRelevance += feePenalty < 0 ? 3 : 1
    if (profile === 'Prudent') suitabilityProfile -= 2
    if (profile === 'Équilibré') suitabilityProfile += 1
    if (objectiveMatchesDiversification(objective)) suitabilityObjective += 2
    conservationRelevance += age && age >= 5 ? 2 : 0
  }

  if (envelope.type === 'CTO') {
    fiscalQuality -= 1
    financialQuality += 1 + universeQuality
    transferRelevance += feePenalty < 0 ? 2 : 0
    complementRelevance += objectiveMatchesLiquidity(objective) ? 1 : 0
    if (profile === 'Prudent') suitabilityProfile -= 2
    if (objectiveMatchesLiquidity(objective)) suitabilityObjective += 1
  }

  if (envelope.type === 'PER') {
    fiscalQuality += tmi >= 30 ? 3 : tmi >= 11 ? 1 : -2
    liquidityQuality -= 3
    suitabilityObjective += objectiveMatchesRetirement(context.objective) ? 3 : -1
    complementRelevance += objectiveMatchesRetirement(context.objective) && tmi >= 30 ? 3 : 0
    transferRelevance += feePenalty < 0 ? 1 : 0
    suitabilityProfile += profile === 'Prudent' ? -1 : 1
    conservationRelevance += objectiveMatchesRetirement(context.objective) ? 2 : 0
  }

  if (envelope.type === 'SCPI') {
    fiscalQuality += 1
    financialQuality += 1
    liquidityQuality -= 4
    suitabilityProfile += profile === 'Prudent' ? -2 : 1
    suitabilityObjective += objective.includes('revenu') || objective.includes('immobilier') ? 2 : 0
    if (context.emergencyMonths < 6) conservationRelevance -= 2
    if (context.debtRatio > 35) conservationRelevance -= 1
  }

  if (envelope.type === 'EPARGNE_BANCAIRE') {
    financialQuality -= 1
    liquidityQuality += 4
    suitabilityObjective += objectiveMatchesLiquidity(objective) ? 2 : 0
    complementRelevance += context.emergencyMonths >= 9 && envelope.balance > 15000 ? 2 : 0
    conservationRelevance += context.emergencyMonths < 6 ? 2 : 0
  }

  if (envelope.available === false) liquidityQuality -= 2
  if (envelope.hasScheduledPayments) conservationRelevance += 1
  if (envelope.balance <= 5000) conservationRelevance -= 1

  if (
    context.riskProfile === 'Prudent' &&
    ['PEA', 'CTO', 'SCPI'].includes(envelope.type)
  ) {
    suitabilityProfile -= 2
    conservationRelevance -= 1
  }

  fiscalQuality = clamp(fiscalQuality)
  financialQuality = clamp(financialQuality)
  costQuality = clamp(costQuality)
  liquidityQuality = clamp(liquidityQuality)
  suitabilityProfile = clamp(suitabilityProfile)
  suitabilityObjective = clamp(suitabilityObjective)
  conservationRelevance = clamp(conservationRelevance)
  transferRelevance = clamp(transferRelevance)
  complementRelevance = clamp(complementRelevance)

  const globalScore = Math.round(
    (
      fiscalQuality +
      financialQuality +
      costQuality +
      liquidityQuality +
      suitabilityProfile +
      suitabilityObjective +
      conservationRelevance
    ) / 7,
  )

  return {
    fiscalQuality,
    financialQuality,
    costQuality,
    liquidityQuality,
    suitabilityProfile,
    suitabilityObjective,
    conservationRelevance,
    transferRelevance,
    complementRelevance,
    globalScore: clamp(globalScore),
  }
}

export function decideEnvelopeReorganization(
  envelope: ExistingEnvelopeRecord,
  context: EnvelopeReorganizationContext,
  scores: EnvelopeReorganizationScores,
): EnvelopeReorganizationDecision {
  const tmi = parseTmiLabel(context.tmiLabel)
  const age = envelope.taxSeniorityYears ?? yearsFromOpening(envelope.openingDate)

  if (envelope.type === 'ASSURANCE_VIE') {
    if ((age ?? 0) >= 8 && scores.costQuality >= 5 && scores.financialQuality >= 6) return 'KEEP'
    if ((age ?? 0) >= 8 && (scores.costQuality < 5 || scores.financialQuality < 6)) return 'KEEP_REALLOCATE'
    if ((age ?? 0) < 8 && scores.transferRelevance >= 6 && scores.globalScore <= 4) return 'REPLACE_PARTIAL'
    return 'ADD_COMPLEMENT'
  }

  if (envelope.type === 'PEA') {
    if ((age ?? 0) >= 5 && scores.costQuality >= 5 && scores.globalScore >= 7) return 'KEEP'
    if ((age ?? 0) >= 5 && scores.transferRelevance >= 5) return 'TRANSFER'
    if (scores.globalScore >= 5) return 'KEEP_REALLOCATE'
    return 'MANUAL_REVIEW'
  }

  if (envelope.type === 'CTO') {
    if (scores.globalScore >= 7 && context.riskProfile !== 'Prudent') return 'KEEP'
    if (scores.globalScore >= 5) return 'KEEP_REALLOCATE'
    return 'KEEP_STOP_PAYMENTS'
  }

  if (envelope.type === 'PER') {
    if (tmi >= 30 && objectiveMatchesRetirement(context.objective) && scores.globalScore >= 6) return 'KEEP'
    if (tmi < 11 || context.emergencyMonths < 4 || context.riskProfile === 'Prudent') return 'KEEP_STOP_PAYMENTS'
    if (scores.transferRelevance >= 6) return 'TRANSFER'
    return 'MANUAL_REVIEW'
  }

  if (envelope.type === 'SCPI') {
    if (context.emergencyMonths < 6 || context.riskProfile === 'Prudent') return 'KEEP_STOP_PAYMENTS'
    if (scores.globalScore >= 6) return 'KEEP'
    return 'MANUAL_REVIEW'
  }

  if (envelope.type === 'EPARGNE_BANCAIRE') {
    if (context.emergencyMonths >= 9 && envelope.balance > 15000) return 'KEEP_REALLOCATE'
    return 'KEEP'
  }

  return 'MANUAL_REVIEW'
}