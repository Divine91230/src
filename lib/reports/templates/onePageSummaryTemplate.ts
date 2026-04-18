import type { ReportData } from '../report.types'

export type OnePageSummarySectionType =
  | 'header'
  | 'summary'
  | 'assetBreakdown'
  | 'strategy'
  | 'keyMessages'

export type OnePageSummarySection =
  | { type: 'header'; title: string; data: ReportData['client'] }
  | { type: 'summary'; title: string; data: ReportData['summary'] }
  | { type: 'assetBreakdown'; title: string; data: ReportData['assetsBreakdown'] }
  | { type: 'strategy'; title: string; data: ReportData['strategy'] }
  | { type: 'keyMessages'; title: string; data: { messages: string[] } }

export type OnePageSummaryTemplate = {
  kind: 'one_page_summary'
  title: string
  fileName: string
  clientName: string
  reportDate: string
  sections: OnePageSummarySection[]
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

function buildKeyMessages(data: ReportData): string[] {
  const selectedScenario = toSafeString(data.strategy.selectedScenarioLabel, 'À confirmer')
  const objective = toSafeString(data.strategy.objective, 'À préciser')
  const riskProfile = toSafeString(data.summary.riskProfile, 'Non renseigné')
  const reserveMonths = Number(data.summary.emergencyMonths || 0).toFixed(1)

  return [
    `Le patrimoine net s'établit à ${formatCurrency(data.summary.netWorth)}, avec des revenus retenus de ${formatCurrency(data.summary.selectedIncome)} et une capacité d'épargne de ${formatCurrency(data.summary.selectedSavings)}.`,
    `Le dossier s'inscrit aujourd'hui dans une logique de ${selectedScenario.toLowerCase()}, cohérente avec l'objectif principal « ${objective} » et le profil « ${riskProfile} ».`,
    `La mise en œuvre retenue repose sur ${formatCurrency(data.strategy.initialAmount)} à l'initial puis ${formatCurrency(data.strategy.monthlyAmount)} par mois, dans un cadre qui reste compatible avec une réserve de sécurité de ${reserveMonths} mois.`,
  ]
}

export function buildOnePageSummaryTemplate(data: ReportData): OnePageSummaryTemplate {
  const clientName = toSafeString(data.client.fullName, 'Client')
  const reportDate = toSafeString(data.client.reportDate, 'Rapport')
  const safeClientName = sanitizeFilePart(clientName)
  const safeDate = sanitizeFilePart(reportDate)

  return {
    kind: 'one_page_summary',
    title: 'Synthèse patrimoniale',
    fileName: `DCP_Synthese_1_Page_${safeClientName}_${safeDate}.pdf`,
    clientName,
    reportDate,
    sections: [
      { type: 'header', title: 'Informations dossier', data: data.client },
      { type: 'summary', title: 'Lecture patrimoniale', data: data.summary },
      { type: 'assetBreakdown', title: 'Photographie des avoirs', data: data.assetsBreakdown.slice(0, 6) },
      { type: 'strategy', title: 'Stratégie retenue', data: data.strategy },
      { type: 'keyMessages', title: 'Lecture du cabinet', data: { messages: buildKeyMessages(data) } },
    ],
  }
}
