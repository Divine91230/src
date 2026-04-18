export type ClientAuditRecord = {
  id: string
  clientId: string
  clientName: string
  eventType:
    | 'document_generated'
    | 'deviation_saved'
    | 'complaint_created'
    | 'complaint_status_changed'
    | 'report_mode_changed'
  label: string
  details?: string
  createdAt: string
}
