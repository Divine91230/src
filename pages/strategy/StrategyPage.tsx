import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHero } from '../../components/ui/PageHero'
import { Badge } from '../../components/ui/Badge'
import { useCabinetStore } from '../../store/useCabinetStore'
import { useDiscoveryBridge } from '../../hooks/useDiscoveryBridge'
import {
  getEmergencyFundMonths,
  getResolvedRiskProfile,
  getResolvedTmi,
  getSelectedCharges,
  getSelectedHouseholdIncome,
  getSelectedSavingsCapacity,
} from '../discovery/discovery.helpers'
import {
  getResolvedSecurePercent,
  getResolvedUcPercent,
  resolveAllocationToEnvelopes,
  type AllocationLine,
  type ResolvedEnvelopeAllocation,
} from '../../lib/allocationMapping'
import { buildAdviceJustification } from '../../modules/justification/buildAdviceJustification'
import { buildRecommendations } from '../../modules/recommendations/buildRecommendations'
import './StrategyPage.css'

// ─── Types ────────────────────────────────────────────────────────────────────
type ScenarioKey = 'secure' | 'balanced' | 'growth'

type StoredScenarioState = {
  recommendedKey: ScenarioKey
  selectedKey: ScenarioKey
  clientFollowsRecommendation: boolean
  adjustedInitialByKey: Record<ScenarioKey, number>
  adjustedMonthlyByKey: Record<ScenarioKey, number>
  allocationsByKey?: Record<ScenarioKey, AllocationLine[]>
}

type StrategyEnvelopeCard = {
  envelope: string
  displayLabel: string
  initialAmount: number
  monthlyAmount: number
  primaryLabel: string
  secondaryLabel: string
  initialSecurePercent: number
  initialUcPercent: number
  monthlySecurePercent: number
  monthlyUcPercent: number
  order: number
  action: 'Ouvrir' | 'Renforcer'
  rachatAmount: number
  soldeEstime: number
  patrimonialExplanation: string   // (#A — pédagogie par enveloppe)
  fiscalNote: string               // (#A — note fiscale personnalisée)
}

type ImplementationStep = {
  order: number
  title: string
  detail: string
  urgent: boolean
}

const scenarioLabels: Record<ScenarioKey, string> = {
  secure: 'Sécurisation',
  balanced: 'Équilibre patrimonial',
  growth: 'Retraite & Optimisation',
}

// ─── Formatters ───────────────────────────────────────────────────────────────
function formatCurrency(value: number) {
  if (!Number.isFinite(value) || value === 0) return '\u2014'
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value)
}

function normalizeText(value: unknown) {
  return String(value ?? '').trim().toLowerCase()
}

function formatPercent(value: number) {
  return `${Math.round(value)} %`
}

// ─── Normalisation enveloppe ──────────────────────────────────────────────────
function normalizeAssetLabel(asset: any): string {
  const et = normalizeText(asset?.envelopeType)
  const label = normalizeText(asset?.label)
  if (et === 'assurance-vie' || label.includes('assurance')) return 'assurance-vie'
  if (et === 'per' || label === 'per') return 'per'
  if (et === 'pea' || label === 'pea') return 'pea'
  if (et === 'cto' || label.includes('compte-titres')) return 'cto'
  if (et === 'scpi' || label === 'scpi') return 'scpi'
  if (['livret a','ldds','lep','pel','compte courant'].includes(et)) return 'liquidités'
  return label || et || 'actif'
}

// ─── Explications patrimoniales par enveloppe (#A) ───────────────────────────
function getPatrimonialExplanation(
  envelope: string,
  tmiValue: number,
  isCouple: boolean,
  horizonYears: number,
): string {
  const env = normalizeText(envelope)

  if (env === 'assurance-vie') {
    const abattement = isCouple ? '9 200 €' : '4 600 €'
    return `L'assurance-vie est l'enveloppe de référence pour capitaliser avec souplesse. Après 8 ans de détention, les rachats bénéficient d'un abattement annuel de ${abattement} sur les gains — ce qui permet de récupérer des fonds régulièrement avec une fiscalité très réduite. Elle combine une poche sécurisée (fonds euros) et une poche de diversification (unités de compte), modulables à tout moment. En cas de décès, les capitaux sont transmis hors succession dans la limite de 152 500 € par bénéficiaire désigné.`
  }

  if (env === 'per') {
    const economie = Math.round(1000 * tmiValue / 100)
    return `Le Plan d'Épargne Retraite permet de déduire les versements de votre revenu imposable. À votre TMI de ${Math.round(tmiValue)} %, chaque 1 000 € versé ne vous coûte réellement que ${1000 - economie} € après économie d'impôt de ${economie} €. Les fonds sont bloqués jusqu'à la retraite (sauf accidents de la vie), ce qui en fait une enveloppe dédiée au long terme. À la sortie, vous choisissez entre un capital (imposé à la TMI sur les versements) ou une rente viagère. Avec un horizon de ${horizonYears} ans, c'est une enveloppe particulièrement pertinente.`
  }

  if (env === 'pea') {
    return `Le Plan d'Épargne en Actions permet d'investir sur les marchés actions européens avec une fiscalité avantageuse. Après 5 ans de détention, les plus-values et dividendes ne sont soumis qu'aux prélèvements sociaux (17,2 %) — l'impôt sur le revenu est totalement exonéré. Le plafond de versements est de 150 000 €. C'est l'enveloppe idéale pour une poche de marchés long terme, combinant potentiel de performance et avantage fiscal pérenne.`
  }

  if (env === 'scpi' || env.includes('scpi')) {
    return `Les SCPI (Sociétés Civiles de Placement Immobilier) permettent d'accéder à l'immobilier professionnel — bureaux, commerces, santé — sans les contraintes de gestion directe. Elles distribuent des revenus réguliers (loyers) et offrent une diversification géographique et sectorielle. La liquidité est plus contrainte qu'une enveloppe financière : il faut anticiper un horizon de 8 à 10 ans minimum. Les revenus distribués sont fiscalisés à votre TMI, à moins de les loger dans une assurance-vie.`
  }

  if (env.includes('compte-titres') || env === 'cto') {
    return `Le Compte-Titres Ordinaire donne accès à l'ensemble des marchés financiers mondiaux sans plafond de versement. Sa fiscalité est moins avantageuse que le PEA (PFU 30 % sur les gains), mais il offre une liberté totale d'investissement et une liquidité immédiate. C'est un complément utile quand le PEA est plein ou pour des stratégies de diversification internationale.`
  }

  return `Enveloppe patrimoniale retenue dans la stratégie en cohérence avec votre profil et vos objectifs.`
}

// ─── Note fiscale personnalisée (#A) ─────────────────────────────────────────
function getFiscalNote(
  envelope: string,
  tmiValue: number,
  monthlyAmount: number,
  initialAmount: number,
  isCouple: boolean,
): string {
  const env = normalizeText(envelope)

  if (env === 'per' && tmiValue >= 30) {
    const annualVersement = monthlyAmount * 12 + initialAmount
    const economie = Math.round(annualVersement * tmiValue / 100)
    return `Économie fiscale estimée la 1ère année : ${formatCurrency(economie)} (${Math.round(tmiValue)} % × ${formatCurrency(annualVersement)} versés).`
  }

  if (env === 'assurance-vie') {
    const abattement = isCouple ? '9 200 €' : '4 600 €'
    return `Après 8 ans : abattement annuel ${abattement} sur les gains lors des rachats. Taux IR réduit à 7,5 %.`
  }

  if (env === 'pea') {
    return `Après 5 ans : exonération totale d'IR sur les plus-values. Prélèvements sociaux 17,2 % maintenus.`
  }

  if (env.includes('scpi')) {
    return `Revenus fonciers imposés à la TMI (${Math.round(tmiValue)} %) + PS 17,2 % sauf si logés en AV.`
  }

  return ''
}

// ─── Lecture cabinet enrichie (#2 #5) ────────────────────────────────────────
function buildCabinetReading(params: {
  riskProfile: string
  objective: string
  secondaryObjective: string
  recommendedScenarioLabel: string
  selectedScenarioLabel: string
  emergencyMonths: number
  debtRatio: number
  tmi: string
  liquidityNeed: string
  hasProtectionGap: boolean
  horizonYears: number
}): string[] {
  const lines: string[] = []

  // Intro stratégie
  lines.push(
    `Le cabinet retient une trajectoire ${params.selectedScenarioLabel.toLowerCase()}, construite à partir de l\u2019objectif principal \u00ab\u00a0${params.objective}\u00a0\u00bb et du profil ${params.riskProfile.toLowerCase()} avec un horizon de ${params.horizonYears} ans.`,
  )

  if (params.secondaryObjective && params.secondaryObjective !== 'Non renseigné') {
    lines.push(
      `L\u2019objectif secondaire \u00ab\u00a0${params.secondaryObjective}\u00a0\u00bb reste pris en compte dans la hi\u00e9rarchisation des enveloppes et dans le rythme de mise en place.`,
    )
  }

  // Protection en priorité (#5)
  if (params.hasProtectionGap) {
    lines.push(
      '\u26a0\ufe0f\u00a0Point de vigilance prioritaire\u00a0: des lacunes de protection ont \u00e9t\u00e9 identifi\u00e9es sur ce dossier (invalidit\u00e9, conjoint, personnes \u00e0 charge). La mise en place des enveloppes d\u2019investissement ne doit intervenir qu\u2019apr\u00e8s traitement de ces points de pr\u00e9voyance.',
    )
  }

  // Réserve
  if (params.emergencyMonths < 3) {
    lines.push('La strat\u00e9gie reste conditionn\u00e9e \u00e0 la consolidation pr\u00e9alable d\u2019une poche de s\u00e9curit\u00e9 suffisante.')
  } else if (params.emergencyMonths < 6) {
    lines.push('La strat\u00e9gie peut \u00eatre engag\u00e9e, mais avec une mont\u00e9e progressive afin de pr\u00e9server un socle de liquidit\u00e9.')
  } else {
    lines.push(`Le niveau de r\u00e9serve du foyer (${params.emergencyMonths.toFixed(1)} mois) permet une mise en place plus sereine, sans perdre de vue le maintien d\u2019un socle liquide.`)
  }

  // Budget
  if (params.debtRatio >= 40) {
    lines.push('Le poids des charges invite \u00e0 calibrer prudemment le rythme d\u2019investissement pour ne pas fragiliser l\u2019\u00e9quilibre budg\u00e9taire.')
  } else if (params.debtRatio >= 30) {
    lines.push('Le budget du foyer permet une mise en place, mais le rythme doit rester coh\u00e9rent avec l\u2019endettement existant.')
  } else {
    lines.push('La structure budg\u00e9taire laisse une marge de man\u0153uvre satisfaisante pour d\u00e9ployer la strat\u00e9gie retenue.')
  }

  // Fiscalité
  const tmiValue = Number(String(params.tmi).replace('%', '').trim()) || 0
  if (tmiValue >= 30) {
    lines.push(`La fiscalit\u00e9 du foyer (TMI ${params.tmi}) justifie d\u2019int\u00e9grer des enveloppes \u00e0 levier fiscal \u2014 notamment le PER qui permet de d\u00e9duire les versements du revenu imposable.`)
  } else {
    lines.push('La logique strat\u00e9gique repose d\u2019abord sur la coh\u00e9rence patrimoniale, plus que sur une recherche de levier fiscal.')
  }

  // Écart recommandation / choix
  if (params.recommendedScenarioLabel !== params.selectedScenarioLabel) {
    lines.push(`Le client ne suit pas strictement la recommandation initiale du cabinet (${params.recommendedScenarioLabel}), ce qui suppose une justification claire dans le dossier.`)
  }

  return lines
}

// ─── Logique de mise en place ordonnée (#3 #4) ───────────────────────────────
function buildImplementationSteps(params: {
  hasProtectionGap: boolean
  existingEnvelopeUseRows: any[]
  strategyEnvelopeCards: StrategyEnvelopeCard[]
  initialAmount: number
  monthlyAmount: number
}): ImplementationStep[] {
  const steps: ImplementationStep[] = []
  let order = 1

  // Étape 1 : Protection d'abord (#2)
  if (params.hasProtectionGap) {
    steps.push({
      order: order++,
      title: 'Traiter la protection du foyer en priorité',
      detail: 'Avant tout déploiement de capital, valider la couverture invalidité, la protection du conjoint et des personnes à charge. Ne pas engager les étapes suivantes tant que ce point n\'est pas traité.',
      urgent: true,
    })
  }

  // Étape 2 : Rachats / mobilisations existantes
  for (const usage of params.existingEnvelopeUseRows) {
    if (usage.mobilizedAmount > 0) {
      steps.push({
        order: order++,
        title: `Rachat partiel — ${usage.label}`,
        detail: `Mobiliser ${formatCurrency(usage.mobilizedAmount)} sur l'enveloppe existante${usage.remainingAmount > 0 ? ` — solde conservé : ${formatCurrency(usage.remainingAmount)}` : ' — enveloppe entièrement mobilisée'}.`,
        urgent: false,
      })
    }
  }

  // Étapes 3+ : Ouvertures en premier, puis renforcements
  const toOpen = params.strategyEnvelopeCards.filter((c) => c.action === 'Ouvrir')
  const toReinforce = params.strategyEnvelopeCards.filter((c) => c.action === 'Renforcer')

  for (const card of toOpen) {
    steps.push({
      order: order++,
      title: `Ouvrir — ${card.displayLabel}`,
      detail: `Versement initial : ${formatCurrency(card.initialAmount)}${card.monthlyAmount > 0 ? ` + versements programmés : ${formatCurrency(card.monthlyAmount)}/mois` : ''}. Mix : ${card.initialSecurePercent}% sécurisé / ${card.initialUcPercent}% UC.`,
      urgent: false,
    })
  }

  for (const card of toReinforce) {
    steps.push({
      order: order++,
      title: `Renforcer — ${card.displayLabel}`,
      detail: `${card.rachatAmount > 0 ? `Après rachat de ${formatCurrency(card.rachatAmount)}, v` : 'V'}ersement de ${formatCurrency(card.initialAmount)}${card.monthlyAmount > 0 ? ` + ${formatCurrency(card.monthlyAmount)}/mois` : ''}${card.soldeEstime > 0 ? `. Solde estimé après opérations : ${formatCurrency(card.soldeEstime)}` : ''}.`,
      urgent: false,
    })
  }

  // Étape finale
  steps.push({
    order: order++,
    title: 'Contrôle de cohérence avant édition',
    detail: 'Vérifier la cohérence entre stratégie, enveloppes recommandées et contrats retenus avant édition finale des livrables.',
    urgent: false,
  })

  return steps
}

// ─── Vigilance ────────────────────────────────────────────────────────────────
function buildVigilanceItems(params: {
  emergencyMonths: number
  debtRatio: number
  selectedSavings: number
  riskProfile: string
  resolvedAllocation: ResolvedEnvelopeAllocation[]
  hasProtectionGap: boolean
}): string[] {
  const items: string[] = []

  if (params.hasProtectionGap) {
    items.push('Protection à traiter avant toute mise en place : invalidité, conjoint, personnes à charge.')
  }
  if (params.emergencyMonths < 3) {
    items.push('Réserve de sécurité insuffisante — à renforcer avant une montée en puissance trop rapide.')
  }
  if (params.debtRatio >= 40) {
    items.push('Poids des charges élevé : l\'effort d\'investissement doit rester strictement dimensionné.')
  } else if (params.debtRatio >= 30) {
    items.push('Rythme d\'investissement à surveiller compte tenu du niveau de charges du foyer.')
  }
  if (params.selectedSavings <= 0) {
    items.push('Capacité d\'épargne à revalider avant mise en place complète.')
  }
  const hasHighUc = params.resolvedAllocation.some(
    (l) => getResolvedUcPercent(l, 'monthly') >= 70 || getResolvedUcPercent(l, 'initial') >= 70,
  )
  if (params.riskProfile === 'Prudent' && hasHighUc) {
    items.push('Vérifier la cohérence entre la part UC retenue et la tolérance au risque du client.')
  }

  return items
}

// ─── Enveloppes existantes mobilisées ────────────────────────────────────────
function buildExistingEnvelopeUseRows(discovery: any) {
  const usages = Array.isArray(discovery?.investmentProject?.existingEnvelopeUsages)
    ? discovery.investmentProject.existingEnvelopeUsages
    : []
  const assets = Array.isArray(discovery?.assets) ? discovery.assets : []

  const assetIndex = new Map<string, number>()
  for (const asset of assets) {
    const key = normalizeAssetLabel(asset)
    const amount = Number(asset.amount || 0)
    if (amount > 0) assetIndex.set(key, (assetIndex.get(key) || 0) + amount)
  }

  return usages
    .filter((u: any) => u?.selected)
    .map((usage: any, index: number) => {
      const label = usage.envelopeName || usage.label || `Enveloppe ${index + 1}`
      const normalizedKey = normalizeAssetLabel({ label, envelopeType: label })
      const currentAmount = Number(assetIndex.get(normalizedKey) || 0)
      const mobilizedAmount = Math.max(0, Math.min(currentAmount || Number(usage.amountUsed || 0), Number(usage.amountUsed || 0)))
      const remainingAmount = Math.max(0, currentAmount - mobilizedAmount)
      const mobilizedPercent = currentAmount > 0 ? (mobilizedAmount / currentAmount) * 100 : 0
      const decision = mobilizedAmount <= 0 ? 'Conservée' : mobilizedPercent < 50 ? 'Mobilisation partielle' : 'Mobilisation majoritaire'
      const rationale = mobilizedAmount <= 0
        ? 'Enveloppe sélectionnée mais non encore mobilisée financièrement.'
        : remainingAmount > 0
        ? `${formatCurrency(mobilizedAmount)} mobilisés — ${formatCurrency(remainingAmount)} conservés en place.`
        : 'Enveloppe entièrement ou quasi-entièrement mobilisée pour la mise en place initiale.'

      return { id: usage.id || `${label}-${index}`, label, currentAmount, mobilizedAmount, remainingAmount, mobilizedPercent, useMode: usage?.useMode === 'full' ? 'full' : 'partial', decision, rationale }
    })
}

// ─── Page principale ──────────────────────────────────────────────────────────
export function StrategyPage() {
  const navigate = useNavigate()
  const client = useCabinetStore((s) => s.selectedClient)
  const discovery = useCabinetStore((s) => s.getDiscoveryForSelectedClient())
  const { snapshot, recommendations } = useDiscoveryBridge()

  const pageData = useMemo(() => {
    if (!client || !discovery) return null

    const displayName = `${discovery?.mainPerson?.firstName ?? ''} ${discovery?.mainPerson?.lastName ?? ''}`.trim() || client.fullName
    const riskProfile = getResolvedRiskProfile(discovery)
    const tmi = getResolvedTmi(discovery)
    const tmiValue = Number(String(tmi).replace('%', '').trim()) || 0
    const emergencyMonths = getEmergencyFundMonths(discovery)
    const selectedIncome = getSelectedHouseholdIncome(discovery)
    const selectedCharges = getSelectedCharges(discovery)
    const selectedSavings = getSelectedSavingsCapacity(discovery)
    const debtRatio = selectedIncome > 0 ? Math.round((selectedCharges / selectedIncome) * 100) : 0
    const investmentProject = discovery?.investmentProject ?? {}
    const objective = investmentProject?.projectGoal || discovery?.objectives?.mainObjective || 'Objectif non renseigné'
    const secondaryObjective = investmentProject?.projectSecondaryGoal || discovery?.objectives?.secondaryObjective || 'Non renseigné'
    const liquidityNeed = investmentProject?.liquidityNeed || discovery?.objectives?.liquidityNeed || 'Non renseigné'
    const horizon = Number(investmentProject?.targetAvailabilityHorizon || discovery?.objectives?.horizonYears || 0)
    const isCouple = discovery?.mainPerson?.householdStatus === 'Marié(e)' || discovery?.mainPerson?.householdStatus === 'Pacsé(e)'

    // Protection gap
    const prot = discovery?.protection
    const hasProtectionGap = prot
      ? (!prot.disabilityCoverage || (isCouple && !prot.spouseProtected) || ((discovery?.linkedPersons ?? []).filter((p: any) => p.role === 'Enfant').length > 0 && !prot.dependantsProtected))
      : false

    // Scénario
    const rawScenarioState = localStorage.getItem(`dcp-scenarios-v4-${client.id}`)
    if (!rawScenarioState) return { status: 'missing-scenarios' as const, displayName }

    let scenarioState: StoredScenarioState | null = null
    try { scenarioState = JSON.parse(rawScenarioState) } catch { scenarioState = null }
    if (!scenarioState) return { status: 'invalid-scenarios' as const, displayName }

    const selectedScenarioKey = scenarioState.selectedKey
    const recommendedScenarioKey = scenarioState.recommendedKey
    const selectedScenarioLabel = scenarioLabels[selectedScenarioKey]
    const recommendedScenarioLabel = scenarioLabels[recommendedScenarioKey]
    const initialAmount = scenarioState.adjustedInitialByKey?.[selectedScenarioKey] ?? 0
    const monthlyAmount = scenarioState.adjustedMonthlyByKey?.[selectedScenarioKey] ?? 0
    const allocation = scenarioState.allocationsByKey?.[selectedScenarioKey] ?? []

    const resolvedAllocation = resolveAllocationToEnvelopes(allocation, { riskProfile: riskProfile as any, objective })
      .filter((l) => Number(l.euroAmount || 0) > 0 || Number(l.monthlyEuroAmount || 0) > 0)

    // Enveloppes existantes mobilisées
    const existingEnvelopeUseRows = buildExistingEnvelopeUseRows(discovery)

    // Index des rachats par enveloppe normalisée
    const rachatByLabel = new Map<string, number>()
    for (const row of existingEnvelopeUseRows) {
      const key = normalizeAssetLabel({ label: row.label, envelopeType: row.label })
      rachatByLabel.set(key, (rachatByLabel.get(key) || 0) + row.mobilizedAmount)
    }

    // Index actifs existants
    const assets = Array.isArray(discovery?.assets) ? discovery.assets : []
    const existingByLabel = new Map<string, number>()
    for (const asset of assets) {
      const key = normalizeAssetLabel(asset)
      existingByLabel.set(key, (existingByLabel.get(key) || 0) + Number(asset.amount || 0))
    }

    // Cartes enveloppes enrichies (#1 #4 #A)
    const strategyEnvelopeCards: StrategyEnvelopeCard[] = resolvedAllocation.map((item, i) => {
      const normLabel = normalizeText(item.displayLabel)
      const rachatAmount = rachatByLabel.get(normLabel) ?? 0
      const existingAmount = existingByLabel.get(normLabel) ?? 0
      const soldeEstime = existingAmount > 0 ? existingAmount - rachatAmount + item.euroAmount : 0
      const action: 'Ouvrir' | 'Renforcer' = existingAmount > 0 ? 'Renforcer' : 'Ouvrir'

      return {
        envelope: item.envelope,
        displayLabel: item.displayLabel,
        initialAmount: item.euroAmount,
        monthlyAmount: item.monthlyEuroAmount,
        primaryLabel: item.supportLabelPrimary,
        secondaryLabel: item.supportLabelSecondary,
        initialSecurePercent: getResolvedSecurePercent(item, 'initial'),
        initialUcPercent: getResolvedUcPercent(item, 'initial'),
        monthlySecurePercent: getResolvedSecurePercent(item, 'monthly'),
        monthlyUcPercent: getResolvedUcPercent(item, 'monthly'),
        order: i + 1,
        action,
        rachatAmount,
        soldeEstime,
        patrimonialExplanation: getPatrimonialExplanation(normLabel, tmiValue, isCouple, horizon),
        fiscalNote: getFiscalNote(normLabel, tmiValue, item.monthlyEuroAmount, item.euroAmount, isCouple),
      }
    })

    // Justifications patrimoniales (#B #C) via module existant
    const justifications = snapshot && recommendations.length > 0
      ? buildAdviceJustification(snapshot, recommendations)
      : []

    // Étapes de mise en place ordonnées (#3 #4)
    const implementationSteps = buildImplementationSteps({
      hasProtectionGap,
      existingEnvelopeUseRows,
      strategyEnvelopeCards,
      initialAmount,
      monthlyAmount,
    })

    // Récapitulatif financier (#6)
    const totalInitial = strategyEnvelopeCards.reduce((s, c) => s + c.initialAmount, 0)
    const totalMonthly = strategyEnvelopeCards.reduce((s, c) => s + c.monthlyAmount, 0)
    const totalRachat = existingEnvelopeUseRows.reduce((s, r) => s + r.mobilizedAmount, 0)

    return {
      status: 'ready' as const,
      displayName, riskProfile, tmi, tmiValue, emergencyMonths,
      selectedIncome, selectedCharges, selectedSavings, debtRatio,
      objective, secondaryObjective, liquidityNeed, horizon, isCouple,
      selectedScenarioLabel, recommendedScenarioLabel,
      initialAmount, monthlyAmount, totalInitial, totalMonthly, totalRachat,
      resolvedAllocation, strategyEnvelopeCards, existingEnvelopeUseRows,
      hasProtectionGap, justifications, implementationSteps,
      cabinetReading: buildCabinetReading({
        riskProfile, objective, secondaryObjective,
        recommendedScenarioLabel, selectedScenarioLabel,
        emergencyMonths, debtRatio, tmi, liquidityNeed,
        hasProtectionGap, horizonYears: horizon,
      }),
      vigilanceItems: buildVigilanceItems({
        emergencyMonths, debtRatio, selectedSavings, riskProfile,
        resolvedAllocation, hasProtectionGap,
      }),
    }
  }, [client, discovery, snapshot, recommendations])

  // ── Gardes ────────────────────────────────────────────────────────────────
  if (!client) return (<><PageHero title="Stratégie d'investissement" description="Aucun client sélectionné." /><section className="card"><p>Ouvre un dossier client pour accéder à la stratégie.</p></section></>)
  if (!discovery) return (<><PageHero title={`Stratégie — ${client.fullName}`} description="Découverte patrimoniale insuffisante." /><section className="card"><p>Complète la découverte et les scénarios avant de construire la stratégie.</p></section></>)
  if (!pageData || pageData.status === 'missing-scenarios') return (<><PageHero title={`Stratégie — ${pageData?.displayName || client.fullName}`} description="Scénario non renseigné." /><section className="card"><p>Va sur la page Scénarios, sélectionne un scénario et clique sur Valider.</p></section></>)
  if (pageData.status === 'invalid-scenarios') return (<><PageHero title={`Stratégie — ${pageData.displayName}`} description="Données scénarios invalides." /><section className="card"><p>Retourne sur la page Scénarios et enregistre de nouveau le scénario retenu.</p></section></>)

  return (
    <>
      <PageHero
        title={`Stratégie d'investissement — ${pageData.displayName}`}
        description="Lecture cabinet de la trajectoire retenue, avec explications patrimoniales, ordre de mise en place et justification par enveloppe."
      />

      {/* ── Alerte protection (#2) ─────────────────────────────────────────── */}
      {pageData.hasProtectionGap && (
        <div style={{ background: 'var(--rose-100)', border: '1px solid rgba(176,80,80,0.22)', borderRadius: 'var(--r-xl)', padding: 'var(--space-5) var(--space-6)', marginBottom: 'var(--space-5)', display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-start' }}>
          <span style={{ fontSize: 20, flexShrink: 0 }}>⚠️</span>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--rose-500)', marginBottom: 4 }}>Priorité protection — à traiter avant le déploiement</div>
            <div style={{ fontSize: 13.5, color: 'var(--ink-700)', lineHeight: 1.65 }}>Des lacunes de prévoyance ont été identifiées sur ce dossier. La mise en place des enveloppes d'investissement ne doit intervenir qu'après traitement de ces points.</div>
          </div>
        </div>
      )}

      {/* ── En-tête ────────────────────────────────────────────────────────── */}
      <section className="card strategy-v2-hero" style={{ marginBottom: 'var(--space-5)' }}>
        <div>
          <div className="hero-kicker">Lecture stratégique cabinet</div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 600, letterSpacing: '-0.02em', marginBottom: 'var(--space-2)' }}>{pageData.displayName}</h2>
          <p style={{ color: 'var(--text-2)', fontSize: 13.5 }}>Traduction du projet d'investissement en stratégie cabinet — avec explications patrimoniales, justification par enveloppe et plan de mise en place.</p>
        </div>
        <div className="strategy-v2-badges">
          <Badge variant="default">{pageData.riskProfile}</Badge>
          <Badge variant="default">{pageData.objective}</Badge>
          <Badge variant="gold">{pageData.selectedScenarioLabel}</Badge>
        </div>
      </section>

      {/* ── KPIs + Récapitulatif financier (#6) ───────────────────────────── */}
      <div className="strategy-v2-kpis" style={{ marginBottom: 'var(--space-5)' }}>
        <article className="card strategy-v2-kpi"><strong>Scénario retenu</strong><span style={{ fontSize: 15, fontWeight: 700 }}>{pageData.selectedScenarioLabel}</span></article>
        <article className="card strategy-v2-kpi"><strong>Total déployé</strong><span>{formatCurrency(pageData.totalInitial)}</span></article>
        <article className="card strategy-v2-kpi"><strong>Mensualités</strong><span>{formatCurrency(pageData.totalMonthly)}/mois</span></article>
        <article className="card strategy-v2-kpi"><strong>dont Rachat(s)</strong><span>{formatCurrency(pageData.totalRachat)}</span></article>
      </div>

      {/* ── Lecture cabinet (#B synthèse globale) ─────────────────────────── */}
      <section className="card strategy-v2-section" style={{ marginBottom: 'var(--space-5)' }}>
        <div className="section-head" style={{ marginBottom: 'var(--space-4)' }}>
          <div className="section-title">Lecture cabinet</div>
          <Badge variant="gold">Vue conseiller</Badge>
        </div>
        <div className="strategy-v2-reading" style={{ display: 'grid', gap: 'var(--space-3)' }}>
          {pageData.cabinetReading.map((item, i) => (
            <p key={i} style={{ margin: 0, fontSize: 14, lineHeight: 1.7, color: item.startsWith('⚠') ? 'var(--rose-500)' : 'var(--ink-700)' }}>{item}</p>
          ))}
        </div>
      </section>

      {/* ── Cadre projet ──────────────────────────────────────────────────── */}
      <div className="strategy-v2-two-columns" style={{ marginBottom: 'var(--space-5)' }}>
        <article className="card">
          <div className="section-title" style={{ marginBottom: 'var(--space-4)' }}>Cadre du projet</div>
          <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
            {[
              { label: 'Objectif principal', value: pageData.objective },
              { label: 'Objectif secondaire', value: pageData.secondaryObjective },
              { label: 'Horizon', value: `${pageData.horizon} ans` },
              { label: 'Liquidité', value: String(pageData.liquidityNeed) },
              { label: 'Profil retenu', value: pageData.riskProfile },
              { label: 'TMI', value: pageData.tmi },
            ].map((item) => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-2) 0', borderBottom: '1px solid var(--line-2)', fontSize: 13.5 }}>
                <span style={{ color: 'var(--muted)' }}>{item.label}</span>
                <span style={{ fontWeight: 600, background: 'var(--cream-200)', borderRadius: 999, padding: '2px 10px', fontSize: 12 }}>{item.value}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="card">
          <div className="section-title" style={{ marginBottom: 'var(--space-4)' }}>Lecture budgétaire</div>
          <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
            {[
              { label: 'Revenus retenus', value: formatCurrency(pageData.selectedIncome) },
              { label: 'Charges retenues', value: formatCurrency(pageData.selectedCharges) },
              { label: 'Capacité retenue', value: formatCurrency(pageData.selectedSavings) },
              { label: 'Ratio d\'endettement', value: `${pageData.debtRatio} %` },
              { label: 'Réserve de sécurité', value: `${pageData.emergencyMonths.toFixed(1)} mois` },
            ].map((item) => (
              <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-3)', padding: 'var(--space-2) 0', borderBottom: '1px solid var(--line-2)', fontSize: 13.5 }}>
                <span style={{ color: 'var(--muted)' }}>{item.label}</span>
                <span style={{ fontWeight: 600, background: 'var(--cream-200)', borderRadius: 999, padding: '2px 10px', fontSize: 12 }}>{item.value}</span>
              </div>
            ))}
          </div>
        </article>
      </div>

      {/* ── Enveloppes avec explications patrimoniales (#A #C) ────────────── */}
      <section className="card strategy-v2-section" style={{ marginBottom: 'var(--space-5)' }}>
        <div className="section-head" style={{ marginBottom: 'var(--space-5)' }}>
          <div>
            <div className="section-title">Traduction dans les enveloppes</div>
            <div className="section-subtitle">{pageData.strategyEnvelopeCards.length} enveloppe(s) — avec explications patrimoniales et fiscales</div>
          </div>
          <Badge variant="default">{pageData.selectedScenarioLabel}</Badge>
        </div>

        <div className="strategy-v2-envelope-grid">
          {pageData.strategyEnvelopeCards.map((item) => (
            <article key={item.envelope} style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-xl)', background: 'var(--surface)', padding: 'var(--space-6)', display: 'grid', gap: 'var(--space-4)' }}>

              {/* En-tête enveloppe */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
                <div>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 600, letterSpacing: '-0.02em', margin: 0, marginBottom: 4 }}>{item.displayLabel}</h3>
                  {item.rachatAmount > 0 && (
                    <div style={{ fontSize: 12, color: 'var(--gold-600)', fontWeight: 600 }}>↩ Rachat préalable : {formatCurrency(item.rachatAmount)}</div>
                  )}
                </div>
                <Badge variant={item.action === 'Ouvrir' ? 'gold' : 'client'}>{item.action}</Badge>
              </div>

              {/* Montants */}
              <div className="metric-strip">
                <div className="metric-strip-item">
                  <div className="metric-strip-label">Versement initial</div>
                  <div className="metric-strip-value">{formatCurrency(item.initialAmount)}</div>
                </div>
                <div className="metric-strip-item">
                  <div className="metric-strip-label">Mensuel</div>
                  <div className="metric-strip-value">{formatCurrency(item.monthlyAmount)}</div>
                </div>
                {item.soldeEstime > 0 && (
                  <div className="metric-strip-item">
                    <div className="metric-strip-label">Solde estimé après</div>
                    <div className="metric-strip-value">{formatCurrency(item.soldeEstime)}</div>
                  </div>
                )}
              </div>

              {/* Mix Sécurisé / UC */}
              <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
                {[
                  { label: 'Mix initial', secure: item.initialSecurePercent, uc: item.initialUcPercent },
                  { label: 'Mix mensuel', secure: item.monthlySecurePercent, uc: item.monthlyUcPercent },
                ].map((mix) => (
                  <div key={mix.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 12.5 }}>
                    <span style={{ color: 'var(--muted)' }}>{mix.label}</span>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <span style={{ background: 'var(--sage-100)', color: 'var(--sage-500)', borderRadius: 999, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{mix.secure}% sécu</span>
                      <span style={{ background: 'var(--gold-100)', color: 'var(--gold-600)', borderRadius: 999, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{mix.uc}% UC</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Explication patrimoniale (#A) */}
              <div style={{ background: 'var(--cream-100)', border: '1px solid var(--line)', borderRadius: 'var(--r-md)', padding: 'var(--space-4)' }}>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-400)', marginBottom: 'var(--space-2)' }}>
                  Lecture patrimoniale
                </div>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--ink-700)', lineHeight: 1.7 }}>{item.patrimonialExplanation}</p>
              </div>

              {/* Note fiscale personnalisée (#A) */}
              {item.fiscalNote && (
                <div style={{ background: 'var(--gold-50)', border: '1px solid var(--gold-200)', borderRadius: 'var(--r-md)', padding: 'var(--space-3) var(--space-4)', display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: 14, flexShrink: 0 }}>💡</span>
                  <p style={{ margin: 0, fontSize: 12.5, color: 'var(--gold-600)', fontWeight: 500, lineHeight: 1.6 }}>{item.fiscalNote}</p>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>

      {/* ── Enveloppes existantes mobilisées (#1) ──────────────────────────── */}
      {pageData.existingEnvelopeUseRows.length > 0 && (
        <section className="card strategy-v2-section" style={{ marginBottom: 'var(--space-5)' }}>
          <div className="section-head" style={{ marginBottom: 'var(--space-4)' }}>
            <div className="section-title">Enveloppes existantes mobilisées</div>
            <Badge variant="default">{pageData.existingEnvelopeUseRows.length} enveloppe(s)</Badge>
          </div>
          <div className="strategy-v2-existing-grid">
            {pageData.existingEnvelopeUseRows.map((item: any) => (
              <article key={item.id} style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-xl)', background: 'var(--cream-100)', padding: 'var(--space-5)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--space-3)' }}>
                  <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600, margin: 0 }}>{item.label}</h3>
                  <Badge variant="prospect">{item.decision}</Badge>
                </div>
                <p style={{ fontSize: 13.5, color: 'var(--text-2)', lineHeight: 1.65, marginBottom: 'var(--space-4)' }}>{item.rationale}</p>
                <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
                  {[
                    { label: 'Encours actuel', value: formatCurrency(item.currentAmount) },
                    { label: 'Montant mobilisé', value: formatCurrency(item.mobilizedAmount) },
                    { label: 'Montant conservé', value: formatCurrency(item.remainingAmount) },
                    { label: 'Part mobilisée', value: formatPercent(item.mobilizedPercent) },
                  ].map((row) => (
                    <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, borderBottom: '1px solid var(--line-2)', paddingBottom: 'var(--space-2)' }}>
                      <span style={{ color: 'var(--muted)' }}>{row.label}</span>
                      <span style={{ fontWeight: 600 }}>{row.value}</span>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* ── Plan de mise en place ordonné (#3 #4) ─────────────────────────── */}
      <section className="card strategy-v2-section" style={{ marginBottom: 'var(--space-5)' }}>
        <div className="section-title" style={{ marginBottom: 'var(--space-5)' }}>Plan de mise en place</div>
        <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
          {pageData.implementationSteps.map((step) => (
            <div key={step.order} style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'flex-start' }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                background: step.urgent ? 'var(--rose-500)' : 'linear-gradient(135deg, var(--gold-300), var(--gold-500))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 800, color: step.urgent ? '#fff' : '#1c1a15',
              }}>{step.order}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: step.urgent ? 'var(--rose-500)' : 'var(--ink-900)', marginBottom: 4 }}>
                  {step.urgent && '⚠️ '}{step.title}
                </div>
                <div style={{ fontSize: 13.5, color: 'var(--ink-600)', lineHeight: 1.65 }}>{step.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Justification par axe (#B #C) ──────────────────────────────────── */}
      {pageData.justifications.length > 0 && (
        <section className="card strategy-v2-section" style={{ marginBottom: 'var(--space-5)' }}>
          <div className="section-head" style={{ marginBottom: 'var(--space-5)' }}>
            <div>
              <div className="section-title">Justification patrimoniale par axe</div>
              <div className="section-subtitle">Constat → Problématique → Objectif → Impacts attendus</div>
            </div>
            <Badge variant="gold">Vue conseiller</Badge>
          </div>
          <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
            {pageData.justifications.map((j, i) => (
              <div key={i} style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-lg)', overflow: 'hidden' }}>
                {/* Header axe */}
                <div style={{ background: 'var(--cream-100)', padding: 'var(--space-4) var(--space-5)', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 600 }}>{j.title}</div>
                  <Badge variant="default">{j.axis}</Badge>
                </div>

                <div style={{ padding: 'var(--space-5)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                  {/* Colonne gauche */}
                  <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>Constat</div>
                      <p style={{ margin: 0, fontSize: 13.5, color: 'var(--ink-700)', lineHeight: 1.65 }}>{j.finding}</p>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>Problématique</div>
                      <p style={{ margin: 0, fontSize: 13.5, color: 'var(--ink-700)', lineHeight: 1.65 }}>{j.issue}</p>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>Objectif</div>
                      <p style={{ margin: 0, fontSize: 13.5, color: 'var(--ink-700)', lineHeight: 1.65 }}>{j.objective}</p>
                    </div>
                  </div>

                  {/* Colonne droite */}
                  <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>Impacts attendus</div>
                      <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
                        {j.expectedImpacts.map((imp, k) => (
                          <div key={k} style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-start', fontSize: 13.5, color: 'var(--ink-700)' }}>
                            <span style={{ color: 'var(--sage-500)', fontWeight: 700, flexShrink: 0 }}>✓</span>
                            {imp}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 6 }}>Points de vigilance</div>
                      <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
                        {j.watchpoints.map((w, k) => (
                          <div key={k} style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'flex-start', fontSize: 13.5, color: 'var(--ink-700)' }}>
                            <span style={{ color: 'var(--amber-500)', fontWeight: 700, flexShrink: 0 }}>→</span>
                            {w}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Vigilance ─────────────────────────────────────────────────────── */}
      <div className="strategy-v2-two-columns" style={{ marginBottom: 'var(--space-5)' }}>
        <article className="card">
          <div className="section-title" style={{ marginBottom: 'var(--space-4)' }}>Points de vigilance</div>
          {pageData.vigilanceItems.length ? (
            <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
              {pageData.vigilanceItems.map((item, i) => (
                <div key={i} style={{ display: 'flex', gap: 'var(--space-3)', alignItems: 'flex-start', fontSize: 13.5, color: 'var(--ink-700)' }}>
                  <span style={{ color: 'var(--amber-500)', fontWeight: 700, flexShrink: 0 }}>⚠</span>
                  {item}
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: 'var(--muted)', fontSize: 13.5 }}>Aucun point de vigilance majeur détecté à ce stade.</p>
          )}
        </article>

        {/* Synthèse cabinet (#8) */}
        <article className="card" style={{ background: 'linear-gradient(135deg, var(--gold-50), #fff)', border: '1px solid var(--gold-200)' }}>
          <div className="section-title" style={{ marginBottom: 'var(--space-4)' }}>Synthèse cabinet</div>
          <p style={{ margin: '0 0 var(--space-3)', fontSize: 13.5, color: 'var(--ink-700)', lineHeight: 1.7 }}>
            Le cabinet recommande une stratégie orientée <strong>{pageData.selectedScenarioLabel}</strong> pour {pageData.displayName}, structurée autour de <strong>{pageData.strategyEnvelopeCards.map((c) => c.displayLabel).join(', ')}</strong>.
          </p>
          <p style={{ margin: '0 0 var(--space-3)', fontSize: 13.5, color: 'var(--ink-700)', lineHeight: 1.7 }}>
            Cette organisation répond à l'objectif <strong>{pageData.objective}</strong> sur un horizon de <strong>{pageData.horizon} ans</strong>, avec un profil <strong>{pageData.riskProfile}</strong> et une TMI de <strong>{pageData.tmi}</strong>.
          </p>
          {pageData.hasProtectionGap && (
            <p style={{ margin: 0, fontSize: 13.5, color: 'var(--rose-500)', fontWeight: 600, lineHeight: 1.7 }}>
              ⚠️ La protection du foyer constitue le préalable absolu à la mise en place des enveloppes d'investissement.
            </p>
          )}
        </article>
      </div>

      {/* ── CTA vers Rapports (#7) ─────────────────────────────────────────── */}
      <section className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--space-4)', flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 13.5, color: 'var(--ink-900)', marginBottom: 3 }}>Générer les livrables clients</div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>La stratégie est prête — accède aux rapports PDF pour préparer la restitution client.</div>
        </div>
        <button className="btn btn-gold" onClick={() => navigate('/reports')}>
          Générer les rapports →
        </button>
      </section>
    </>
  )
}

export default StrategyPage
