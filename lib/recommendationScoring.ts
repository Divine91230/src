export type ScenarioKey = 'secure' | 'balanced' | 'growth'
export type RiskProfile = 'Prudent' | 'Équilibré' | 'Dynamique'

export type ScenarioScoringInput = {
  riskProfile: RiskProfile
  tmi: string | number
  emergencyMonths: number
  debtRatio: number
  realEstateWeight: number
  selectedSavings: number
  baseInitialCapital: number
  baseMonthlyContribution: number
  objective: string
  secondaryObjective?: string
  fundingMode?: 'capacity_only' | 'existing_only' | 'mixed'
  investingMode?: 'alone' | 'couple'
  hasInitialLumpSum?: boolean
  hasMonthlyContribution?: boolean
  liquidityNeed?: 'high' | 'medium' | 'low'
  flexibilityNeed?: 'high' | 'medium' | 'low'
  illiquidityTolerance?: 'low' | 'medium' | 'high'
  spouseProtected?: boolean
  dependantsProtected?: boolean
  hasDeathCoverage?: boolean
  hasDisabilityCoverage?: boolean
  investmentHorizonYears?: number
}

export type ScenarioScoreBreakdown = {
  scenarioKey: ScenarioKey
  score: number
  reasons: string[]
  warnings: string[]
}

function toSafeNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const normalized = value.replace('%', '').replace(',', '.').trim()
    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function normalizeScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)))
}

function normalizeText(value: string | undefined) {
  return (value || '').trim().toLowerCase()
}

function baseScenario(scenarioKey: ScenarioKey): ScenarioScoreBreakdown {
  return {
    scenarioKey,
    score: 50,
    reasons: [],
    warnings: [],
  }
}

function add(target: ScenarioScoreBreakdown, value: number, reason: string) {
  target.score += value
  if (value >= 0) target.reasons.push(reason)
  else target.warnings.push(reason)
}

function getScenarioPriority(scenarioKey: ScenarioKey) {
  if (scenarioKey === 'growth') return 3
  if (scenarioKey === 'balanced') return 2
  return 1
}

export function scoreScenarios(input: ScenarioScoringInput): ScenarioScoreBreakdown[] {
  const secure = baseScenario('secure')
  const balanced = baseScenario('balanced')
  const growth = baseScenario('growth')

  const scores = { secure, balanced, growth }

  const tmiValue = toSafeNumber(input.tmi)
  const objective = normalizeText(input.objective)
  const secondaryObjective = normalizeText(input.secondaryObjective)
  const horizonYears = toSafeNumber(input.investmentHorizonYears)

  if (input.riskProfile === 'Prudent') {
    add(scores.secure, 30, 'Profil prudent cohérent avec une trajectoire sécurisée.')
    add(scores.balanced, 4, 'Le scénario équilibré ne peut être envisagé que de façon encadrée et progressive.')
    add(scores.growth, -16, 'Le scénario croissance paraît plus ambitieux que le profil retenu.')
  }

  if (input.riskProfile === 'Équilibré') {
    add(scores.secure, 10, 'Une base prudente reste défendable.')
    add(scores.balanced, 24, 'Le profil équilibré correspond naturellement au scénario central.')
    add(scores.growth, 8, 'Une montée en puissance reste possible à horizon long.')
  }

  if (input.riskProfile === 'Dynamique') {
    add(scores.secure, -6, 'Le scénario sécurisation peut sembler trop prudent pour ce profil.')
    add(scores.balanced, 14, 'Le scénario équilibré reste une base structurée.')
    add(scores.growth, 26, 'Le profil dynamique soutient mieux une trajectoire de croissance.')
  }

  if (horizonYears > 0 && horizonYears <= 3) {
    add(scores.secure, 18, 'Un horizon court favorise une approche plus prudente.')
    add(scores.balanced, 2, 'Le scénario équilibré reste possible avec vigilance.')
    add(scores.growth, -16, 'Un horizon court pénalise une stratégie de croissance.')
  } else if (horizonYears > 3 && horizonYears <= 8) {
    add(scores.secure, 8, 'Une base prudente peut rester utile à moyen terme.')
    add(scores.balanced, 12, 'Le moyen terme soutient une stratégie équilibrée seulement si le profil le permet.')
    add(scores.growth, 2, 'Une logique de croissance partielle reste possible.')
  } else if (horizonYears > 8) {
    add(scores.balanced, 8, 'Un horizon long autorise une structuration progressive.')
    add(scores.growth, 14, 'Un horizon long soutient mieux une trajectoire de croissance.')
  }

  if (input.emergencyMonths < 3) {
    add(scores.secure, 24, 'Réserve de sécurité insuffisante : priorité à la prudence.')
    add(scores.balanced, -8, 'La réserve actuelle invite à modérer fortement le rythme de déploiement.')
    add(scores.growth, -18, 'Le manque de réserve rend le scénario croissance moins approprié.')
  } else if (input.emergencyMonths < 6) {
    add(scores.secure, 12, 'Réserve existante mais encore à consolider.')
    add(scores.balanced, 4, 'Le scénario équilibré reste possible avec une montée graduelle.')
    add(scores.growth, -6, 'Le scénario croissance demande plus de confort patrimonial.')
  } else {
    add(scores.balanced, 8, 'La réserve permet une trajectoire plus sereine.')
    add(scores.growth, 10, 'Le niveau de réserve soutient mieux une logique long terme.')
  }

  if (input.debtRatio >= 40) {
    add(scores.secure, 18, 'Taux d’endettement élevé : prudence recommandée.')
    add(scores.balanced, -4, 'Le scénario équilibré doit être calibré avec vigilance.')
    add(scores.growth, -14, 'Le poids des charges limite la pertinence d’un scénario offensif.')
  } else if (input.debtRatio >= 30) {
    add(scores.secure, 8, 'Charges significatives à prendre en compte.')
    add(scores.balanced, 6, 'Le scénario équilibré reste pertinent si le rythme est maîtrisé.')
    add(scores.growth, -6, 'Le scénario croissance doit rester bien dimensionné.')
  } else {
    add(scores.balanced, 6, 'Le budget permet une structuration plus souple.')
    add(scores.growth, 8, 'Le poids des charges ne bloque pas une logique long terme.')
  }

  const isCapitalGrowthObjective = objective.includes('valoriser un capital')
  const isRetirementObjective = objective.includes('préparer la retraite') || objective.includes('preparer la retraite')
  const isDiversificationObjective = objective.includes('diversifier le patrimoine')
  const isTaxObjective = objective.includes('optimiser la fiscalité') || objective.includes('optimiser la fiscalite')
  const isProtectionObjective = objective.includes('protéger le foyer') || objective.includes('proteger le foyer')
  const isIncomeObjective = objective.includes('générer des revenus complémentaires') || objective.includes('generer des revenus complementaires')
  const isTransmissionObjective = objective.includes('transmettre le patrimoine')
  const isProjectObjective = objective.includes('financer un projet')
  const isLiquidityObjective = objective.includes('conserver une forte liquidité') || objective.includes('conserver une forte liquidite')

  if (isCapitalGrowthObjective) {
    add(scores.balanced, 8, 'La valorisation d’un capital soutient une trajectoire structurée.')
    add(scores.growth, 18, 'La valorisation d’un capital favorise davantage une logique long terme.')
    add(scores.secure, -8, 'Le scénario sécurisation peut sembler sous-dimensionné pour cet objectif.')
  }
  if (isRetirementObjective) {
    add(scores.balanced, 12, 'L’objectif retraite correspond bien à une trajectoire progressive.')
    add(scores.growth, 14, 'L’objectif retraite peut justifier une logique plus long terme.')
  }
  if (isDiversificationObjective) {
    add(scores.balanced, 12, 'La diversification patrimoniale se prête bien à un scénario central.')
    add(scores.growth, 6, 'Une diversification plus offensive reste possible.')
  }
  if (isTaxObjective) {
    add(scores.balanced, 8, 'Le scénario équilibré laisse place à un levier fiscal mesuré.')
    add(scores.growth, 14, 'Le scénario croissance exploite davantage les logiques retraite/fiscalité.')
  }
  if (isProtectionObjective) {
    add(scores.secure, 18, 'L’objectif de protection favorise un scénario plus prudent.')
    add(scores.balanced, 6, 'Le scénario équilibré reste possible s’il conserve une base protectrice.')
    add(scores.growth, -10, 'Le scénario croissance est moins prioritaire face à un besoin de protection.')
  }
  if (isIncomeObjective) {
    add(scores.balanced, 10, 'Le scénario équilibré permet une mise en place plus lisible.')
    add(scores.secure, 6, 'Une base prudente peut rester utile selon le besoin de revenus.')
  }
  if (isTransmissionObjective) {
    add(scores.balanced, 6, 'La transmission s’inscrit bien dans une logique structurée.')
    add(scores.growth, 8, 'Un horizon long peut soutenir une logique de valorisation/transmission.')
  }
  if (isProjectObjective) {
    add(scores.secure, 6, 'Financer un projet peut justifier une lecture plus maîtrisée.')
    add(scores.balanced, 8, 'Le scénario équilibré reste pertinent pour un objectif projet avec horizon lisible.')
  }
  if (isLiquidityObjective) {
    add(scores.secure, 22, 'Le besoin de forte liquidité favorise clairement une trajectoire prudente.')
    add(scores.balanced, -6, 'Le scénario équilibré devient moins pertinent face à un besoin de liquidité fort.')
    add(scores.growth, -18, 'Le scénario croissance est pénalisé par un besoin de liquidité élevé.')
  }

  if (secondaryObjective.includes('diversifier le patrimoine')) add(scores.balanced, 4, 'L’objectif secondaire de diversification renforce la pertinence du scénario équilibré.')
  if (secondaryObjective.includes('optimiser la fiscalité') || secondaryObjective.includes('optimiser la fiscalite')) add(scores.growth, 4, 'Un objectif secondaire d’optimisation fiscale soutient davantage le scénario croissance.')
  if (secondaryObjective.includes('préparer la retraite') || secondaryObjective.includes('preparer la retraite')) add(scores.growth, 4, 'La retraite comme objectif secondaire renforce la logique long terme.')

  if (tmiValue >= 30) {
    add(scores.balanced, 8, 'La TMI ouvre des leviers fiscaux intéressants.')
    add(scores.growth, 12, 'La TMI renforce l’intérêt d’une logique retraite/fiscalité.')
  } else if (tmiValue === 11) {
    add(scores.balanced, 4, 'La logique équilibrée reste pertinente malgré un effet fiscal modéré.')
    add(scores.growth, 1, 'Le scénario croissance reste possible mais moins porté par la fiscalité.')
  } else {
    add(scores.secure, 2, 'L’intérêt fiscal limité ne justifie pas à lui seul une stratégie plus ambitieuse.')
  }

  if (input.realEstateWeight >= 65) {
    add(scores.balanced, 12, 'Le patrimoine concentré sur l’immobilier justifie une diversification graduelle.')
    add(scores.secure, 4, 'Une base prudente garde sa place mais ne traite pas toute la diversification.')
    add(scores.growth, 4, 'Une montée en puissance peut aider, si le budget le permet.')
  }

  if (input.baseMonthlyContribution <= 0 && input.baseInitialCapital <= 0) {
    add(scores.secure, 4, 'Le projet manque encore de base de financement claire.')
    add(scores.balanced, -4, 'Le scénario équilibré nécessite un cadrage plus solide.')
    add(scores.growth, -8, 'Le scénario croissance manque de base de mise en place.')
  }

  if (input.baseMonthlyContribution > 0 && input.selectedSavings > 0) {
    add(scores.balanced, 6, 'Une épargne régulière soutient bien la trajectoire équilibrée.')
    add(scores.growth, 6, 'Une épargne régulière peut soutenir une trajectoire long terme.')
  }

  if (input.baseInitialCapital > 0 && input.hasInitialLumpSum) {
    add(scores.balanced, 4, 'La présence d’un capital initial facilite une structuration immédiate.')
    add(scores.growth, 6, 'Un capital initial soutient mieux une trajectoire long terme.')
  }

  let protectionWeaknessCount = 0
  if (input.hasDeathCoverage === false) protectionWeaknessCount += 1
  if (input.hasDisabilityCoverage === false) protectionWeaknessCount += 1
  if (input.spouseProtected === false) protectionWeaknessCount += 1
  if (input.dependantsProtected === false) protectionWeaknessCount += 1

  if (protectionWeaknessCount === 1) {
    add(scores.secure, 4, 'Un point de fragilité en protection appelle à la vigilance.')
    add(scores.balanced, 2, 'Le scénario équilibré reste possible, sous réserve de consolidation.')
    add(scores.growth, -2, 'Un ajustement de protection reste souhaitable avant une logique plus ambitieuse.')
  }
  if (protectionWeaknessCount >= 2) {
    add(scores.secure, 10, 'La protection du foyer apparaît incomplète, ce qui renforce l’intérêt d’une base prudente.')
    add(scores.balanced, 2, 'Le scénario équilibré reste possible, avec vigilance.')
    add(scores.growth, -8, 'Le scénario croissance devient moins prioritaire tant que la protection n’est pas consolidée.')
  }

  if (input.liquidityNeed === 'high' || input.flexibilityNeed === 'high') {
    add(scores.secure, 14, 'Le besoin de souplesse favorise nettement la prudence.')
    add(scores.balanced, 2, 'Le scénario équilibré ne reste possible que s’il demeure très modulable.')
    add(scores.growth, -12, 'Le besoin de liquidité pénalise un scénario plus contraint.')
  }
  if (input.liquidityNeed === 'low' && input.flexibilityNeed === 'low') {
    add(scores.growth, 4, 'Le besoin limité de liquidité soutient mieux une logique long terme.')
  }
  if (input.illiquidityTolerance === 'high') {
    add(scores.growth, 6, 'La tolérance à l’illiquidité soutient une logique plus long terme.')
  }

  if (input.fundingMode === 'existing_only') {
    add(scores.secure, 4, 'La mobilisation d’enveloppes existantes invite à une lecture prudente.')
    add(scores.balanced, 6, 'Le scénario équilibré permet une réorganisation patrimoniale progressive.')
  }
  if (input.fundingMode === 'mixed') {
    add(scores.balanced, 8, 'Le financement mixte soutient bien une approche équilibrée.')
    add(scores.growth, 4, 'Le mix peut aussi soutenir une logique plus ambitieuse.')
  }
  if (input.fundingMode === 'capacity_only') {
    add(scores.balanced, 6, 'La construction progressive par capacité d’épargne soutient bien le scénario équilibré.')
    add(scores.growth, 2, 'Une logique croissance reste possible si l’horizon et le profil le permettent.')
  }

  if (input.investingMode === 'couple') add(scores.balanced, 2, 'Une logique de couple favorise souvent une trajectoire intermédiaire et structurée.')

  if (input.riskProfile === 'Prudent') {
    if (input.liquidityNeed === 'high') {
      add(scores.secure, 12, 'Pour un profil prudent, un besoin de liquidité élevé renforce clairement le scénario sécurisation.')
      add(scores.balanced, -10, 'Pour un profil prudent, une liquidité élevée limite la pertinence du scénario équilibré.')
      add(scores.growth, -12, 'Pour un profil prudent, la combinaison liquidité élevée et croissance paraît trop exigeante.')
    }
    if (input.illiquidityTolerance === 'low') {
      add(scores.secure, 8, 'Une faible tolérance à l’illiquidité renforce la prudence.')
      add(scores.balanced, -6, 'Le scénario équilibré doit rester très cadré avec une faible tolérance à l’illiquidité.')
      add(scores.growth, -10, 'Une faible tolérance à l’illiquidité pénalise nettement le scénario croissance.')
    }
    if (horizonYears <= 10 && isRetirementObjective) {
      add(scores.secure, 6, 'Un objectif retraite à horizon encore intermédiaire peut rester compatible avec une trajectoire sécurisée.')
      add(scores.balanced, -2, 'L’objectif retraite ne suffit pas, à lui seul, à décaler un profil prudent vers une logique plus engagée.')
    }
    if (isDiversificationObjective && !isCapitalGrowthObjective) {
      add(scores.balanced, -2, 'La diversification ne doit pas conduire à surpondérer le scénario équilibré lorsque le profil reste prudent.')
    }
  }

  if (input.riskProfile === 'Dynamique' && horizonYears >= 10 && input.liquidityNeed !== 'high') {
    add(scores.growth, 8, 'Le triptyque profil dynamique, horizon long et liquidité non élevée soutient clairement le scénario croissance.')
    add(scores.secure, -4, 'Dans ce contexte, le scénario sécurisation paraît sous-dimensionné.')
  }

  const rawScores = [scores.secure, scores.balanced, scores.growth]

  rawScores.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return getScenarioPriority(b.scenarioKey) - getScenarioPriority(a.scenarioKey)
  })

  return rawScores.map((item) => ({
    ...item,
    score: normalizeScore(item.score),
  }))
}

export function getRecommendedScenarioKey(input: ScenarioScoringInput): ScenarioKey {
  const [first] = scoreScenarios(input)
  return first?.scenarioKey ?? 'balanced'
}

export function getScenarioNarrativeLabel(score: number) {
  if (score >= 80) return 'Très cohérent'
  if (score >= 65) return 'Cohérent'
  if (score >= 55) return 'Possible'
  return 'Secondaire'
}
