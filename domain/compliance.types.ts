export type ComplaintStatus = 'ouverte' | 'en_cours' | 'cloturee'

export type ComplaintRecord = {
  id: string
  clientId: string
  clientName: string
  receivedAt: string
  channel: string
  subject: string
  description: string
  owner: string
  responseDueDate?: string
  respondedAt?: string
  responseSummary?: string
  status: ComplaintStatus
}

export type GeneratedReportStatus = 'draft' | 'final'

export type GeneratedReportRecord = {
  id: string
  clientId: string
  clientName: string
  documentKey: string
  documentTitle: string
  generatedAt: string
  fileName: string
  generationMode: 'single' | 'batch'
  reportDate: string
  documentStatus: GeneratedReportStatus
  versionLabel: string
}
