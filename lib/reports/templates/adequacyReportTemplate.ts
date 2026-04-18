import type { ReportData } from '../report.types'

export type AdequacySection =
  | { type: 'header'; title: string; data: ReportData['client'] }
  | { type: 'summary'; title: string; data: ReportData['summary'] }
  | { type: 'strategy'; title: string; data: ReportData['strategy'] }
  | { type: 'adequacy'; title: string; data: { paragraphs: string[] } }
  | { type: 'vigilance'; title: string; data: { bullets: string[] } }

export type AdequacyReportTemplate = {
  kind: 'adequacy_report'
  title: string
  fileName: string
  clientName: string
  reportDate: string
  sections: AdequacySection[]
}

function sanitizeFilePart(value: string) {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
}
function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(Number(value || 0))
}
function formatHorizon(value: string | number) {
  return typeof value === 'number' ? `${value} ans` : String(value || 'À préciser')
}

function buildAdequacyParagraphs(data: ReportData): string[] {
  return [
    'L’analyse d’adéquation est réalisée à partir des informations patrimoniales, budgétaires et fiscales retenues au jour du document, ainsi que du profil investisseur, du projet d’investissement et du scénario sélectionné.',
    `Le profil investisseur ressort à « ${data.investorProfile.profile} » pour un score de ${data.investorProfile.score}/32. Les critères les plus structurants portent sur l’horizon accepté, l’expérience d’investissement, la réaction à une baisse de marché et la capacité à supporter la perte.`,
    `Le projet d’investissement retient comme objectif principal « ${data.project.objective} »${data.project.secondaryObjective && data.project.secondaryObjective !== 'Non précisé' ? `, avec un objectif secondaire « ${data.project.secondaryObjective} »` : ''}, sur un horizon de ${formatHorizon(data.project.horizon)} et avec un besoin de liquidité évalué à « ${data.project.liquidityNeed} ».`,
    `Le scénario analysé, « ${data.strategy.selectedScenarioLabel} », repose sur une mise en place de ${formatCurrency(data.project.initialAmount)} à l’initial et ${formatCurrency(data.project.monthlyAmount)} par mois, avec une capacité d’épargne retenue de ${formatCurrency(data.summary.selectedSavings)}.`,
    `La recommandation est appréciée à la lumière de la situation budgétaire, du niveau de réserve (${data.summary.emergencyMonths.toFixed(1)} mois), de la tolérance au risque et de l’horizon déclaré. ${data.suitability.summary}`,
  ]
}

function buildVigilanceBullets(data: ReportData): string[] {
  const bullets = [...data.suitability.reserves]
  if (data.summary.emergencyMonths < 6) bullets.push('Le niveau de réserve de sécurité reste à surveiller avant d’allonger excessivement la durée d’immobilisation des capitaux.')
  if (!data.strategy.clientFollowsRecommendation) bullets.push('Le client ne suit pas strictement la recommandation initiale du cabinet : la justification d’adéquation doit être renforcée.')
  if (data.strategy.monthlyAmount > data.summary.selectedSavings && data.summary.selectedSavings > 0) bullets.push('Le rythme de versement mensuel envisagé doit être confirmé au regard de la capacité d’épargne retenue.')
  bullets.push('Toute évolution significative de la situation personnelle, familiale, professionnelle, fiscale ou patrimoniale devra conduire à une réévaluation de l’adéquation.')
  return bullets
}

export function buildAdequacyReportTemplate(data: ReportData): AdequacyReportTemplate {
  const safeClientName = sanitizeFilePart(data.client.fullName || 'Client')
  const safeDate = sanitizeFilePart(data.client.reportDate || 'Rapport')
  return {
    kind: 'adequacy_report',
    title: 'Rapport d’adéquation',
    fileName: `DCP_Rapport_Adequation_${safeClientName}_${safeDate}.pdf`,
    clientName: data.client.fullName,
    reportDate: data.client.reportDate,
    sections: [
      { type: 'header', title: 'Informations dossier', data: data.client },
      { type: 'summary', title: 'Situation retenue', data: data.summary },
      { type: 'strategy', title: 'Stratégie analysée', data: data.strategy },
      { type: 'adequacy', title: 'Analyse d’adéquation rédigée', data: { paragraphs: buildAdequacyParagraphs(data) } },
      { type: 'vigilance', title: 'Points de vigilance', data: { bullets: buildVigilanceBullets(data) } },
    ],
  }
}
