import type { ReportData } from '../report.types'

export type ActionPlanSection =
  | {
      type: 'header'
      title: string
      data: ReportData['client']
    }
  | {
      type: 'strategy'
      title: string
      data: ReportData['strategy']
    }
  | {
      type: 'actionPlan'
      title: string
      data: ReportData['actionPlan']
    }
  | {
      type: 'followup'
      title: string
      data: {
        paragraphs: string[]
      }
    }

export type ActionPlanTemplate = {
  kind: 'action_plan'
  title: string
  fileName: string
  clientName: string
  reportDate: string
  sections: ActionPlanSection[]
}

function sanitizeFilePart(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
}

function toSafeString(value: unknown, fallback = '') {
  if (typeof value === 'string') {
    const trimmed = value.trim()
    return trimmed || fallback
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value)
  }

  return fallback
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
}

function formatHorizon(value: string | number) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return `${value} ans`
  }

  return toSafeString(value, 'À préciser')
}

function buildFollowupParagraphs(data: ReportData): string[] {
  const objective = toSafeString(data.strategy.objective, 'À préciser')
  const selectedScenario = toSafeString(
    data.strategy.selectedScenarioLabel,
    'À confirmer',
  )
  const horizon = formatHorizon(data.strategy.horizon)
  const reserveMonths = Number(data.summary.emergencyMonths || 0).toFixed(1)
  const initialAmount = formatCurrency(data.strategy.initialAmount)
  const monthlyAmount = formatCurrency(data.strategy.monthlyAmount)

  const reserveParagraph =
    Number(data.summary.emergencyMonths || 0) < 3
      ? `Une attention particulière devra être portée au maintien ou à la reconstitution d’une réserve de sécurité suffisante, le niveau actuellement retenu étant de ${reserveMonths} mois. La mise en œuvre devra donc rester progressive et compatible avec le besoin de liquidité du foyer.`
      : `Le niveau de réserve actuellement retenu (${reserveMonths} mois) permet d’envisager une mise en œuvre plus sereine, sous réserve de maintenir un cadre budgétaire stable et cohérent avec les arbitrages proposés.`

  return [
    `La mise en œuvre devra être séquencée en cohérence avec le scénario « ${selectedScenario} », l’objectif patrimonial principal « ${objective} », l’horizon retenu de ${horizon} et le rythme financier envisagé (${initialAmount} à l’initial puis ${monthlyAmount} par mois).`,
    reserveParagraph,
    `Toute évolution significative de la situation patrimoniale, fiscale, familiale ou professionnelle devra conduire à une mise à jour du plan d’action et, si nécessaire, à une révision de la stratégie retenue afin de préserver la cohérence du conseil dans la durée.`,
  ]
}

export function buildActionPlanTemplate(
  data: ReportData,
): ActionPlanTemplate {
  const clientName = toSafeString(data.client.fullName, 'Client')
  const reportDate = toSafeString(data.client.reportDate, 'Rapport')
  const safeClientName = sanitizeFilePart(clientName)
  const safeDate = sanitizeFilePart(reportDate)

  return {
    kind: 'action_plan',
    title: 'Plan d’action',
    fileName: `DCP_Plan_Action_${safeClientName}_${safeDate}.pdf`,
    clientName,
    reportDate,
    sections: [
      {
        type: 'header',
        title: 'Informations dossier',
        data: data.client,
      },
      {
        type: 'strategy',
        title: 'Stratégie de référence',
        data: data.strategy,
      },
      {
        type: 'actionPlan',
        title: 'Étapes proposées',
        data: data.actionPlan,
      },
      {
        type: 'followup',
        title: 'Suivi de mise en œuvre et cadre de lecture',
        data: {
          paragraphs: buildFollowupParagraphs(data),
        },
      },
    ],
  }
}
