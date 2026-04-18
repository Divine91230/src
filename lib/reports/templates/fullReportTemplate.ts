import type { ReportData } from '../report.types'

export type FullReportSectionType =
  | 'header'
  | 'summary'
  | 'assetBreakdown'
  | 'liabilityBreakdown'
  | 'strategy'
  | 'allocation'
  | 'diagnostics'
  | 'recommendations'
  | 'actionPlan'

export type FullReportSection =
  | { type: 'header'; title: string; data: ReportData['client'] }
  | { type: 'summary'; title: string; data: ReportData['summary'] }
  | { type: 'assetBreakdown'; title: string; data: ReportData['assetsBreakdown'] }
  | { type: 'liabilityBreakdown'; title: string; data: ReportData['liabilitiesBreakdown'] }
  | { type: 'strategy'; title: string; data: ReportData['strategy'] }
  | { type: 'allocation'; title: string; data: ReportData['allocation'] }
  | { type: 'diagnostics'; title: string; data: ReportData['diagnostics'] }
  | { type: 'recommendations'; title: string; data: { paragraphs: string[] } }
  | { type: 'actionPlan'; title: string; data: ReportData['actionPlan'] }

export type FullReportTemplate = {
  kind: 'full_report'
  title: string
  fileName: string
  clientName: string
  reportDate: string
  sections: FullReportSection[]
}

function sanitizeFilePart(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
}

function toSafeString(value: unknown, fallback = '') {
  if (typeof value === 'string') return value.trim() || fallback
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return fallback
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(value || 0))
}

function formatHorizon(value: string | number) {
  if (typeof value === 'number' && Number.isFinite(value)) return `${value} ans`
  return toSafeString(value, 'À préciser')
}

function buildRecommendations(data: ReportData): string[] {
  const objective = toSafeString(data.strategy.objective, 'À préciser')
  const secondaryObjective = toSafeString(data.strategy.secondaryObjective, 'Non précisé')
  const selectedScenario = toSafeString(data.strategy.selectedScenarioLabel, 'À confirmer')
  const recommendedScenario = toSafeString(data.strategy.recommendedScenarioLabel, 'À confirmer')
  const horizon = formatHorizon(data.strategy.horizon)
  const riskProfile = toSafeString(data.summary.riskProfile, 'Non renseigné')
  const initialAmount = formatCurrency(data.strategy.initialAmount)
  const monthlyAmount = formatCurrency(data.strategy.monthlyAmount)
  const reserveMonths = Number(data.summary.emergencyMonths || 0).toFixed(1)

  const paragraphs = [
    `Le présent rapport a pour objet de restituer, dans un format cabinet plus narratif, la manière dont la situation patrimoniale actuelle peut être organisée au regard de l'objectif principal « ${objective} »${secondaryObjective !== 'Non précisé' ? ` et de l'objectif secondaire « ${secondaryObjective} »` : ''}.`,
    `La stratégie retenue s'inscrit dans le scénario « ${selectedScenario} », sur un horizon de ${horizon}, avec un profil de risque « ${riskProfile} ». Le rythme de mise en œuvre envisagé repose sur ${initialAmount} à l'initial puis ${monthlyAmount} par mois.`,
    `La réserve de sécurité actuellement estimée à ${reserveMonths} mois constitue un repère central : elle permet d'envisager une mise en œuvre progressive, à condition de conserver une cohérence durable entre liquidité, allocation et budget du foyer.`,
    `Le cabinet recommande une lecture séquencée du dossier : d'abord structurer les fondamentaux, ensuite protéger les équilibres, puis développer progressivement les leviers de valorisation et de diversification.`,
  ]

  if (data.strategy.clientFollowsRecommendation) {
    paragraphs.push(`Le scénario retenu par le client est aligné avec la recommandation initiale du cabinet (« ${recommendedScenario} »), ce qui renforce la cohérence d'ensemble de la restitution.`)
  } else {
    paragraphs.push(`Le scénario retenu par le client diffère de la recommandation initiale du cabinet (« ${recommendedScenario} »). Cet écart doit être conservé comme un élément de traçabilité du conseil.`)
  }

  paragraphs.push(`Les tableaux et graphiques présentés ci-après ont vocation à soutenir la lecture du cabinet ; ils ne remplacent pas l'analyse rédigée, mais l'illustrent.`)
  return paragraphs
}

export function buildFullReportTemplate(data: ReportData): FullReportTemplate {
  const clientName = toSafeString(data.client.fullName, 'Client')
  const reportDate = toSafeString(data.client.reportDate, 'Rapport')
  const safeClientName = sanitizeFilePart(clientName)
  const safeDate = sanitizeFilePart(reportDate)

  return {
    kind: 'full_report',
    title: 'Rapport patrimonial complet',
    fileName: `DCP_Rapport_Complet_${safeClientName}_${safeDate}.pdf`,
    clientName,
    reportDate,
    sections: [
      { type: 'header', title: 'Informations dossier', data: data.client },
      { type: 'summary', title: 'Lecture patrimoniale', data: data.summary },
      { type: 'assetBreakdown', title: 'Avoirs détaillés', data: data.assetsBreakdown },
      { type: 'liabilityBreakdown', title: 'Passifs détaillés', data: data.liabilitiesBreakdown },
      { type: 'strategy', title: 'Stratégie retenue', data: data.strategy },
      { type: 'allocation', title: 'Allocation cible', data: data.allocation },
      { type: 'diagnostics', title: 'Lecture du cabinet', data: data.diagnostics },
      { type: 'recommendations', title: 'Restitution rédigée', data: { paragraphs: buildRecommendations(data) } },
      { type: 'actionPlan', title: 'Plan d’action', data: data.actionPlan },
    ],
  }
}
