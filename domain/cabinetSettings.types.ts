export type CabinetDocumentConfig = {
  cabinetName: string
  tagline: string
  advisorName: string
  email: string
  phone: string
  website?: string
  orias?: string
  legalStatus?: string
  cifStatus?: string
  intermediaryStatus?: string
  professionalAssociation?: string
  rcPro?: string
  mediator?: string
  remunerationDisclosure?: string
  complaintsEmail?: string
  complaintsHandlingDelay?: string
  headOfficeAddress?: string
}

export type CabinetUiPreferences = {
  defaultReportViewMode: 'client' | 'cabinet'
  showInternalNotesByDefault: boolean
}

export type CabinetSettings = {
  documents: CabinetDocumentConfig
  ui: CabinetUiPreferences
  updatedAt: string
}
