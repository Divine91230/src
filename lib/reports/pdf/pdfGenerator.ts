import { jsPDF } from 'jspdf'
import type { FullReportTemplate } from '../templates/fullReportTemplate'
import type { OnePageSummaryTemplate } from '../templates/onePageSummaryTemplate'
import type { AdequacyReportTemplate } from '../templates/adequacyReportTemplate'
import type { DerTemplate } from '../templates/derTemplate'
import type { EngagementLetterTemplate } from '../templates/engagementLetterTemplate'
import type { StrategyReportTemplate } from '../templates/strategyReportTemplate'
import type { ActionPlanTemplate } from '../templates/actionPlanTemplate'

type Cursor = { y: number }

type HeaderLikeSection = { title?: string; data: { fullName: string; reportDate: string } }
type SummaryLikeSection = { title: string; data: { totalAssets?: number; totalLiabilities?: number; netWorth: number; selectedIncome: number; selectedCharges: number; selectedSavings: number; remainingToLive?: number; emergencyMonths: number; taxParts?: number; tmi: number; riskProfile: string } }
type BreakdownLine = { label: string; family: string; amount: number; institution?: string; comment?: string }
type BreakdownSection = { title: string; data: BreakdownLine[] }
type ExistingEnvelopeUseLikeLine = { label: string; currentAmount: number; mobilizedAmount: number; remainingAmount: number; mobilizedPercent: number; useMode: 'full' | 'partial'; decision: string; rationale: string }
type ExistingEnvelopeUseLikeSection = { title: string; data: ExistingEnvelopeUseLikeLine[] }
type StrategyLikeSection = { title: string; data: { recommendedScenarioLabel: string; selectedScenarioLabel: string; objective: string; secondaryObjective?: string; horizon: number | string; initialAmount: number; monthlyAmount: number; clientFollowsRecommendation?: boolean } }
type AllocationLikeLine = { envelope: string; initialPercent?: number; monthlyPercent?: number; securePercent?: number; ucPercent?: number; initialSecurePercent?: number; initialUcPercent?: number; monthlySecurePercent?: number; monthlyUcPercent?: number; euroAmount: number; monthlyEuroAmount: number }
type AllocationLikeSection = { title: string; data: { totals: { initialTotal: number; monthlyTotal: number; secureInitialPct: number; ucInitialPct: number; secureMonthlyPct: number; ucMonthlyPct: number }; lines: AllocationLikeLine[] } }
type RecommendationsLikeSection = { title: string; data: { paragraphs: string[] } }
type ActionPlanLikeSection = { title: string; data: Array<{ index: number; title: string; text: string }> }
type DiagnosticsLikeSection = { title: string; data: Array<{ title: string; text: string }> }

const PAGE = { width: 210, height: 297, marginX: 18, marginTop: 20, marginBottom: 18 }

const COLORS = {
  text: '#1f1a14',
  muted: '#6f6459',
  gold: '#c8a66a',
  goldDark: '#8d6f43',
  line: '#d7c8b1',
  softGold: '#f6efe3',
  softPanel: '#fbf8f2',
  cardBorder: '#e7ddd0',
  chartA: '#c8a66a',
  chartB: '#786552',
  chartC: '#d9c3a0',
  chartD: '#f1e8da',
}

function ensureSpace(doc: jsPDF, cursor: Cursor, neededHeight: number) {
  if (cursor.y + neededHeight <= PAGE.height - PAGE.marginBottom) return
  doc.addPage()
  cursor.y = PAGE.marginTop
  drawPageFrame(doc)
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })
    .format(Number(value || 0))
    .replace(/\u202F/g, ' ')
    .replace(/\u00A0/g, ' ')
}

function normalizePdfText(value: unknown) {
  const text = String(value ?? '').trim()
  if (!text) return '-'
  return text
    .replace(/[’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, '-')
    .replace(/\u202F/g, ' ')
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function drawPageFrame(doc: jsPDF) {
  doc.setDrawColor(COLORS.line)
  doc.setLineWidth(0.35)
  doc.rect(10, 10, PAGE.width - 20, PAGE.height - 20)
}

function drawFooter(doc: jsPDF, label = 'DCP Patrimoine') {
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i += 1) {
    doc.setPage(i)
    doc.setDrawColor(COLORS.line)
    doc.setLineWidth(0.2)
    doc.line(PAGE.marginX, PAGE.height - 12, PAGE.width - PAGE.marginX, PAGE.height - 12)
    doc.setFont('times', 'normal')
    doc.setFontSize(8.5)
    doc.setTextColor(COLORS.muted)
    doc.text(label, PAGE.marginX, PAGE.height - 7)
    doc.text(`Page ${i}/${pageCount}`, PAGE.width - PAGE.marginX, PAGE.height - 7, { align: 'right' })
  }
}

function drawCoverPage(doc: jsPDF, title: string, clientName: string, reportDate: string, subtitle?: string) {
  doc.setFillColor('#fbf7f0')
  doc.rect(0, 0, PAGE.width, PAGE.height, 'F')
  doc.setFillColor(COLORS.softGold)
  doc.rect(0, 0, PAGE.width, 72, 'F')
  doc.setDrawColor(COLORS.line)
  doc.setLineWidth(0.8)
  doc.rect(14, 14, PAGE.width - 28, PAGE.height - 28)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(14)
  doc.setTextColor(COLORS.goldDark)
  doc.text('DCP Patrimoine', PAGE.marginX, 35)
  doc.setDrawColor(COLORS.line)
  doc.line(PAGE.marginX, 44, PAGE.width - PAGE.marginX, 44)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(24)
  doc.setTextColor(COLORS.text)
  doc.text(normalizePdfText(title), PAGE.marginX, 84)
  const sub = subtitle ? normalizePdfText(subtitle) : 'Restitution patrimoniale rédigée par le cabinet.'
  const subLines = doc.splitTextToSize(sub, PAGE.width - PAGE.marginX * 2)
  doc.setFont('times', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(COLORS.muted)
  doc.text(subLines, PAGE.marginX, 96)
  doc.setDrawColor(COLORS.line)
  doc.line(PAGE.marginX, 138, PAGE.width - PAGE.marginX, 138)
  doc.setFont('times', 'italic')
  doc.setFontSize(10)
  doc.text('Client', PAGE.marginX, 154)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(17)
  doc.setTextColor(COLORS.text)
  doc.text(normalizePdfText(clientName), PAGE.marginX, 164)
  doc.setFont('times', 'italic')
  doc.setFontSize(10)
  doc.setTextColor(COLORS.muted)
  doc.text('Date du rapport', PAGE.marginX, 182)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(COLORS.text)
  doc.text(normalizePdfText(reportDate), PAGE.marginX, 191)
  doc.setFont('times', 'italic')
  doc.setFontSize(9.2)
  doc.setTextColor(COLORS.muted)
  doc.text('Document préparé à des fins de restitution et de suivi patrimonial.', PAGE.marginX, PAGE.height - 28)
  doc.text('Les tableaux et graphiques sont des supports de lecture du conseil du cabinet.', PAGE.marginX, PAGE.height - 21)
  doc.addPage()
  drawPageFrame(doc)
}

function drawSectionTitle(doc: jsPDF, cursor: Cursor, title: string) {
  ensureSpace(doc, cursor, 16)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(COLORS.goldDark)
  doc.text(normalizePdfText(title), PAGE.marginX, cursor.y)
  doc.setDrawColor(COLORS.line)
  doc.line(PAGE.marginX, cursor.y + 2.5, PAGE.width - PAGE.marginX, cursor.y + 2.5)
  cursor.y += 10
}

function drawHeaderSection(doc: jsPDF, cursor: Cursor, section: HeaderLikeSection) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(COLORS.text)
  doc.text(normalizePdfText(section.title || 'Rapport patrimonial'), PAGE.marginX, cursor.y)
  cursor.y += 8
  doc.setFont('times', 'italic')
  doc.setFontSize(10.5)
  doc.setTextColor(COLORS.muted)
  doc.text(`Client : ${normalizePdfText(section.data.fullName)}`, PAGE.marginX, cursor.y)
  cursor.y += 5.5
  doc.text(`Date du rapport : ${normalizePdfText(section.data.reportDate)}`, PAGE.marginX, cursor.y)
  cursor.y += 6
}

function drawNarrative(doc: jsPDF, cursor: Cursor, text: string) {
  const lines = doc.splitTextToSize(normalizePdfText(text), PAGE.width - PAGE.marginX * 2)
  const height = lines.length * 5.3 + 1.5
  ensureSpace(doc, cursor, height)
  doc.setFont('times', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(COLORS.text)
  doc.text(lines, PAGE.marginX, cursor.y)
  cursor.y += height
}

function drawLabelValue(doc: jsPDF, cursor: Cursor, label: string, value: string) {
  ensureSpace(doc, cursor, 6.5)
  doc.setFont('times', 'italic')
  doc.setFontSize(10)
  doc.setTextColor(COLORS.muted)
  doc.text(normalizePdfText(label), PAGE.marginX, cursor.y)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.3)
  doc.setTextColor(COLORS.text)
  doc.text(normalizePdfText(value), PAGE.width - PAGE.marginX, cursor.y, { align: 'right' })
  doc.setDrawColor(COLORS.cardBorder)
  doc.setLineWidth(0.15)
  doc.line(PAGE.marginX, cursor.y + 1.7, PAGE.width - PAGE.marginX, cursor.y + 1.7)
  cursor.y += 6.5
}

function drawSummarySection(doc: jsPDF, cursor: Cursor, section: SummaryLikeSection) {
  drawSectionTitle(doc, cursor, section.title)
  drawNarrative(doc, cursor, `La situation patrimoniale se caractérise par un patrimoine net de ${formatCurrency(section.data.netWorth)}, des revenus retenus de ${formatCurrency(section.data.selectedIncome)} et une capacité d'épargne de ${formatCurrency(section.data.selectedSavings)}. La réserve de sécurité ressort à ${section.data.emergencyMonths.toFixed(1)} mois, ce qui donne un premier niveau de lecture sur la souplesse financière du foyer.`)
  if (typeof section.data.totalAssets === 'number') drawLabelValue(doc, cursor, 'Patrimoine brut', formatCurrency(section.data.totalAssets))
  if (typeof section.data.totalLiabilities === 'number') drawLabelValue(doc, cursor, 'Passif', formatCurrency(section.data.totalLiabilities))
  drawLabelValue(doc, cursor, 'Patrimoine net', formatCurrency(section.data.netWorth))
  drawLabelValue(doc, cursor, 'Revenus retenus', formatCurrency(section.data.selectedIncome))
  drawLabelValue(doc, cursor, 'Charges retenues', formatCurrency(section.data.selectedCharges))
  drawLabelValue(doc, cursor, 'Capacité d’épargne retenue', formatCurrency(section.data.selectedSavings))
  if (typeof section.data.remainingToLive === 'number') drawLabelValue(doc, cursor, 'Reste à vivre', formatCurrency(section.data.remainingToLive))
  if (typeof section.data.taxParts === 'number') drawLabelValue(doc, cursor, 'Parts fiscales', String(section.data.taxParts))
  drawLabelValue(doc, cursor, 'TMI', `${section.data.tmi} %`)
  drawLabelValue(doc, cursor, 'Profil de risque', normalizePdfText(section.data.riskProfile))
  drawLabelValue(doc, cursor, 'Réserve de sécurité', `${section.data.emergencyMonths.toFixed(1)} mois`)
  cursor.y += 2
}

function drawBreakdownChart(doc: jsPDF, cursor: Cursor, rows: BreakdownLine[], total: number) {
  const max = Math.max(...rows.map((r) => r.amount), 1)
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i]
    ensureSpace(doc, cursor, 9)
    doc.setFont('times', 'italic')
    doc.setFontSize(9.5)
    doc.setTextColor(COLORS.muted)
    doc.text(normalizePdfText(row.label), PAGE.marginX, cursor.y)
    const barX = PAGE.marginX + 44
    const barY = cursor.y - 3.5
    const barW = PAGE.width - PAGE.marginX * 2 - 70
    const fillW = Math.max(2, (row.amount / max) * barW)
    doc.setFillColor(COLORS.chartD)
    doc.roundedRect(barX, barY, barW, 4.5, 1.2, 1.2, 'F')
    doc.setFillColor(i % 2 === 0 ? COLORS.chartA : COLORS.chartB)
    doc.roundedRect(barX, barY, fillW, 4.5, 1.2, 1.2, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.6)
    doc.setTextColor(COLORS.text)
    doc.text(formatCurrency(row.amount), PAGE.width - PAGE.marginX, cursor.y, { align: 'right' })
    if (total > 0) {
      doc.setFont('times', 'normal')
      doc.setFontSize(8.8)
      doc.setTextColor(COLORS.muted)
      doc.text(`${Math.round((row.amount / total) * 100)} %`, PAGE.width - PAGE.marginX, cursor.y + 3.8, { align: 'right' })
    }
    cursor.y += 9
  }
}

function drawBreakdownSection(doc: jsPDF, cursor: Cursor, title: string, rows: BreakdownLine[], intro: string) {
  drawSectionTitle(doc, cursor, title)
  drawNarrative(doc, cursor, intro)
  const shown = rows.slice(0, 8)
  const total = shown.reduce((sum, row) => sum + row.amount, 0)
  drawBreakdownChart(doc, cursor, shown, total)
  cursor.y += 2
}


function drawExistingEnvelopeUsesSection(doc: jsPDF, cursor: Cursor, section: ExistingEnvelopeUseLikeSection) {
  drawSectionTitle(doc, cursor, section.title)
  const rows = section.data || []
  if (!rows.length) {
    drawNarrative(doc, cursor, "Aucune enveloppe existante n'est explicitement mobilisee dans le projet a ce stade.")
    return
  }

  drawNarrative(doc, cursor, "Le tableau ci-dessous precise quelles enveloppes existantes sont utilisees pour la mise en place de la strategie, a quelle hauteur, et ce qu'il en reste apres mobilisation.")
  for (const row of rows) {
    ensureSpace(doc, cursor, 30)
    doc.setDrawColor(COLORS.cardBorder)
    doc.setFillColor(COLORS.softPanel)
    doc.roundedRect(PAGE.marginX, cursor.y - 3, PAGE.width - PAGE.marginX * 2, 27, 2.5, 2.5, 'FD')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(COLORS.text)
    doc.text(normalizePdfText(row.label), PAGE.marginX + 3, cursor.y + 1)

    doc.setFont('times', 'italic')
    doc.setFontSize(8.8)
    doc.setTextColor(COLORS.muted)
    doc.text(normalizePdfText(row.decision), PAGE.width - PAGE.marginX - 3, cursor.y + 1, { align: 'right' })

    doc.setFont('times', 'normal')
    doc.setFontSize(9.2)
    doc.setTextColor(COLORS.text)
    const rationaleLines = doc.splitTextToSize(normalizePdfText(row.rationale), PAGE.width - PAGE.marginX * 2 - 6)
    doc.text(rationaleLines, PAGE.marginX + 3, cursor.y + 6)

    const baseY = cursor.y + 15
    drawLabelValue(doc, { y: baseY }, 'Encours actuel', formatCurrency(row.currentAmount))
    cursor.y = baseY + 5
    drawLabelValue(doc, cursor, 'Mode de mobilisation', row.useMode === 'full' ? 'Totale' : 'Partielle')
    drawLabelValue(doc, cursor, 'Montant mobilise', formatCurrency(row.mobilizedAmount))
    drawLabelValue(doc, cursor, 'Montant restant', formatCurrency(row.remainingAmount))
    drawLabelValue(doc, cursor, 'Part mobilisee', `${Math.round(Number(row.mobilizedPercent || 0))} %`)
    cursor.y += 4
  }
}

function drawStrategySection(doc: jsPDF, cursor: Cursor, section: StrategyLikeSection) {
  drawSectionTitle(doc, cursor, section.title)
  const horizon = typeof section.data.horizon === 'number' ? `${section.data.horizon} ans` : normalizePdfText(section.data.horizon)
  drawNarrative(doc, cursor, `La stratégie retenue s'appuie sur le scénario « ${normalizePdfText(section.data.selectedScenarioLabel)} », construit autour de l'objectif principal « ${normalizePdfText(section.data.objective)} » et d'un horizon de ${horizon}. Le cabinet a recommandé « ${normalizePdfText(section.data.recommendedScenarioLabel)} », avec un rythme de mise en place de ${formatCurrency(section.data.initialAmount)} à l'initial puis ${formatCurrency(section.data.monthlyAmount)} par mois.`)
  drawLabelValue(doc, cursor, 'Scénario recommandé DCP', normalizePdfText(section.data.recommendedScenarioLabel))
  drawLabelValue(doc, cursor, 'Scénario retenu client', normalizePdfText(section.data.selectedScenarioLabel))
  drawLabelValue(doc, cursor, 'Objectif principal', normalizePdfText(section.data.objective))
  if (section.data.secondaryObjective) drawLabelValue(doc, cursor, 'Objectif secondaire', normalizePdfText(section.data.secondaryObjective))
  drawLabelValue(doc, cursor, 'Horizon cible', horizon)
  drawLabelValue(doc, cursor, 'Versement initial retenu', formatCurrency(section.data.initialAmount))
  drawLabelValue(doc, cursor, 'Versement mensuel retenu', formatCurrency(section.data.monthlyAmount))
  drawLabelValue(doc, cursor, 'Suit la recommandation', section.data.clientFollowsRecommendation ? 'Oui' : 'Non')
  cursor.y += 2
}

function drawStackedBar(doc: jsPDF, x: number, y: number, width: number, height: number, aPct: number, bPct: number, leftColor: string, rightColor: string) {
  const leftW = Math.max(0, (aPct / 100) * width)
  const rightW = Math.max(0, width - leftW)
  doc.setFillColor(COLORS.chartD)
  doc.roundedRect(x, y, width, height, 1.2, 1.2, 'F')
  if (leftW > 0) {
    doc.setFillColor(leftColor)
    doc.roundedRect(x, y, leftW, height, 1.2, 1.2, 'F')
  }
  if (rightW > 0) {
    doc.setFillColor(rightColor)
    doc.rect(x + leftW, y, rightW, height, 'F')
  }
}

function drawAllocationCard(doc: jsPDF, cursor: Cursor, line: AllocationLikeLine) {
  ensureSpace(doc, cursor, 22)
  doc.setDrawColor(COLORS.cardBorder)
  doc.setFillColor(COLORS.softPanel)
  doc.roundedRect(PAGE.marginX, cursor.y - 3.5, PAGE.width - PAGE.marginX * 2, 20, 2.5, 2.5, 'FD')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(COLORS.text)
  doc.text(normalizePdfText(line.envelope), PAGE.marginX + 3, cursor.y + 1)
  doc.setFont('times', 'normal')
  doc.setFontSize(9.4)
  doc.setTextColor(COLORS.muted)
  doc.text(`${formatCurrency(line.euroAmount)} - ${formatCurrency(line.monthlyEuroAmount)}/mois`, PAGE.width - PAGE.marginX - 3, cursor.y + 1, { align: 'right' })
  const initSec = Number(line.initialSecurePercent ?? line.securePercent ?? 0)
  const initUc = Number(line.initialUcPercent ?? line.ucPercent ?? 0)
  const monSec = Number(line.monthlySecurePercent ?? line.securePercent ?? 0)
  const monUc = Number(line.monthlyUcPercent ?? line.ucPercent ?? 0)
  doc.setFont('times', 'italic')
  doc.setFontSize(9)
  doc.setTextColor(COLORS.muted)
  doc.text('Initial', PAGE.marginX + 3, cursor.y + 7.5)
  drawStackedBar(doc, PAGE.marginX + 23, cursor.y + 4.8, 82, 4.6, initSec, initUc, COLORS.chartA, COLORS.chartB)
  doc.text(`${initSec}% / ${initUc}%`, PAGE.marginX + 109, cursor.y + 7.5)
  doc.text('Mensuel', PAGE.marginX + 3, cursor.y + 13.7)
  drawStackedBar(doc, PAGE.marginX + 23, cursor.y + 11, 82, 4.6, monSec, monUc, COLORS.chartA, COLORS.chartB)
  doc.text(`${monSec}% / ${monUc}%`, PAGE.marginX + 109, cursor.y + 13.7)
  cursor.y += 24
}

function drawAllocationSection(doc: jsPDF, cursor: Cursor, section: AllocationLikeSection) {
  drawSectionTitle(doc, cursor, section.title)
  drawNarrative(doc, cursor, `L'allocation cible vise à répartir l'effort d'investissement entre sécurité et diversification, avec ${formatCurrency(section.data.totals.initialTotal)} à l'initial et ${formatCurrency(section.data.totals.monthlyTotal)} par mois. Les graphiques ci-dessous permettent une lecture visuelle rapide des équilibres retenus.`)
  drawLabelValue(doc, cursor, 'Total initial', formatCurrency(section.data.totals.initialTotal))
  drawLabelValue(doc, cursor, 'Total mensuel', formatCurrency(section.data.totals.monthlyTotal))
  ensureSpace(doc, cursor, 18)
  doc.setFont('times', 'italic')
  doc.setFontSize(9.4)
  doc.setTextColor(COLORS.muted)
  doc.text('Répartition initiale', PAGE.marginX, cursor.y)
  drawStackedBar(doc, PAGE.marginX, cursor.y + 3, PAGE.width - PAGE.marginX * 2, 7, section.data.totals.secureInitialPct, section.data.totals.ucInitialPct, COLORS.chartA, COLORS.chartB)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.2)
  doc.setTextColor(COLORS.text)
  doc.text(`Sécuritaire ${section.data.totals.secureInitialPct}% - Diversification ${section.data.totals.ucInitialPct}%`, PAGE.width - PAGE.marginX, cursor.y + 11.8, { align: 'right' })
  cursor.y += 18
  ensureSpace(doc, cursor, 18)
  doc.setFont('times', 'italic')
  doc.setFontSize(9.4)
  doc.setTextColor(COLORS.muted)
  doc.text('Répartition mensuelle', PAGE.marginX, cursor.y)
  drawStackedBar(doc, PAGE.marginX, cursor.y + 3, PAGE.width - PAGE.marginX * 2, 7, section.data.totals.secureMonthlyPct, section.data.totals.ucMonthlyPct, COLORS.chartA, COLORS.chartB)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9.2)
  doc.setTextColor(COLORS.text)
  doc.text(`Sécuritaire ${section.data.totals.secureMonthlyPct}% - Diversification ${section.data.totals.ucMonthlyPct}%`, PAGE.width - PAGE.marginX, cursor.y + 11.8, { align: 'right' })
  cursor.y += 18
  section.data.lines.forEach((line) => drawAllocationCard(doc, cursor, line))
  cursor.y += 1
}

function drawDiagnosticsSection(doc: jsPDF, cursor: Cursor, section: DiagnosticsLikeSection) {
  drawSectionTitle(doc, cursor, section.title)
  section.data.forEach((block) => {
    ensureSpace(doc, cursor, 18)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(COLORS.goldDark)
    doc.text(normalizePdfText(block.title), PAGE.marginX, cursor.y)
    cursor.y += 5
    drawNarrative(doc, cursor, block.text)
    cursor.y += 1
  })
}

function drawParagraphsSection(doc: jsPDF, cursor: Cursor, title: string, paragraphs: string[]) {
  drawSectionTitle(doc, cursor, title)
  paragraphs.forEach((p) => {
    drawNarrative(doc, cursor, p)
    cursor.y += 1.5
  })
}

function drawBulletsSection(doc: jsPDF, cursor: Cursor, title: string, bullets: string[]) {
  drawSectionTitle(doc, cursor, title)
  bullets.forEach((item) => {
    ensureSpace(doc, cursor, 8)
    doc.setFont('times', 'normal')
    doc.setFontSize(10.7)
    doc.setTextColor(COLORS.text)
    doc.text('-', PAGE.marginX, cursor.y)
    const lines = doc.splitTextToSize(normalizePdfText(item), PAGE.width - PAGE.marginX * 2 - 6)
    doc.text(lines, PAGE.marginX + 5, cursor.y)
    cursor.y += lines.length * 5.1 + 1.5
  })
}

function drawActionPlanSection(doc: jsPDF, cursor: Cursor, section: ActionPlanLikeSection) {
  drawSectionTitle(doc, cursor, section.title)
  section.data.forEach((step) => {
    ensureSpace(doc, cursor, 18)
    doc.setFillColor(COLORS.softGold)
    doc.circle(PAGE.marginX + 3, cursor.y + 1.2, 3.4, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    doc.setTextColor(COLORS.goldDark)
    doc.text(String(step.index), PAGE.marginX + 3, cursor.y + 2.2, { align: 'center' })
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(COLORS.text)
    doc.text(normalizePdfText(step.title), PAGE.marginX + 10, cursor.y)
    cursor.y += 5
    const lines = doc.splitTextToSize(normalizePdfText(step.text), PAGE.width - PAGE.marginX * 2 - 10)
    doc.setFont('times', 'normal')
    doc.setFontSize(10.8)
    doc.text(lines, PAGE.marginX + 10, cursor.y)
    cursor.y += lines.length * 5.1 + 3
  })
}

function drawCabinetSection(doc: jsPDF, cursor: Cursor, section: any) {
  drawSectionTitle(doc, cursor, section.title)
  if (section.data.cabinetName) drawLabelValue(doc, cursor, 'Cabinet', normalizePdfText(section.data.cabinetName))
  if (section.data.tagline) drawLabelValue(doc, cursor, 'Positionnement', normalizePdfText(section.data.tagline))
  if (section.data.advisorName) drawLabelValue(doc, cursor, 'Conseiller', normalizePdfText(section.data.advisorName))
  if (section.data.email) drawLabelValue(doc, cursor, 'Email', normalizePdfText(section.data.email))
  if (section.data.phone) drawLabelValue(doc, cursor, 'Téléphone', normalizePdfText(section.data.phone))
}

function drawLegalSection(doc: jsPDF, cursor: Cursor, section: any) {
  drawSectionTitle(doc, cursor, section.title)
  drawNarrative(doc, cursor, section.data.legalStatus)
  drawBulletsSection(doc, cursor, 'Éléments à compléter / vérifier', section.data.registrations || [])
  if (section.data.regulatorInfo) {
    drawNarrative(doc, cursor, section.data.regulatorInfo)
  }
}

function drawSignatureSection(doc: jsPDF, cursor: Cursor, section: any) {
  drawSectionTitle(doc, cursor, section.title)
  drawLabelValue(doc, cursor, 'Lieu', normalizePdfText(section.data.place || 'À compléter'))
  drawLabelValue(doc, cursor, 'Date', normalizePdfText(section.data.date || 'À compléter'))
  ensureSpace(doc, cursor, 28)
  doc.setDrawColor(COLORS.line)
  doc.line(PAGE.marginX, cursor.y + 12, PAGE.marginX + 70, cursor.y + 12)
  doc.line(PAGE.width - PAGE.marginX - 70, cursor.y + 12, PAGE.width - PAGE.marginX, cursor.y + 12)
  doc.setFont('times', 'italic')
  doc.setFontSize(9.5)
  doc.setTextColor(COLORS.muted)
  doc.text('Signature du client', PAGE.marginX, cursor.y + 17)
  doc.text('Signature du cabinet', PAGE.width - PAGE.marginX - 70, cursor.y + 17)
  cursor.y += 24
}

function drawTemplate(doc: jsPDF, template: any, subtitle: string) {
  drawCoverPage(doc, template.title, template.clientName, template.reportDate, subtitle)
  const cursor: Cursor = { y: PAGE.marginTop }
  drawHeaderSection(doc, cursor, { title: template.title.replace(' 1 page', ''), data: { fullName: template.clientName, reportDate: template.reportDate } })
  cursor.y += 2

  for (const section of template.sections) {
    if (section.type === 'header') continue
    if (section.type === 'summary') drawSummarySection(doc, cursor, section)
    else if (section.type === 'assetBreakdown') drawBreakdownSection(doc, cursor, section.title, section.data, 'La lecture des avoirs réels permet de visualiser la structure concrète du patrimoine et d’identifier les postes dominants du bilan.')
    else if (section.type === 'liabilityBreakdown') drawBreakdownSection(doc, cursor, section.title, section.data, 'Le détail du passif rappelle les engagements qui pèsent sur le bilan et qui doivent être intégrés dans la stratégie de mise en œuvre.')
    else if (section.type === 'strategy') drawStrategySection(doc, cursor, section)
    else if (section.type === 'allocation') drawAllocationSection(doc, cursor, section)
    else if (section.type === 'existingEnvelopeUses') drawExistingEnvelopeUsesSection(doc, cursor, section as ExistingEnvelopeUseLikeSection)
    else if (section.type === 'diagnostics') drawDiagnosticsSection(doc, cursor, section)
    else if (section.type === 'recommendations' || section.type === 'adequacy' || section.type === 'mission' || section.type === 'fees' || section.type === 'terms' || section.type === 'remuneration' || section.type === 'claims' || section.type === 'conflicts' || section.type === 'dataProtection') drawParagraphsSection(doc, cursor, section.title, section.data.paragraphs)
    else if (section.type === 'vigilance' || section.type === 'keyMessages') drawBulletsSection(doc, cursor, section.title, section.data.bullets || section.data.messages)
    else if (section.type === 'actionPlan') drawActionPlanSection(doc, cursor, section)
    else if (section.type === 'cabinet') drawCabinetSection(doc, cursor, section)
    else if (section.type === 'legal') drawLegalSection(doc, cursor, section)
    else if (section.type === 'signature') drawSignatureSection(doc, cursor, section)
    cursor.y += 2
  }

  drawFooter(doc)
}

function save(doc: jsPDF, fileName: string) {
  doc.save(fileName)
}

export async function generatePdfFromOnePageSummaryTemplate(template: OnePageSummaryTemplate) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  drawTemplate(doc, template, 'Synthèse patrimoniale rédigée par le cabinet.')
  save(doc, template.fileName)
}

export async function generatePdfFromFullReportTemplate(template: FullReportTemplate) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  drawTemplate(doc, template, 'Restitution patrimoniale complète.')
  save(doc, template.fileName)
}

export async function generatePdfFromStrategyReportTemplate(template: StrategyReportTemplate) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  drawTemplate(doc, template, 'Lecture structurée de la recommandation patrimoniale.')
  save(doc, template.fileName)
}

export async function generatePdfFromAdequacyReportTemplate(template: AdequacyReportTemplate) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  drawTemplate(doc, template, 'Justification de l’adéquation de la stratégie retenue.')
  save(doc, template.fileName)
}

export async function generatePdfFromDerTemplate(template: DerTemplate) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  drawTemplate(doc, template, 'Informations préalables à l’entrée en relation.')
  save(doc, template.fileName)
}

export async function generatePdfFromEngagementLetterTemplate(template: EngagementLetterTemplate) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  drawTemplate(doc, template, 'Cadre contractuel de la mission patrimoniale.')
  save(doc, template.fileName)
}

export async function generatePdfFromActionPlanTemplate(template: ActionPlanTemplate) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  drawTemplate(doc, template, 'Feuille de route de mise en œuvre.')
  save(doc, template.fileName)
}
