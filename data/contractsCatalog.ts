export type RiskProfile = 'Prudent' | 'Équilibré' | 'Dynamique'
export type ScenarioKey = 'secure' | 'balanced' | 'growth'

export type ContractEnvelope =
  | 'Assurance-vie'
  | 'PER'
  | 'Contrat de capitalisation'
  | 'PEA'
  | 'CTO'
  | 'SCPI'
  | 'Nue-propriété'
  | 'Produit structuré'
  | 'Fiscal'
  | 'Lux'

export type ContractTier = 'core' | 'advanced' | 'complementary'

export type ProductStructure =
  | 'assurance'
  | 'titres'
  | 'immobilier'
  | 'fiscal'
  | 'lux'
  | 'structure'

export type DcpConviction = 'forte' | 'bonne' | 'opportuniste'

export type SuitabilityRules = {
  minTmi?: number
  minEmergencyMonths?: number
  maxDebtRatio?: number
  minInitialCapital?: number
}

export type ContractRecord = {
  id: string
  envelope: ContractEnvelope
  tier: ContractTier

  contractName: string
  insurer: string
  distributor?: string
  providerGroup?: string
  contractType: string

  productStructure: ProductStructure
  objectiveTags: string[]
  dcpConviction?: DcpConviction
  suitabilityRules?: SuitabilityRules

  minimumInitialLabel?: string
  minimumAdditionalLabel?: string
  minimumProgrammedLabel?: string
  periodicities?: string[]

  entryFeesLabel?: string
  managementFeesEuroLabel?: string
  managementFeesUcLabel?: string
  arbitrationFeesLabel?: string
  extraFeesLabel?: string

  ucAvailable: boolean
  euroFundAvailable: boolean
  growthFundAvailable?: boolean
  etfAvailable?: boolean
  directSecuritiesAvailable?: boolean
  realEstateAvailable?: boolean
  privateEquityAvailable?: boolean
  structuredProductsAvailable?: boolean

  managementModes: string[]
  supportsSummary: string
  digitalSummary?: string

  profileFit: RiskProfile[]
  scenarioFit: ScenarioKey[]
  preferredObjectives: string[]

  liquidityLevel: 'Élevée' | 'Intermédiaire' | 'Faible'
  complexityLevel: 'Standard' | 'Patrimonial' | 'Avancé'

  targetClient: string
  roleInStrategy: string

  strengths: string[]
  watchPoints: string[]

  expectedReturnHypothesis?: {
    secure?: string
    balanced?: string
    growth?: string
    disclaimer: string
  }

  sourceLabel: string
}

function normalizeText(value: string | undefined) {
  return (value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
}

function toSafeNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const normalized = value
      .replace(/\s/g, '')
      .replace(',', '.')
      .replace('%', '')
      .trim()
    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function extractObjectiveTags(objective: string): string[] {
  const normalized = normalizeText(objective)
  const tags = new Set<string>()

  if (normalized.includes('retraite')) tags.add('retraite')
  if (normalized.includes('fiscal')) tags.add('fiscalite')
  if (normalized.includes('divers')) tags.add('diversification')
  if (normalized.includes('revenu')) tags.add('revenus')
  if (normalized.includes('capital')) tags.add('capital')
  if (normalized.includes('protec')) tags.add('protection')
  if (normalized.includes('transmis')) tags.add('transmission')
  if (normalized.includes('liquid')) tags.add('liquidite')
  if (normalized.includes('valor')) tags.add('valorisation')
  if (normalized.includes('immobilier')) tags.add('immobilier')

  return Array.from(tags)
}

function getConvictionScore(value?: DcpConviction) {
  if (value === 'forte') return 10
  if (value === 'bonne') return 6
  if (value === 'opportuniste') return 2
  return 0
}

function getComplexityPenalty(
  complexityLevel: ContractRecord['complexityLevel'],
  riskProfile: RiskProfile,
) {
  if (complexityLevel === 'Avancé' && riskProfile === 'Prudent') return -8
  if (complexityLevel === 'Patrimonial' && riskProfile === 'Prudent') return -4
  return 0
}

function getLiquidityPenalty(
  liquidityLevel: ContractRecord['liquidityLevel'],
  emergencyMonths: number,
) {
  if (liquidityLevel === 'Faible' && emergencyMonths < 3) return -14
  if (liquidityLevel === 'Faible' && emergencyMonths < 6) return -6
  return 0
}

function getDebtPenalty(
  productStructure: ProductStructure,
  debtRatio: number,
) {
  if (productStructure === 'immobilier' && debtRatio >= 40) return -12
  if (productStructure === 'immobilier' && debtRatio >= 30) return -6
  return 0
}

function getSuitabilityPenalty(
  item: ContractRecord,
  params: {
    tmi: number
    emergencyMonths: number
    debtRatio: number
    baseInitialCapital: number
  },
) {
  const rules = item.suitabilityRules
  if (!rules) return 0

  let penalty = 0

  if (typeof rules.minTmi === 'number' && params.tmi < rules.minTmi) {
    penalty -= 16
  }

  if (
    typeof rules.minEmergencyMonths === 'number' &&
    params.emergencyMonths < rules.minEmergencyMonths
  ) {
    penalty -= 16
  }

  if (
    typeof rules.maxDebtRatio === 'number' &&
    params.debtRatio > rules.maxDebtRatio
  ) {
    penalty -= 14
  }

  if (
    typeof rules.minInitialCapital === 'number' &&
    params.baseInitialCapital < rules.minInitialCapital
  ) {
    penalty -= 18
  }

  return penalty
}

function getObjectiveMatchScore(item: ContractRecord, objective: string) {
  const inputTags = extractObjectiveTags(objective)
  if (inputTags.length === 0) return 0

  const contractTags = item.objectiveTags ?? []
  const matches = inputTags.filter((tag) => contractTags.includes(tag)).length

  if (matches >= 2) return 25
  if (matches === 1) return 14
  return 0
}

export const contractsCatalog: ContractRecord[] = [
  {
    id: 'generali-himalia-av',
    envelope: 'Assurance-vie',
    tier: 'core',
    contractName: 'Himalia',
    insurer: 'Generali Vie',
    distributor: 'Generali Patrimoine',
    providerGroup: 'Generali',
    contractType: 'Assurance-vie multisupport',
    productStructure: 'assurance',
    objectiveTags: ['diversification', 'valorisation', 'transmission', 'liquidite'],
    dcpConviction: 'forte',
    suitabilityRules: {
      minEmergencyMonths: 1,
    },
    minimumInitialLabel: '5 000 €',
    minimumAdditionalLabel: '2 000 €',
    minimumProgrammedLabel: '75 € / mois',
    periodicities: ['Mensuel', 'Trimestriel', 'Semestriel', 'Annuel'],
    entryFeesLabel: '4,50 % max',
    managementFeesEuroLabel: '0,90 % / an',
    managementFeesUcLabel:
      '1,00 % / an (UC classiques) ; 1,50 % max ETF / titres vifs',
    arbitrationFeesLabel: '1 % max, min 30 € courrier ; min 15 € en ligne',
    ucAvailable: true,
    euroFundAvailable: true,
    growthFundAvailable: true,
    etfAvailable: true,
    directSecuritiesAvailable: true,
    realEstateAvailable: true,
    privateEquityAvailable: true,
    structuredProductsAvailable: true,
    managementModes: ['Gestion libre', 'Gestion pilotée'],
    supportsSummary:
      'UC, fonds euro Actif Général Generali Vie, G Croissance 2020, immobilier, ETF, titres vifs, private equity, produits structurés',
    digitalSummary:
      'Consultation, transactions en ligne, souscription dématérialisée, espace client',
    profileFit: ['Prudent', 'Équilibré'],
    scenarioFit: ['secure', 'balanced'],
    preferredObjectives: [
      'Diversifier le patrimoine',
      'Valoriser un capital',
      'Transmettre le patrimoine',
      'Conserver une forte liquidité',
    ],
    liquidityLevel: 'Intermédiaire',
    complexityLevel: 'Standard',
    targetClient:
      'Client prudent à équilibré recherchant un socle patrimonial lisible',
    roleInStrategy:
      'Socle assurance-vie polyvalent pour protection, diversification et transmission',
    strengths: [
      'Contrat CGP polyvalent',
      'Gestion libre et pilotée',
      'Univers supports large',
      'Digitalisation correcte',
    ],
    watchPoints: [
      'Ticket d’entrée plus élevé que certains contrats concurrents',
      'Bien calibrer la part UC selon profil',
    ],
    expectedReturnHypothesis: {
      secure: '2,5 % à 3,5 %',
      balanced: '3,5 % à 4,5 %',
      growth: '4,0 % à 5,0 %',
      disclaimer:
        'Hypothèses indicatives non garanties, hors frais et fiscalité personnelle.',
    },
    sourceLabel: 'Présentation Generali + fiche Himalia',
  },

  {
    id: 'generali-himalia-capi',
    envelope: 'Contrat de capitalisation',
    tier: 'core',
    contractName: 'Himalia Capi',
    insurer: 'Generali Vie',
    distributor: 'Generali Patrimoine',
    providerGroup: 'Generali',
    contractType: 'Contrat de capitalisation multisupport',
    productStructure: 'assurance',
    objectiveTags: ['valorisation', 'diversification', 'transmission'],
    dcpConviction: 'bonne',
    suitabilityRules: {
      minEmergencyMonths: 1,
    },
    minimumInitialLabel: '5 000 €',
    minimumAdditionalLabel: '2 000 €',
    minimumProgrammedLabel: '75 € / mois',
    periodicities: ['Mensuel', 'Trimestriel', 'Semestriel', 'Annuel'],
    entryFeesLabel: '4,50 % max',
    managementFeesEuroLabel: '0,90 % / an',
    managementFeesUcLabel:
      '1,00 % / an (UC classiques) ; 1,50 % max ETF / titres vifs',
    arbitrationFeesLabel: '1 % max, min 30 € courrier ; min 15 € en ligne',
    ucAvailable: true,
    euroFundAvailable: true,
    growthFundAvailable: true,
    etfAvailable: true,
    directSecuritiesAvailable: true,
    realEstateAvailable: true,
    privateEquityAvailable: true,
    structuredProductsAvailable: true,
    managementModes: ['Gestion libre', 'Gestion pilotée'],
    supportsSummary:
      'Même univers patrimonial que Himalia en enveloppe capitalisation',
    digitalSummary: 'Parcours et gestion digitale dans l’univers Generali',
    profileFit: ['Équilibré', 'Dynamique'],
    scenarioFit: ['balanced', 'growth'],
    preferredObjectives: [
      'Valoriser un capital',
      'Diversifier le patrimoine',
      'Transmettre le patrimoine',
    ],
    liquidityLevel: 'Intermédiaire',
    complexityLevel: 'Patrimonial',
    targetClient: 'Client patrimonial ou besoin de structuration plus technique',
    roleInStrategy:
      'Capitalisation patrimoniale et enveloppe technique complémentaire',
    strengths: [
      'Version capi du socle Himalia',
      'Large univers UC',
      'Peut répondre à des besoins patrimoniaux spécifiques',
    ],
    watchPoints: [
      'À distinguer clairement de l’assurance-vie dans le devoir de conseil',
    ],
    expectedReturnHypothesis: {
      secure: '2,5 % à 3,5 %',
      balanced: '3,5 % à 4,5 %',
      growth: '4,0 % à 5,0 %',
      disclaimer:
        'Hypothèses indicatives non garanties, hors frais et fiscalité personnelle.',
    },
    sourceLabel: 'Présentation Generali',
  },

  {
    id: 'generali-per',
    envelope: 'PER',
    tier: 'core',
    contractName: 'Le PER Generali Patrimoine',
    insurer: 'Generali Vie',
    distributor: 'Generali Patrimoine',
    providerGroup: 'Generali',
    contractType: 'PER assurantiel',
    productStructure: 'assurance',
    objectiveTags: ['retraite', 'fiscalite'],
    dcpConviction: 'forte',
    suitabilityRules: {
      minTmi: 11,
    },
    minimumInitialLabel: '1 000 € (gestion libre) / 2 000 € (pilotée)',
    minimumAdditionalLabel: '300 € à 1 000 € selon mode',
    minimumProgrammedLabel: '75 € / mois',
    periodicities: ['Mensuel', 'Trimestriel', 'Semestriel', 'Annuel'],
    entryFeesLabel: '4,50 % max',
    managementFeesEuroLabel: '0,90 % / an',
    managementFeesUcLabel: '1,00 % / an ; 1,10 % sur ETF / titres vifs',
    arbitrationFeesLabel: '0,50 % min 30 € ; en ligne min 15 €',
    extraFeesLabel: 'Gestion pilotée / horizon retraite : 0,50 % / an',
    ucAvailable: true,
    euroFundAvailable: true,
    growthFundAvailable: false,
    etfAvailable: true,
    directSecuritiesAvailable: true,
    realEstateAvailable: true,
    privateEquityAvailable: true,
    structuredProductsAvailable: true,
    managementModes: [
      'Gestion libre',
      'Gestion pilotée',
      'Gestion horizon retraite',
    ],
    supportsSummary:
      'Fonds euro PER, immobilier, ETF, titres vifs, FCPR, ISR, univers UC large',
    digitalSummary: 'Opérations en ligne et espace partenaire/client',
    profileFit: ['Équilibré', 'Dynamique'],
    scenarioFit: ['balanced', 'growth'],
    preferredObjectives: ['Préparer la retraite', 'Optimiser la fiscalité'],
    liquidityLevel: 'Faible',
    complexityLevel: 'Standard',
    targetClient: 'Client retraite/fiscalité avec horizon long',
    roleInStrategy: 'Enveloppe retraite et levier fiscal d’entrée',
    strengths: [
      '3 modes de gestion',
      'Bon univers de supports',
      'Lisibilité retraite/fiscalité',
    ],
    watchPoints: [
      'Moins adapté si TMI faible ou horizon court',
      'Blocage retraite à bien expliquer',
    ],
    expectedReturnHypothesis: {
      secure: '2,5 % à 3,5 %',
      balanced: '4,0 % à 5,0 %',
      growth: '5,0 % à 6,0 %',
      disclaimer:
        'Hypothèses indicatives non garanties, hors frais et fiscalité personnelle.',
    },
    sourceLabel: 'Fiche PER Generali Patrimoine',
  },

  {
    id: 'spirica-version-absolue-2',
    envelope: 'Assurance-vie',
    tier: 'core',
    contractName: 'Version Absolue 2',
    insurer: 'Spirica',
    distributor: 'UAF Life Patrimoine',
    providerGroup: 'Crédit Agricole Assurances / Spirica',
    contractType: 'Assurance-vie multisupport',
    productStructure: 'assurance',
    objectiveTags: ['valorisation', 'diversification', 'retraite'],
    dcpConviction: 'forte',
    suitabilityRules: {
      minEmergencyMonths: 1,
    },
    minimumInitialLabel: '1 000 €',
    minimumAdditionalLabel: '750 €',
    minimumProgrammedLabel: '150 € / mois ou trimestre',
    periodicities: ['Mensuel', 'Trimestriel'],
    entryFeesLabel: 'À compléter selon convention',
    managementFeesEuroLabel:
      'Fonds Euro Nouvelle Génération : garantie 97,70 %, frais annuels max 2,30 %',
    managementFeesUcLabel: 'À compléter selon convention',
    arbitrationFeesLabel: 'Arbitrage ponctuel dès 150 €',
    extraFeesLabel: 'Gestion pilotée : 0,50 % max / an',
    ucAvailable: true,
    euroFundAvailable: true,
    growthFundAvailable: true,
    etfAvailable: true,
    directSecuritiesAvailable: true,
    realEstateAvailable: true,
    privateEquityAvailable: true,
    structuredProductsAvailable: true,
    managementModes: ['Gestion libre', 'Gestion pilotée'],
    supportsSummary:
      'Plus de 1 000 UC, immobilier, ETF, titres vifs, private equity, EMTN, support croissance',
    digitalSummary: 'Signature électronique, arbitrages en ligne, extranet UAF',
    profileFit: ['Équilibré', 'Dynamique'],
    scenarioFit: ['balanced', 'growth'],
    preferredObjectives: [
      'Valoriser un capital',
      'Diversifier le patrimoine',
      'Préparer la retraite',
    ],
    liquidityLevel: 'Intermédiaire',
    complexityLevel: 'Standard',
    targetClient:
      'Client équilibré à dynamique voulant une AV riche et modulable',
    roleInStrategy:
      'Assurance-vie de diversification long terme à forte profondeur de supports',
    strengths: [
      'Univers supports très riche',
      'Immobilier + ETF + PE + EMTN',
      'Accessible dès 1 000 €',
    ],
    watchPoints: [
      'À bien doser pour les profils prudents',
      'Lecture plus technique que certains contrats plus simples',
    ],
    expectedReturnHypothesis: {
      secure: '2,5 % à 3,5 %',
      balanced: '4,0 % à 5,5 %',
      growth: '5,0 % à 6,5 %',
      disclaimer:
        'Hypothèses indicatives non garanties, hors frais et fiscalité personnelle.',
    },
    sourceLabel: 'Fiche Version Absolue 2 + présentation UAF',
  },

  {
    id: 'spirica-version-absolue-retraite',
    envelope: 'PER',
    tier: 'core',
    contractName: 'Version Absolue Retraite',
    insurer: 'Spirica',
    distributor: 'UAF Life Patrimoine',
    providerGroup: 'Crédit Agricole Assurances / Spirica',
    contractType: 'PER individuel multisupport',
    productStructure: 'assurance',
    objectiveTags: ['retraite', 'fiscalite'],
    dcpConviction: 'forte',
    suitabilityRules: {
      minTmi: 11,
    },
    minimumInitialLabel: '500 € à 1 000 € selon mode',
    minimumAdditionalLabel: '500 € à 750 € selon mode',
    minimumProgrammedLabel: '150 €',
    periodicities: ['Mensuel', 'Trimestriel'],
    entryFeesLabel: 'À compléter selon convention',
    managementFeesEuroLabel:
      'Fonds Euro PER Nouvelle Génération : garantie 97,7 %, frais annuels max 2,3 %',
    managementFeesUcLabel: 'À compléter selon convention',
    arbitrationFeesLabel: 'À compléter',
    extraFeesLabel: 'Gestion pilotée : 0,50 % max / an',
    ucAvailable: true,
    euroFundAvailable: true,
    growthFundAvailable: true,
    etfAvailable: true,
    directSecuritiesAvailable: true,
    realEstateAvailable: true,
    privateEquityAvailable: true,
    structuredProductsAvailable: true,
    managementModes: [
      'Gestion libre',
      'Gestion pilotée',
      'Gestion pilotée à horizon',
    ],
    supportsSummary:
      'Univers Version Absolue appliqué à la retraite : immobilier, ETF, PE, EMTN, support croissance',
    digitalSummary: 'Parcours digital UAF / Spirica',
    profileFit: ['Équilibré', 'Dynamique'],
    scenarioFit: ['balanced', 'growth'],
    preferredObjectives: ['Préparer la retraite', 'Optimiser la fiscalité'],
    liquidityLevel: 'Faible',
    complexityLevel: 'Standard',
    targetClient:
      'Client retraite/fiscalité avec horizon long et volonté de supports riches',
    roleInStrategy:
      'PER de diversification large avec vraie profondeur d’investissement',
    strengths: [
      'Retraite + univers UC très large',
      'Gestion horizon disponible',
      'Immobilier et structurés accessibles',
    ],
    watchPoints: [
      'Plus technique qu’un PER d’entrée de gamme',
      'À réserver à des clients adaptés à la richesse d’offre',
    ],
    expectedReturnHypothesis: {
      secure: '2,5 % à 3,5 %',
      balanced: '4,0 % à 5,5 %',
      growth: '5,0 % à 6,5 %',
      disclaimer:
        'Hypothèses indicatives non garanties, hors frais et fiscalité personnelle.',
    },
    sourceLabel: 'Fiche Version Absolue Retraite + présentation UAF',
  },

  {
    id: 'swisslife-expert-premium-plus',
    envelope: 'Assurance-vie',
    tier: 'core',
    contractName: 'Expert Premium Plus',
    insurer: 'Swiss Life',
    distributor: 'Swiss Life',
    providerGroup: 'Swiss Life',
    contractType: 'Assurance-vie / épargne patrimoniale',
    productStructure: 'assurance',
    objectiveTags: ['valorisation', 'diversification', 'retraite'],
    dcpConviction: 'bonne',
    suitabilityRules: {
      minEmergencyMonths: 1,
    },
    minimumInitialLabel: '3 000 €',
    minimumProgrammedLabel: '100 €',
    periodicities: ['Mensuel'],
    entryFeesLabel: '4,75 % max',
    managementFeesEuroLabel: '0,80 % / an',
    managementFeesUcLabel: '1,10 % / an ; 1,50 % ETF / titres vifs',
    arbitrationFeesLabel: '1 % + 30 €',
    ucAvailable: true,
    euroFundAvailable: true,
    growthFundAvailable: false,
    etfAvailable: true,
    directSecuritiesAvailable: true,
    realEstateAvailable: true,
    privateEquityAvailable: true,
    structuredProductsAvailable: true,
    managementModes: [
      'Allocation libre',
      'Formules d’investissement Swiss Life',
    ],
    supportsSummary:
      'Plus de 1 000 OPCVM, immobilier, ETF, actions en direct, FCPR, structurés, fonds euro',
    digitalSummary:
      'SwissLife One + MySwissLife + souscription/gestion digitalisées',
    profileFit: ['Équilibré', 'Dynamique'],
    scenarioFit: ['balanced', 'growth'],
    preferredObjectives: [
      'Valoriser un capital',
      'Diversifier le patrimoine',
      'Préparer la retraite',
    ],
    liquidityLevel: 'Intermédiaire',
    complexityLevel: 'Standard',
    targetClient:
      'Client équilibré à dynamique recherchant une AV patrimoniale riche',
    roleInStrategy: 'Assurance-vie patrimoniale à forte profondeur de supports',
    strengths: [
      'Très bon univers UC',
      'Immobilier + ETF + titres vifs + private equity',
      'Digitalisation forte',
    ],
    watchPoints: ['Lecture plus technique pour les profils prudents'],
    expectedReturnHypothesis: {
      secure: '2,0 % à 3,0 %',
      balanced: '4,0 % à 5,0 %',
      growth: '5,0 % à 6,5 %',
      disclaimer:
        'Hypothèses indicatives non garanties, hors frais et fiscalité personnelle.',
    },
    sourceLabel: 'Présentation Swiss Life 2025',
  },

  {
    id: 'swisslife-per-individuel',
    envelope: 'PER',
    tier: 'core',
    contractName: 'PER Individuel Swiss Life',
    insurer: 'Swiss Life',
    distributor: 'Swiss Life',
    providerGroup: 'Swiss Life',
    contractType: 'PER individuel',
    productStructure: 'assurance',
    objectiveTags: ['retraite', 'fiscalite'],
    dcpConviction: 'bonne',
    suitabilityRules: {
      minTmi: 11,
    },
    minimumInitialLabel: '900 €',
    minimumProgrammedLabel: '150 €',
    periodicities: ['Mensuel'],
    entryFeesLabel: '4,75 % max',
    managementFeesEuroLabel: '0,65 % / an',
    managementFeesUcLabel: '0,96 % / an',
    arbitrationFeesLabel: '0,2 % + 30 € ; 1 arbitrage gratuit/an',
    extraFeesLabel: 'Frais AGIS : 25 €',
    ucAvailable: true,
    euroFundAvailable: true,
    growthFundAvailable: false,
    etfAvailable: false,
    directSecuritiesAvailable: false,
    realEstateAvailable: true,
    privateEquityAvailable: false,
    structuredProductsAvailable: true,
    managementModes: [
      'Allocation libre',
      'Pilotage retraite prudent/équilibré/dynamique',
    ],
    supportsSummary:
      'Plus de 700 fonds, immobilier, structurés, fonds euro, options d’arbitrage',
    digitalSummary: 'SwissLife One + MySwissLife',
    profileFit: ['Équilibré', 'Dynamique'],
    scenarioFit: ['balanced', 'growth'],
    preferredObjectives: ['Préparer la retraite', 'Optimiser la fiscalité'],
    liquidityLevel: 'Faible',
    complexityLevel: 'Standard',
    targetClient:
      'Client retraite/fiscalité avec besoin PER riche mais lisible',
    roleInStrategy: 'Brique retraite/fiscale Swiss Life',
    strengths: [
      'Bon univers supports retraite',
      'Pilotage retraite clair',
      'Digitalisation forte',
    ],
    watchPoints: ['Moins pertinent si TMI faible ou horizon court'],
    expectedReturnHypothesis: {
      secure: '2,0 % à 3,0 %',
      balanced: '4,0 % à 5,0 %',
      growth: '5,0 % à 6,0 %',
      disclaimer:
        'Hypothèses indicatives non garanties, hors frais et fiscalité personnelle.',
    },
    sourceLabel: 'Présentation Swiss Life 2025',
  },

  {
    id: 'swisslife-pea-direct-securities',
    envelope: 'PEA',
    tier: 'core',
    contractName: 'PEA Direct Securities',
    insurer: 'Direct Securities',
    distributor: 'Swiss Life',
    providerGroup: 'Swiss Life / Direct Securities',
    contractType: 'PEA',
    productStructure: 'titres',
    objectiveTags: ['diversification', 'valorisation', 'capital'],
    dcpConviction: 'bonne',
    suitabilityRules: {
      minEmergencyMonths: 2,
    },
    minimumInitialLabel: 'Sans minimum annoncé',
    ucAvailable: false,
    euroFundAvailable: false,
    growthFundAvailable: false,
    etfAvailable: true,
    directSecuritiesAvailable: true,
    realEstateAvailable: false,
    privateEquityAvailable: false,
    structuredProductsAvailable: false,
    managementModes: ['Compte-titres / PEA en ligne'],
    supportsSummary: 'PEA digitalisé, logique marché / ETF / titres',
    digitalSummary: 'Souscription 100 % digitalisée, espace client dédié',
    profileFit: ['Équilibré', 'Dynamique'],
    scenarioFit: ['balanced', 'growth'],
    preferredObjectives: ['Valoriser un capital', 'Diversifier le patrimoine'],
    liquidityLevel: 'Intermédiaire',
    complexityLevel: 'Standard',
    targetClient: 'Client à l’aise avec la poche marché et l’horizon long',
    roleInStrategy: 'Poche marché logée en PEA',
    strengths: ['Parcours digital', 'Brique marché claire'],
    watchPoints: ['Pas adapté aux profils très prudents'],
    sourceLabel: 'Présentation Swiss Life 2025',
  },

  {
    id: 'swisslife-cto-direct-securities',
    envelope: 'CTO',
    tier: 'core',
    contractName: 'Compte-titres Direct Securities',
    insurer: 'Direct Securities',
    distributor: 'Swiss Life',
    providerGroup: 'Swiss Life / Direct Securities',
    contractType: 'Compte-titres ordinaire',
    productStructure: 'titres',
    objectiveTags: ['diversification', 'valorisation', 'capital'],
    dcpConviction: 'opportuniste',
    suitabilityRules: {
      minEmergencyMonths: 3,
    },
    minimumInitialLabel: 'Sans minimum annoncé',
    ucAvailable: false,
    euroFundAvailable: false,
    growthFundAvailable: false,
    etfAvailable: true,
    directSecuritiesAvailable: true,
    realEstateAvailable: false,
    privateEquityAvailable: false,
    structuredProductsAvailable: false,
    managementModes: ['Compte-titres en ligne'],
    supportsSummary: 'Compte-titres digitalisé, logique marché / ETF / titres',
    digitalSummary: 'Souscription 100 % digitalisée, espace client dédié',
    profileFit: ['Équilibré', 'Dynamique'],
    scenarioFit: ['balanced', 'growth'],
    preferredObjectives: ['Valoriser un capital', 'Diversifier le patrimoine'],
    liquidityLevel: 'Intermédiaire',
    complexityLevel: 'Standard',
    targetClient:
      'Client voulant une poche marché souple hors enveloppe fiscale PEA',
    roleInStrategy: 'Poche marché flexible',
    strengths: ['Parcours digital', 'Souplesse CTO'],
    watchPoints: ['Fiscalité CTO à intégrer dans le conseil'],
    sourceLabel: 'Présentation Swiss Life 2025',
  },

  {
    id: 'interinvest-scpi-tertiom',
    envelope: 'SCPI',
    tier: 'complementary',
    contractName: 'SCPI Elevation Tertiom',
    insurer: 'N/A',
    distributor: 'Inter Invest / Elevation Capital Partners',
    providerGroup: 'Inter Invest',
    contractType: 'SCPI de rendement',
    productStructure: 'immobilier',
    objectiveTags: ['revenus', 'diversification', 'immobilier'],
    dcpConviction: 'bonne',
    suitabilityRules: {
      minEmergencyMonths: 3,
      maxDebtRatio: 39,
    },
    minimumInitialLabel: '200 € la part',
    minimumProgrammedLabel:
      'Versement mensuel possible dès 1 € après souscription minimum',
    periodicities: ['Mensuel'],
    ucAvailable: false,
    euroFundAvailable: false,
    managementModes: [
      'Souscription au comptant ou à crédit',
      'Pleine propriété ou démembrement',
    ],
    supportsSummary:
      'SCPI de rendement dédiée à l’immobilier tertiaire d’Outre-mer',
    digitalSummary: 'Parcours de souscription 100 % en ligne',
    profileFit: ['Équilibré', 'Dynamique'],
    scenarioFit: ['balanced', 'growth'],
    preferredObjectives: [
      'Générer des revenus complémentaires',
      'Diversifier le patrimoine',
    ],
    liquidityLevel: 'Faible',
    complexityLevel: 'Patrimonial',
    targetClient:
      'Client acceptant une liquidité plus contrainte et un horizon long',
    roleInStrategy: 'Diversification immobilière indirecte',
    strengths: [
      'SCPI originale',
      'Souscription souple',
      'Éligible au PER Mon PER d’Inter Invest',
    ],
    watchPoints: ['Capital non garanti', 'Liquidité plus faible'],
    expectedReturnHypothesis: {
      balanced: 'Objectif TD 8 % / TRI 9 %',
      growth: 'Objectif TD 8 % / TRI 9 %',
      disclaimer:
        'Objectifs non garantis, dépendants des actifs et des marchés.',
    },
    sourceLabel: 'Présentation SCPI Tertiom',
  },

  {
    id: 'interinvest-nue-propriete',
    envelope: 'Nue-propriété',
    tier: 'complementary',
    contractName: 'Inter Invest Immobilier – Nue-propriété',
    insurer: 'N/A',
    distributor: 'Inter Invest',
    providerGroup: 'Inter Invest',
    contractType: 'Immobilier en nue-propriété',
    productStructure: 'immobilier',
    objectiveTags: ['retraite', 'valorisation', 'transmission', 'immobilier'],
    dcpConviction: 'opportuniste',
    suitabilityRules: {
      minEmergencyMonths: 6,
      maxDebtRatio: 35,
    },
    minimumInitialLabel: 'Variable selon programme',
    ucAvailable: false,
    euroFundAvailable: false,
    managementModes: ['Acquisition directe en nue-propriété'],
    supportsSummary:
      'Programmes immobiliers en nue-propriété, logique de décote et reconstitution de pleine propriété',
    profileFit: ['Équilibré', 'Dynamique'],
    scenarioFit: ['balanced', 'growth'],
    preferredObjectives: [
      'Préparer la retraite',
      'Valoriser un capital',
      'Transmettre le patrimoine',
    ],
    liquidityLevel: 'Faible',
    complexityLevel: 'Patrimonial',
    targetClient:
      'Client patrimonial avec horizon long et sans besoin de revenus immédiats',
    roleInStrategy: 'Brique immobilière patrimoniale long terme',
    strengths: ['Décote à l’entrée', 'Approche patrimoniale long terme'],
    watchPoints: ['Immobilisation longue', 'Peu adapté si besoin de liquidité'],
    sourceLabel: 'Brochures immobilières Inter Invest',
  },

  {
    id: 'interinvest-solvest-seleny-ii',
    envelope: 'Produit structuré',
    tier: 'complementary',
    contractName: 'Solvest Seleny II',
    insurer: 'Société Générale (émetteur)',
    distributor: 'Inter Invest',
    providerGroup: 'Inter Invest',
    contractType: 'Produit structuré à capital garanti à maturité',
    productStructure: 'structure',
    objectiveTags: ['diversification', 'valorisation'],
    dcpConviction: 'opportuniste',
    suitabilityRules: {
      minEmergencyMonths: 4,
    },
    minimumInitialLabel: 'À compléter selon bulletin / distribution',
    ucAvailable: false,
    euroFundAvailable: false,
    managementModes: ['Souscription directe / selon enveloppe compatible'],
    supportsSummary:
      'Produit structuré avec remboursement anticipé possible et capital garanti à maturité',
    profileFit: ['Équilibré', 'Dynamique'],
    scenarioFit: ['balanced', 'growth'],
    preferredObjectives: [
      'Valoriser un capital',
      'Diversifier le patrimoine',
    ],
    liquidityLevel: 'Intermédiaire',
    complexityLevel: 'Avancé',
    targetClient: 'Client patrimonial acceptant une mécanique structurée',
    roleInStrategy: 'Brique complémentaire de diversification structurée',
    strengths: ['Capital garanti à maturité', 'Coupon conditionnel attractif'],
    watchPoints: [
      'Complexité du mécanisme',
      'Pas une solution cœur de gamme universelle',
    ],
    expectedReturnHypothesis: {
      balanced: 'Coupon 10 % / an en cas de rappel',
      growth: 'Coupon 10 % / an en cas de rappel',
      disclaimer:
        'Mécanisme conditionnel non garanti, dépend du sous-jacent et de la tenue à maturité.',
    },
    sourceLabel: 'Présentation partenaire Solvest Seleny II',
  },

  {
    id: 'interinvest-girardin-2025',
    envelope: 'Fiscal',
    tier: 'complementary',
    contractName: 'Girardin 2025',
    insurer: 'N/A',
    distributor: 'Inter Invest',
    providerGroup: 'Inter Invest',
    contractType: 'Solution fiscale',
    productStructure: 'fiscal',
    objectiveTags: ['fiscalite'],
    dcpConviction: 'opportuniste',
    suitabilityRules: {
      minTmi: 30,
      minEmergencyMonths: 4,
    },
    minimumInitialLabel: 'À compléter selon offre / millésime',
    ucAvailable: false,
    euroFundAvailable: false,
    managementModes: ['Souscription fiscale dédiée'],
    supportsSummary: 'Solution de réduction d’impôt spécifique',
    profileFit: ['Équilibré', 'Dynamique'],
    scenarioFit: ['growth'],
    preferredObjectives: ['Optimiser la fiscalité'],
    liquidityLevel: 'Faible',
    complexityLevel: 'Avancé',
    targetClient: 'Client fiscalisé avec besoin d’optimisation ciblée',
    roleInStrategy:
      'Solution fiscale complémentaire, hors socle patrimonial standard',
    strengths: ['Levier fiscal spécifique'],
    watchPoints: [
      'À réserver aux cas adaptés',
      'Ne doit pas remplacer l’architecture patrimoniale de base',
    ],
    sourceLabel: 'Brochure Girardin 2025',
  },
]

export function getContractsByEnvelope(envelope: ContractEnvelope) {
  return contractsCatalog.filter((item) => item.envelope === envelope)
}

export function getCoreContracts() {
  return contractsCatalog.filter((item) => item.tier === 'core')
}

export function getRecommendedContracts(params: {
  riskProfile: RiskProfile
  objective: string
  scenarioKey: ScenarioKey
  tmi?: string | number
  emergencyMonths?: number
  debtRatio?: number
  baseInitialCapital?: number
  includeAdvanced?: boolean
  includeComplementary?: boolean
}) {
  const {
    riskProfile,
    objective,
    scenarioKey,
    tmi = 0,
    emergencyMonths = 0,
    debtRatio = 0,
    baseInitialCapital = 0,
    includeAdvanced = false,
    includeComplementary = false,
  } = params

  const tmiValue = toSafeNumber(tmi)

  return contractsCatalog
    .filter((item) => {
      if (item.tier === 'advanced' && !includeAdvanced) return false
      if (item.tier === 'complementary' && !includeComplementary) return false
      return true
    })
    .map((item) => {
      let score = 0

      if (item.profileFit.includes(riskProfile)) score += 30
      if (item.scenarioFit.includes(scenarioKey)) score += 20

      score += getObjectiveMatchScore(item, objective)

      if (item.tier === 'core') score += 10
      if (item.tier === 'advanced') score += 4
      if (item.tier === 'complementary') score += 2

      score += getConvictionScore(item.dcpConviction)

      score += getComplexityPenalty(item.complexityLevel, riskProfile)
      score += getLiquidityPenalty(item.liquidityLevel, emergencyMonths)
      score += getDebtPenalty(item.productStructure, debtRatio)

      score += getSuitabilityPenalty(item, {
        tmi: tmiValue,
        emergencyMonths,
        debtRatio,
        baseInitialCapital,
      })

      return { ...item, recommendationScore: score }
    })
    .sort((a, b) => b.recommendationScore - a.recommendationScore)
}

export function getEnvelopeRecommendations(params: {
  riskProfile: RiskProfile
  objective: string
  tmi: string | number
  emergencyMonths: number
  debtRatio: number
}) {
  const { riskProfile, objective, tmi, emergencyMonths, debtRatio } = params
  const tmiValue = toSafeNumber(tmi)
  const objectiveTags = extractObjectiveTags(objective)

  const recommended: ContractEnvelope[] = []
  const secondary: ContractEnvelope[] = []
  const caution: ContractEnvelope[] = []

  recommended.push('Assurance-vie')

  if (
    objectiveTags.includes('retraite') ||
    objectiveTags.includes('fiscalite') ||
    tmiValue >= 30
  ) {
    recommended.push('PER')
  } else {
    secondary.push('PER')
  }

  if (riskProfile === 'Prudent') {
    secondary.push('PEA')
    caution.push('CTO', 'Produit structuré')
  } else if (riskProfile === 'Équilibré') {
    secondary.push('PEA')
    secondary.push('Contrat de capitalisation')
    caution.push('CTO')
  } else {
    secondary.push('PEA', 'CTO', 'Contrat de capitalisation')
  }

  if (
    (objectiveTags.includes('revenus') ||
      objectiveTags.includes('diversification') ||
      objectiveTags.includes('immobilier')) &&
    emergencyMonths >= 3 &&
    debtRatio < 40
  ) {
    secondary.push('SCPI')
  } else {
    caution.push('SCPI')
  }

  if (objectiveTags.includes('transmission') && riskProfile !== 'Prudent') {
    secondary.push('Contrat de capitalisation')
  }

  if (objectiveTags.includes('fiscalite') && tmiValue >= 30) {
    secondary.push('Fiscal')
  }

  if (riskProfile === 'Dynamique' && emergencyMonths >= 4) {
    secondary.push('Produit structuré')
  } else {
    caution.push('Produit structuré')
  }

  if (emergencyMonths < 3) {
    caution.push('SCPI', 'Nue-propriété', 'Produit structuré', 'Fiscal')
  }

  return {
    recommended: Array.from(new Set(recommended)),
    secondary: Array.from(new Set(secondary)),
    caution: Array.from(new Set(caution)),
  }
}

export function getEnvelopeDisplayLabel(envelope: ContractEnvelope) {
  if (envelope === 'CTO') return 'Compte-titres ordinaire'
  if (envelope === 'Fiscal') return 'Solution fiscale'
  if (envelope === 'Lux') return 'Contrat luxembourgeois'
  return envelope
}

export function getEnvelopeRoleLabel(envelope: ContractEnvelope) {
  if (envelope === 'Assurance-vie') return 'Socle polyvalent de diversification, souplesse et transmission'
  if (envelope === 'PER') return 'Brique retraite et, selon le cas, levier fiscal'
  if (envelope === 'PEA') return 'Poche actions long terme dans un cadre fiscal dédié'
  if (envelope === 'CTO') return 'Poche de marché complémentaire, plus souple mais fiscalement moins favorable'
  if (envelope === 'SCPI') return 'Diversification immobilière indirecte'
  if (envelope === 'Contrat de capitalisation') return 'Enveloppe patrimoniale technique de capitalisation'
  if (envelope === 'Nue-propriété') return 'Brique immobilière patrimoniale long terme'
  if (envelope === 'Produit structuré') return 'Diversification complémentaire à mécanique encadrée'
  if (envelope === 'Fiscal') return 'Levier fiscal spécifique, non destiné à remplacer le socle patrimonial'
  if (envelope === 'Lux') return 'Structuration patrimoniale haut de gamme'
  return 'Enveloppe patrimoniale'
}

export function getEnvelopeSupportVocabulary(envelope: ContractEnvelope) {
  if (envelope === 'Assurance-vie') {
    return {
      primary: 'Fonds euros / poche prudente',
      secondary: 'Unités de compte / diversification',
    }
  }

  if (envelope === 'PER') {
    return {
      primary: 'Poche prudente retraite',
      secondary: 'Poche long terme diversifiée',
    }
  }

  if (envelope === 'Contrat de capitalisation') {
    return {
      primary: 'Poche prudente',
      secondary: 'Poche diversifiée',
    }
  }

  if (envelope === 'PEA') {
    return {
      primary: 'Liquidités / poche d’attente',
      secondary: 'ETF / actions éligibles',
    }
  }

  if (envelope === 'CTO') {
    return {
      primary: 'Trésorerie / poche défensive',
      secondary: 'Obligations / ETF / actions',
    }
  }

  if (envelope === 'SCPI') {
    return {
      primary: 'Immobilier indirect',
      secondary: 'Revenus potentiels / valorisation long terme',
    }
  }

  if (envelope === 'Nue-propriété') {
    return {
      primary: 'Immobilier démembré',
      secondary: 'Valorisation long terme',
    }
  }

  if (envelope === 'Produit structuré') {
    return {
      primary: 'Scénario défini à l’entrée',
      secondary: 'Mécanique conditionnelle',
    }
  }

  if (envelope === 'Fiscal') {
    return {
      primary: 'Objectif de réduction d’impôt',
      secondary: 'Solution ciblée et encadrée',
    }
  }

  if (envelope === 'Lux') {
    return {
      primary: 'Architecture patrimoniale premium',
      secondary: 'Structuration avancée',
    }
  }

  return {
    primary: 'Poche principale',
    secondary: 'Poche complémentaire',
  }
}
