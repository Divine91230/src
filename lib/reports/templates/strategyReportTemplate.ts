import type { ReportData } from '../report.types'

export type StrategyReportSection =
  | { type: 'header'; title: string; data: ReportData['client'] }
  | { type: 'summary'; title: string; data: ReportData['summary'] }
  | { type: 'assetBreakdown'; title: string; data: ReportData['assetsBreakdown'] }
  | { type: 'strategy'; title: string; data: ReportData['strategy'] }
  | { type: 'allocation'; title: string; data: ReportData['allocation'] }
  | { type: 'existingEnvelopeUses'; title: string; data: ReportData['existingEnvelopeUses'] }
  | { type: 'recommendations'; title: string; data: { paragraphs: string[] } }
  | { type: 'actionPlan'; title: string; data: ReportData['actionPlan'] }

export type StrategyReportTemplate = {
  kind: 'strategy_report'
  title: string
  fileName: string
  clientName: string
  reportDate: string
  sections: StrategyReportSection[]
}

function sanitizeFilePart(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
}

function toSafeString(value: unknown, fallback = '') {
  if (typeof value === 'string') return value.trim() || fallback
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return fallback
}

function formatHorizon(value: string | number) {
  if (typeof value === 'number' && Number.isFinite(value)) return `${value} ans`
  return toSafeString(value, 'À préciser')
}

function buildRecommendationParagraphs(data: ReportData): string[] {
  const selectedScenario = toSafeString(data.strategy.selectedScenarioLabel, 'À confirmer')
  const recommendedScenario = toSafeString(data.strategy.recommendedScenarioLabel, 'À confirmer')
  const objective = toSafeString(data.strategy.objective, 'À préciser')
  const secondaryObjective = toSafeString(data.strategy.secondaryObjective, 'Non précisé')
  const horizon = formatHorizon(data.strategy.horizon)
  const riskProfile = toSafeString(data.summary.riskProfile, 'Non renseigné')
  const reserveMonths = Number(data.summary.emergencyMonths || 0).toFixed(1)
  const selectedExisting = data.existingEnvelopeUses.length

  return [
    `La stratégie retenue doit être lue comme une feuille de route patrimoniale et non comme une simple juxtaposition de pourcentages. Elle articule le scénario « ${selectedScenario} », l'objectif principal « ${objective} »${secondaryObjective !== 'Non précisé' ? `, l'objectif secondaire « ${secondaryObjective} »` : ''} et un horizon de ${horizon}.`,
    `Le profil de risque « ${riskProfile} » et la réserve de sécurité de ${reserveMonths} mois constituent les deux repères structurants de cette recommandation.`,
    `Le scénario recommandé par le cabinet est « ${recommendedScenario} ». ${data.strategy.clientFollowsRecommendation ? 'Le client est aligné avec cette recommandation.' : 'Le client retient une variante, ce qui suppose une justification renforcée du conseil.'}`,
    selectedExisting > 0
      ? `Le cabinet a en outre identifié ${selectedExisting} enveloppe${selectedExisting > 1 ? 's' : ''} existante${selectedExisting > 1 ? 's' : ''} mobilisée${selectedExisting > 1 ? 's' : ''} pour financer ou accompagner la mise en place de la stratégie.`
      : 'Aucune enveloppe existante n’est spécifiquement mobilisée dans le projet tel qu’il est actuellement renseigné.',
  ]
}

export function buildStrategyReportTemplate(data: ReportData): StrategyReportTemplate {
  const clientName = toSafeString(data.client.fullName, 'Client')
  const reportDate = toSafeString(data.client.reportDate, 'Rapport')
  const safeClientName = sanitizeFilePart(clientName)
  const safeDate = sanitizeFilePart(reportDate)

  return {
    kind: 'strategy_report',
    title: 'Rapport de stratégie',
    fileName: `DCP_Rapport_Strategie_${safeClientName}_${safeDate}.pdf`,
    clientName,
    reportDate,
    sections: [
      { type: 'header', title: 'Informations dossier', data: data.client },
      { type: 'summary', title: 'Synthèse de la situation', data: data.summary },
      { type: 'assetBreakdown', title: 'Avoirs patrimoniaux utiles à la stratégie', data: data.assetsBreakdown.slice(0, 8) },
      { type: 'strategy', title: 'Stratégie retenue', data: data.strategy },
      { type: 'allocation', title: 'Allocation cible', data: data.allocation },
      { type: 'existingEnvelopeUses', title: 'Enveloppes existantes mobilisées', data: data.existingEnvelopeUses },
      { type: 'recommendations', title: 'Lecture rédigée de la stratégie', data: { paragraphs: buildRecommendationParagraphs(data) } },
      { type: 'actionPlan', title: 'Plan d’action', data: data.actionPlan },
    ],
  }
}
