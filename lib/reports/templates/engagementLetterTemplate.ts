import type { ReportData } from '../report.types'

export type EngagementLetterSection =
  | { type: 'header'; title: string; data: ReportData['client'] }
  | { type: 'cabinet'; title: string; data: { cabinetName: string; advisorName: string; email: string } }
  | { type: 'mission'; title: string; data: { paragraphs: string[] } }
  | { type: 'fees'; title: string; data: { paragraphs: string[] } }
  | { type: 'terms'; title: string; data: { paragraphs: string[] } }
  | { type: 'signature'; title: string; data: { place: string; date: string } }

export type EngagementLetterTemplate = {
  kind: 'engagement_letter'
  title: string
  fileName: string
  clientName: string
  reportDate: string
  sections: EngagementLetterSection[]
}

function sanitizeFilePart(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')
}
function toSafeString(value: unknown, fallback = '') {
  if (typeof value === 'string') return value.trim() || fallback
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return fallback
}
function withFallback(value: unknown, fallback = 'À compléter') {
  return toSafeString(value, '') || fallback
}
function formatHorizon(value: string | number) {
  if (typeof value === 'number' && Number.isFinite(value)) return `${value} ans`
  return toSafeString(value, 'À préciser')
}
function buildMissionParagraphs(data: ReportData): string[] {
  const objective = toSafeString(data.strategy.objective, 'À préciser')
  const selectedScenario = toSafeString(data.strategy.selectedScenarioLabel, 'À confirmer')
  const horizon = formatHorizon(data.strategy.horizon)
  return [
    'La présente lettre de mission a pour objet de définir le cadre de l’accompagnement patrimonial confié au cabinet.',
    'La mission porte sur l’analyse de la situation patrimoniale, l’identification des objectifs du client, la formulation de préconisations adaptées ainsi que, le cas échéant, l’accompagnement dans la mise en œuvre des solutions retenues.',
    `À la date du présent document, la mission s’inscrit dans une logique d’accompagnement structurée autour de l’objectif principal « ${objective} », du scénario « ${selectedScenario} » et d’un horizon de référence de ${horizon}.`,
    'Les recommandations sont établies sur la base des informations communiquées par le client à la date du document. Toute insuffisance, omission ou évolution des informations transmises est susceptible d’affecter l’analyse et la portée des recommandations.',
  ]
}
function buildFeesParagraphs(data: ReportData): string[] {
  return [
    withFallback(data.cabinet.remunerationDisclosure, 'La rémunération du cabinet doit être précisée avant toute mise en œuvre.'),
    'Les modalités précises de rémunération applicables à la présente mission seront précisées, validées et portées à la connaissance du client dans les conditions requises avant toute mise en œuvre concernée.',
  ]
}
function buildTermsParagraphs(data: ReportData): string[] {
  const reserveMonths = Number(data.summary.emergencyMonths || 0).toFixed(1)
  return [
    'La mission s’exerce dans le cadre d’une obligation de moyens et sur la base des éléments transmis par le client.',
    `La mise en œuvre des recommandations doit rester cohérente avec la situation budgétaire, patrimoniale, fiscale et familiale du client telle qu’elle ressort des informations retenues au jour du document, notamment au regard du niveau de réserve de sécurité estimé à ${reserveMonths} mois.`,
    'Toute évolution significative de la situation patrimoniale, personnelle, familiale, professionnelle ou fiscale du client pourra nécessiter une mise à jour de l’analyse, des préconisations et, le cas échéant, du plan d’action.',
    'Le client demeure libre de suivre ou non les recommandations formulées par le cabinet.',
  ]
}

export function buildEngagementLetterTemplate(data: ReportData): EngagementLetterTemplate {
  const clientName = toSafeString(data.client.fullName, 'Client')
  const reportDate = toSafeString(data.client.reportDate, 'Rapport')
  const safeClientName = sanitizeFilePart(clientName)
  const safeDate = sanitizeFilePart(reportDate)

  return {
    kind: 'engagement_letter',
    title: 'Lettre de mission',
    fileName: `DCP_Lettre_Mission_${safeClientName}_${safeDate}.pdf`,
    clientName,
    reportDate,
    sections: [
      { type: 'header', title: 'Informations client', data: data.client },
      {
        type: 'cabinet',
        title: 'Cabinet',
        data: {
          cabinetName: withFallback(data.cabinet.cabinetName),
          advisorName: withFallback(data.cabinet.advisorName),
          email: withFallback(data.cabinet.email),
        },
      },
      { type: 'mission', title: 'Objet de la mission', data: { paragraphs: buildMissionParagraphs(data) } },
      { type: 'fees', title: 'Rémunération', data: { paragraphs: buildFeesParagraphs(data) } },
      { type: 'terms', title: 'Durée et modalités', data: { paragraphs: buildTermsParagraphs(data) } },
      {
        type: 'signature',
        title: 'Validation',
        data: {
          place: withFallback(data.cabinet.headOfficeAddress),
          date: reportDate,
        },
      },
    ],
  }
}
