export type RiskLevel = 'Prudent' | 'Équilibré' | 'Dynamique'
export type EsgPreference = 'Oui' | 'Non' | 'Sans préférence'
export type LinkedPersonRole = 'Conjoint' | 'Enfant' | 'Autre'
export type EmploymentStatus = 'Salarié' | 'TNS' | 'Dirigeant' | 'Retraité' | 'Sans activité' | 'Autre'
export type HouseholdStatus = 'Célibataire' | 'Marié(e)' | 'Pacsé(e)' | 'Concubinage' | 'Divorcé(e)' | 'Veuf / Veuve'
export type MaritalRegime = 'Non applicable' | 'Communauté réduite aux acquêts' | 'Séparation de biens' | 'Communauté universelle' | 'Participation aux acquêts' | 'Autre'
export type RevenueType = 'Salaire net avant IR' | 'Revenu TNS net estimé' | 'Pension / retraite nette' | 'Pension alimentaire reçue' | 'Revenus locatifs encaissés' | 'Autre revenu récurrent'
export type ChargeType = 'Loyer / mensualité RP' | 'Crédit immobilier locatif' | 'Crédit consommation' | 'Charges foyer' | 'Pension alimentaire versée' | 'Autre charge récurrente'

export type EnvelopeType =
  | 'Compte courant'
  | 'Livret A'
  | 'LDDS'
  | 'LEP'
  | 'PEL'
  | 'Compte à terme'
  | 'Assurance-vie'
  | 'PER'
  | 'PEA'
  | 'CTO'
  | 'Épargne salariale'
  | 'SCPI'
  | 'Autre'

export type AssetCategory = 'Liquidités' | 'Financier' | 'Immobilier' | 'Professionnel' | 'Autre'

// Qualité du contrat — utilisée pour décider arbitrage vs rachat
export type ContractQuality = 'Bon' | 'Moyen' | 'À revoir' | 'Non évalué'

// Titulaire de l'enveloppe
export type AssetHolder = 'Souscripteur principal' | 'Conjoint' | 'Co-souscription' | 'Autre'

export type DebtType =
  | 'Crédit résidence principale'
  | 'Crédit locatif'
  | 'Crédit consommation'
  | 'Dette privée'
  | 'Autre'

export type RiskAnswer = 1 | 2 | 3 | 4

export type MainObjectiveOption =
  | 'Préparer la retraite'
  | 'Valoriser un capital'
  | 'Diversifier le patrimoine'
  | 'Optimiser la fiscalité'
  | 'Protéger le foyer'
  | 'Générer des revenus complémentaires'
  | 'Transmettre le patrimoine'
  | 'Financer un projet'
  | 'Conserver une forte liquidité'

export type SecondaryObjectiveOption =
  | ''
  | 'Préparer la retraite'
  | 'Valoriser un capital'
  | 'Diversifier le patrimoine'
  | 'Optimiser la fiscalité'
  | 'Protéger le foyer'
  | 'Générer des revenus complémentaires'
  | 'Transmettre le patrimoine'
  | 'Financer un projet'
  | 'Conserver une forte liquidité'

// ─── AssetLine enrichi ────────────────────────────────────────────────────────
export type AssetLine = {
  id: string
  label: string
  category: AssetCategory
  envelopeType: EnvelopeType
  holderPersonId: string | 'household'
  institution: string
  amount: number
  available: boolean
  comment: string

  // ── Nouveaux champs financiers ──────────────────────────────────────────
  // Communs à tous les actifs financiers et liquidités
  openingDate: string            // Date d'ouverture (YYYY-MM-DD) → calcul antériorité
  totalContributions: number     // Versements totaux → quote-part gains pour fiscalité rachat
  holder: AssetHolder            // Titulaire → optimisation transmission

  // Frais — pour détecter contrats peu compétitifs
  entryFees: number              // Frais sur versements en % (ex: 2.5)
  managementFees: number         // Frais de gestion annuels en % (ex: 0.8)

  // Spécifique Assurance-vie et PER
  insurerName: string            // Nom de l'assureur → diversification
  hasEuroFund: boolean           // Fonds euros disponible
  hasUC: boolean                 // UC disponibles
  contractQuality: ContractQuality  // Évaluation qualité → arbitrage vs rachat

  // Spécifique Liquidités
  isEmergencyFund: boolean       // Réserve de sécurité dédiée
}

export type LiabilityLine = {
  id: string
  label: string
  debtType: DebtType
  monthlyPayment: number
  outstandingCapital: number
  holderPersonId: string | 'household'
  comment: string
}

export type RevenueLine = {
  id: string
  label: string
  type: RevenueType
  monthlyAmount: number
  recurring: boolean
  includedInBudget: boolean
}

export type ChargeLine = {
  id: string
  label: string
  type: ChargeType
  monthlyAmount: number
  recurring: boolean
  includedInBudget: boolean
}

export type LinkedPerson = {
  id: string
  role: LinkedPersonRole
  firstName: string
  lastName: string
  birthDate: string
  isDependent: boolean
  isTaxAttached: boolean
}

export type TaxSettings = {
  taxResidenceCountry: string
  residentInFrance: boolean
  commonTaxHousehold: boolean
  householdDeclarationType: 'Personne seule' | 'Imposition commune' | 'Impositions séparées' | 'À confirmer'
  numberOfDependentChildrenManual: number | ''
  useDependentChildrenOverride: boolean
  situationFiscaleMode: 'auto' | 'manual'
  taxSituationManual: string
  partsMode: 'auto' | 'manual'
  partsManual: number | ''
  taxableIncomeMode: 'auto' | 'manual'
  taxableIncomeManual: number | ''
  tmiMode: 'auto' | 'manual'
  tmiManual: string
}

export type ProtectionSettings = {
  deathCoverage: boolean
  disabilityCoverage: boolean
  borrowerInsurance: boolean
  spouseProtected: boolean
  dependantsProtected: boolean
  vulnerablePoints: string
}

export type InvestmentProjectSettings = {
  investingMode: 'alone' | 'couple'
  fundingMode: 'capacity_only' | 'existing_only' | 'mixed'
  savingsUseMode: 'full' | 'partial'
  monthlySavingsAmount: number
  existingEnvelopesUseMode: 'full' | 'partial'
  existingEnvelopeUsages: Array<{
    id: string
    envelopeName: string
    selected: boolean
    useMode: 'full' | 'partial'
    amountUsed: number
  }>
  hasInitialLumpSum: boolean
  initialLumpSumAmount: number
  hasMonthlyContribution: boolean
  monthlyContributionAmount: number
  projectGoal?: string
  projectSecondaryGoal?: string
  liquidityNeed?: 'high' | 'medium' | 'low'
  flexibilityNeed?: 'high' | 'medium' | 'low'
  illiquidityTolerance?: 'low' | 'medium' | 'high'
  fundingPreference?: 'initial_priority' | 'monthly_priority' | 'balanced'
  targetAvailabilityHorizon?: number
  monthlyEffortMin?: number
  monthlyEffortTarget?: number
  monthlyEffortMax?: number
  wantsNewEnvelopes?: boolean
  mayNeedFundsBeforeHorizon?: boolean
  notes?: string
}

export type ObjectivesRiskEsg = {
  mainObjective: MainObjectiveOption
  secondaryObjective: SecondaryObjectiveOption
  horizonYears: number | ''
  liquidityNeed: string
  horizonTolerance: RiskAnswer
  marketKnowledge: RiskAnswer
  investmentExperience: RiskAnswer
  drawdownReaction: RiskAnswer
  lossCapacity: RiskAnswer
  performanceGoal: RiskAnswer
  returnVolatilityTradeoff: RiskAnswer
  capitalStabilityNeed: RiskAnswer
  riskProfileMode: 'auto' | 'manual'
  riskProfileManual: RiskLevel
  esgPreference: EsgPreference
  esgImportance: string
  esgThemes: string[]
  esgExclusions: string[]
  esgComment: string
}

export type DocumentsNotes = {
  idDocumentReceived: boolean
  taxNoticeReceived: boolean
  paySlipsReceived: boolean
  bankStatementsReceived: boolean
  contractsReceived: boolean
  missingDocuments: string
  advisorNotes: string
}

export type DiscoveryFormState = {
  mainPerson: {
    civility: string
    firstName: string
    lastName: string
    birthDate: string
    email: string
    phone: string
    address: string
    zipCode: string
    city: string
    householdStatus: HouseholdStatus
    maritalRegime: MaritalRegime
    profession: string
    employmentStatus: EmploymentStatus
  }
  linkedPersons: LinkedPerson[]
  revenues: RevenueLine[]
  charges: ChargeLine[]
  assets: AssetLine[]
  liabilities: LiabilityLine[]
  tax: TaxSettings
  investmentProject: InvestmentProjectSettings
  protection: ProtectionSettings
  objectives: ObjectivesRiskEsg
  documents: DocumentsNotes
  budgetOverrides: {
    householdIncomeMode: 'auto' | 'manual'
    householdIncomeManual: number | ''
    chargesMode: 'auto' | 'manual'
    chargesManual: number | ''
    capacityMode: 'auto' | 'manual'
    capacityManual: number | ''
  }
}
