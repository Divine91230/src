import type { AssetLine, DiscoveryFormState } from '../../pages/discovery/discovery.types'
import {
  getEmergencyFundMonths,
  getResolvedRiskProfile,
  getResolvedTmi,
  getSelectedCharges,
  getSelectedHouseholdIncome,
} from '../../pages/discovery/discovery.helpers'
import {
  buildAvoidPoints,
  buildEnvelopeAdvisorReading,
  buildEnvelopeClientImpact,
  buildEnvelopeComplianceJustification,
  buildEnvelopeDiagnosis,
  buildEnvelopeRecommendedAction,
  buildEnvelopeVigilancePoints,
  buildImprovePoints,
  buildPreserveStrengths,
  getEnvelopeDecisionLabel,
} from './envelopeReorgNarratives'
import {
  buildEnvelopeReorganizationScores,
  decideEnvelopeReorganization,
} from './envelopeReorgRules'
import type {
  EnvelopeReorganizationContext,
  EnvelopeReorganizationReview,
  EnvelopeReorganizationSummary,
  ExistingEnvelopeRecord,
  ExistingEnvelopeReorgType,
} from './envelopeReorg.types'

function mapAssetToReorgType(asset: AssetLine): ExistingEnvelopeReorgType {
  switch (asset.envelopeType) {
    case 'Assurance-vie':
      return 'ASSURANCE_VIE'
    case 'PEA':
      return 'PEA'
    case 'CTO':
      return 'CTO'
    case 'PER':
      return 'PER'
    case 'SCPI':
      return 'SCPI'
    case 'Compte courant':
    case 'Livret A':
    case 'LDDS':
    case 'LEP':
    case 'PEL':
    case 'Compte à terme':
    case 'Épargne salariale':
      return 'EPARGNE_BANCAIRE'
    default:
      return 'AUTRE'
  }
}

function inferLiquidity(asset: AssetLine): ExistingEnvelopeRecord['liquidityLevel'] {
  if (asset.category === 'Liquidités') return 'Élevée'
  if (asset.envelopeType === 'SCPI' || asset.envelopeType === 'PER') return 'Faible'
  return 'Intermédiaire'
}

function inferBeneficiaryClause(asset: AssetLine) {
  const text = String(asset.comment ?? '').toLowerCase()
  if (!text) return undefined
  if (text.includes('clause ok') || text.includes('beneficiaire a jour')) return true
  if (text.includes('clause ancienne') || text.includes('beneficiaire ancien')) return false
  return undefined
}

function inferScheduledPayments(asset: AssetLine) {
  const text = String(asset.comment ?? '').toLowerCase()
  if (!text) return undefined
  if (text.includes('versements programmes') || text.includes('versement programmé')) return true
  if (text.includes('sans versements programmes')) return false
  return undefined
}

function extractExistingEnvelopes(state: DiscoveryFormState): ExistingEnvelopeRecord[] {
  return (state.assets ?? [])
    .filter((asset) => asset.category !== 'Immobilier' && Number(asset.amount || 0) > 0)
    .map((asset) => ({
      id: `reorg-${asset.id}`,
      sourceAssetId: asset.id,
      label: asset.label || asset.envelopeType || 'Enveloppe existante',
      type: mapAssetToReorgType(asset),
      provider: asset.institution || undefined,
      institution: asset.institution || undefined,
      openingDate: undefined,
      taxSeniorityYears: undefined,
      balance: Number(asset.amount || 0),
      category: asset.category,
      envelopeType: asset.envelopeType,
      liquidityLevel: inferLiquidity(asset),
      available: asset.available,
      comment: asset.comment || undefined,
      beneficiaryClauseUpdated: inferBeneficiaryClause(asset),
      hasScheduledPayments: inferScheduledPayments(asset),
    }))
    .filter((item) => item.type !== 'AUTRE')
}

function buildContext(state: DiscoveryFormState): EnvelopeReorganizationContext {
  const income = getSelectedHouseholdIncome(state)
  const charges = getSelectedCharges(state)
  const debtRatio = income > 0 ? Math.round((charges / income) * 100) : 0

  return {
    riskProfile: getResolvedRiskProfile(state),
    objective: state.objectives?.mainObjective || 'À définir',
    secondaryObjective: state.objectives?.secondaryObjective || '',
    tmiLabel: String(getResolvedTmi(state)),
    emergencyMonths: getEmergencyFundMonths(state),
    debtRatio,
  }
}

function priorityFromDecision(decision: EnvelopeReorganizationReview['decision']): EnvelopeReorganizationReview['priorityLevel'] {
  if (decision === 'TRANSFER' || decision === 'REPLACE_PARTIAL' || decision === 'REPLACE_TOTAL') return 'Haute'
  if (decision === 'KEEP_REALLOCATE' || decision === 'ADD_COMPLEMENT' || decision === 'KEEP_STOP_PAYMENTS') return 'Moyenne'
  return 'Faible'
}

function groupReviews(reviews: EnvelopeReorganizationReview[]): EnvelopeReorganizationSummary {
  return {
    keep: reviews.filter((item) => item.decision === 'KEEP'),
    reallocate: reviews.filter((item) => item.decision === 'KEEP_REALLOCATE'),
    stopPayments: reviews.filter((item) => item.decision === 'KEEP_STOP_PAYMENTS'),
    transfer: reviews.filter((item) => item.decision === 'TRANSFER'),
    complement: reviews.filter((item) => item.decision === 'ADD_COMPLEMENT'),
    replace: reviews.filter((item) => item.decision === 'REPLACE_PARTIAL' || item.decision === 'REPLACE_TOTAL'),
    manual: reviews.filter((item) => item.decision === 'MANUAL_REVIEW'),
    totalEncours: reviews.reduce((sum, item) => sum + item.envelope.balance, 0),
    actionableCount: reviews.filter((item) => item.decision !== 'KEEP').length,
  }
}

export function buildEnvelopeReorganization(state: DiscoveryFormState) {
  const envelopes = extractExistingEnvelopes(state)
  const context = buildContext(state)

  const reviews = envelopes
    .map<EnvelopeReorganizationReview>((envelope) => {
      const scores = buildEnvelopeReorganizationScores(envelope, context)
      const decision = decideEnvelopeReorganization(envelope, context, scores)
      const statusLabel = getEnvelopeDecisionLabel(decision)

      return {
        envelope,
        scores,
        decision,
        statusLabel,
        diagnosis: buildEnvelopeDiagnosis(envelope, statusLabel, scores.globalScore),
        advisorReading: buildEnvelopeAdvisorReading(envelope, decision),
        vigilancePoints: buildEnvelopeVigilancePoints(envelope, decision),
        clientImpact: buildEnvelopeClientImpact(envelope, decision),
        complianceJustification: buildEnvelopeComplianceJustification(envelope, decision),
        recommendedAction: buildEnvelopeRecommendedAction(envelope, decision),
        preserveStrengths: buildPreserveStrengths(envelope, decision),
        improvePoints: buildImprovePoints(envelope, decision),
        avoidPoints: buildAvoidPoints(envelope, decision),
        priorityLevel: priorityFromDecision(decision),
      }
    })
    .sort((a, b) => {
      if (a.priorityLevel !== b.priorityLevel) {
        const order = { Haute: 0, Moyenne: 1, Faible: 2 }
        return order[a.priorityLevel] - order[b.priorityLevel]
      }
      return b.scores.globalScore - a.scores.globalScore
    })

  return {
    context,
    reviews,
    summary: groupReviews(reviews),
  }
}
