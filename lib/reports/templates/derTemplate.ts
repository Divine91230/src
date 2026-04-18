import type { ReportData } from '../report.types'

export type DerSection =
  | { type: 'header'; title: string; data: ReportData['client'] }
  | { type: 'cabinet'; title: string; data: { cabinetName: string; tagline: string; advisorName: string; email: string; phone: string } }
  | { type: 'legal'; title: string; data: { legalStatus: string; registrations: string[]; regulatorInfo: string } }
  | { type: 'remuneration'; title: string; data: { paragraphs: string[] } }
  | { type: 'claims'; title: string; data: { paragraphs: string[] } }
  | { type: 'conflicts'; title: string; data: { paragraphs: string[] } }
  | { type: 'dataProtection'; title: string; data: { paragraphs: string[] } }

export type DerTemplate = {
  kind: 'der'
  title: string
  fileName: string
  clientName: string
  reportDate: string
  sections: DerSection[]
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
  const text = toSafeString(value, '')
  return text || fallback
}
function buildRemunerationParagraphs(data: ReportData): string[] {
  return [
    withFallback(data.cabinet.remunerationDisclosure, 'Le mode de rémunération du cabinet doit être précisé avant toute mise en œuvre.'),
    'Le mode de rémunération applicable à la relation sera précisé dans les documents contractuels et, lorsqu’il y a lieu, dans la lettre de mission ou dans tout document complémentaire remis au client avant mise en œuvre.',
  ]
}
function buildClaimsParagraphs(data: ReportData): string[] {
  return [
    `Pour toute réclamation, le client peut s’adresser en priorité au cabinet par écrit à l’adresse ${withFallback(data.cabinet.complaintsEmail)} afin qu’une réponse motivée lui soit apportée dans le délai annoncé par le cabinet (${withFallback(data.cabinet.complaintsHandlingDelay)}).`,
    `En l’absence de résolution amiable, le client peut ensuite saisir le médiateur compétent : ${withFallback(data.cabinet.mediator)}.`,
  ]
}
function buildConflictsParagraphs(): string[] {
  return [
    'Le cabinet s’attache à identifier, prévenir et gérer les situations susceptibles de faire naître un conflit d’intérêts dans le cadre de la relation avec le client.',
    'Lorsqu’une situation de conflit d’intérêts ne pourrait être évitée, le client en serait informé dans des conditions appropriées avant la poursuite de la mission ou la mise en place de la solution concernée.',
  ]
}
function buildDataProtectionParagraphs(): string[] {
  return [
    'Les données personnelles collectées dans le cadre de la relation sont utilisées pour l’analyse patrimoniale, la préparation des recommandations, la gestion administrative du dossier et le suivi de la mission.',
    'Le client dispose de droits d’accès, de rectification, d’opposition, de limitation et, le cas échéant, d’effacement, selon la réglementation applicable en matière de protection des données personnelles.',
  ]
}

export function buildDerTemplate(data: ReportData): DerTemplate {
  const clientName = toSafeString(data.client.fullName, 'Client')
  const reportDate = toSafeString(data.client.reportDate, 'Rapport')
  const safeClientName = sanitizeFilePart(clientName)
  const safeDate = sanitizeFilePart(reportDate)

  return {
    kind: 'der',
    title: 'Document d’entrée en relation',
    fileName: `DCP_DER_${safeClientName}_${safeDate}.pdf`,
    clientName,
    reportDate,
    sections: [
      { type: 'header', title: 'Informations client', data: data.client },
      {
        type: 'cabinet',
        title: 'Présentation du cabinet',
        data: {
          cabinetName: withFallback(data.cabinet.cabinetName),
          tagline: withFallback(data.cabinet.tagline, ''),
          advisorName: withFallback(data.cabinet.advisorName),
          email: withFallback(data.cabinet.email),
          phone: withFallback(data.cabinet.phone),
        },
      },
      {
        type: 'legal',
        title: 'Statuts et immatriculations',
        data: {
          legalStatus: withFallback(data.cabinet.legalStatus, 'Cabinet de conseil patrimonial'),
          registrations: [
            `Immatriculation ORIAS : ${withFallback(data.cabinet.orias)}`,
            `Statut CIF : ${withFallback(data.cabinet.cifStatus)}`,
            `Statut courtier / intermédiaire : ${withFallback(data.cabinet.intermediaryStatus)}`,
            `Association professionnelle : ${withFallback(data.cabinet.professionalAssociation)}`,
            `Responsabilité civile professionnelle : ${withFallback(data.cabinet.rcPro)}`,
          ],
          regulatorInfo:
            'L’activité est exercée sous le contrôle des autorités, organismes et associations compétents, dans les conditions correspondant aux statuts effectivement détenus par le cabinet.',
        },
      },
      { type: 'remuneration', title: 'Mode de rémunération', data: { paragraphs: buildRemunerationParagraphs(data) } },
      { type: 'claims', title: 'Réclamations et médiation', data: { paragraphs: buildClaimsParagraphs(data) } },
      { type: 'conflicts', title: 'Conflits d’intérêts', data: { paragraphs: buildConflictsParagraphs() } },
      { type: 'dataProtection', title: 'Protection des données', data: { paragraphs: buildDataProtectionParagraphs() } },
    ],
  }
}
