import type { Recommendation } from '../../domain/types/analysis'
import type { ClientSnapshot } from '../../domain/types/patrimony'
import { buildPatrimonialAlerts } from '../alerts/buildPatrimonialAlerts'

export function buildRecommendations(
  input: ClientSnapshot,
  context: { emergencyFundMonths: number; concentrationRealEstate: number },
): Recommendation[] {
  const items: Recommendation[] = []
  const alerts = buildPatrimonialAlerts(input)
  const grossAssets = Object.values(input.assets).reduce((sum, v) => sum + v, 0)
  const netWorth = grossAssets - (
    input.liabilities.mortgage +
    input.liabilities.consumerDebt +
    input.liabilities.otherDebt
  )
  const hasChildren = input.household.childrenCount > 0
  const isCouple =
    input.household.maritalStatus === 'MARIE' ||
    input.household.maritalStatus === 'PACSE'

  // ─── 1. LIQUIDITÉ ─────────────────────────────────────────────────────────
  // Réserve < 3 mois → urgence élevée
  if (context.emergencyFundMonths < 3) {
    items.push({
      axis: 'LIQUIDITE',
      title: 'Constituer une réserve de sécurité',
      summary:
        'Le foyer ne dispose pas encore d\u2019un matelas de précaution suffisant pour absorber un aléa financier imprévu.',
      urgency: 'ELEVEE',
      rationale: [
        `Réserve actuelle estimée à ${context.emergencyFundMonths.toFixed(1)} mois de charges — seuil recommandé : 6 mois.`,
        'Priorité à la liquidité avant d\u2019augmenter l\u2019exposition au risque.',
        'Un aléa non couvert (perte d\u2019emploi, dépense imprévue) fragiliserait l\u2019ensemble de la stratégie.',
      ],
    })
  }

  // ─── 2. PROTECTION ────────────────────────────────────────────────────────
  // Déclenchée si données réelles de protection disponibles ET lacunes identifiées,
  // OU si protection non exprimée comme objectif.
  const protectionData = input.protection
  const hasProtectionGaps = protectionData
    ? (
        !protectionData.hasDisabilityCoverage ||
        (isCouple && !protectionData.spouseProtected) ||
        (hasChildren && !protectionData.dependantsProtected)
      )
    : !input.goals.includes('PROTECTION')

  if (hasProtectionGaps) {
    // Construction de l'argumentaire précis selon les lacunes réelles
    const rationale: string[] = []

    if (protectionData) {
      if (!protectionData.hasDisabilityCoverage) {
        rationale.push(
          'Couverture invalidité absente — risque financier majeur en cas d\u2019incapacité prolongée.',
        )
      }
      if (isCouple && !protectionData.spouseProtected) {
        rationale.push(
          'Le conjoint n\u2019est pas protégé — la continuité financière du foyer n\u2019est pas assurée en cas d\u2019aléa.',
        )
      }
      if (hasChildren && !protectionData.dependantsProtected) {
        rationale.push(
          `${input.household.childrenCount} enfant(s) à charge non protégé(s) — la protection des dépendants doit être formalisée.`,
        )
      }
      if (!protectionData.hasDeathCoverage) {
        rationale.push('Couverture décès absente ou insuffisante.')
      }
    } else {
      rationale.push('Bloc protection non exprimé comme objectif explicite.')
      rationale.push('À valider en découverte approfondie.')
    }

    // Urgence élevée si lacunes réelles identifiées, moyenne si juste non exprimée
    const hasRealGaps = protectionData && rationale.length > 0
    items.push({
      axis: 'PROTECTION',
      title: 'Formaliser la protection du foyer',
      summary:
        'La stratégie patrimoniale doit intégrer en priorité la protection du foyer et la continuité financière en cas d\u2019aléa majeur.',
      urgency: hasRealGaps ? 'ELEVEE' : 'MOYENNE',
      rationale,
    })
  }

  // ─── 3. DIVERSIFICATION ───────────────────────────────────────────────────
  // Concentration immobilière > 65 % → urgence élevée si > 75 %, moyenne sinon
  if (context.concentrationRealEstate > 0.65) {
    const concentration = Math.round(context.concentrationRealEstate * 100)
    items.push({
      axis: 'DIVERSIFICATION',
      title: 'Rééquilibrer la structure patrimoniale',
      summary:
        'Le patrimoine est fortement concentré sur l\u2019immobilier. Une poche financière plus structurée améliorerait la souplesse et la diversification.',
      urgency: context.concentrationRealEstate > 0.75 ? 'ELEVEE' : 'MOYENNE',
      rationale: [
        `Concentration immobilière à ${concentration} % du patrimoine brut — seuil de vigilance : 65 %.`,
        'Besoin de supports plus liquides, progressifs et diversifiés.',
        'Un rééquilibrage progressif vers les enveloppes financières renforcerait la cohérence d\u2019ensemble.',
      ],
    })
  }

  // ─── 4. FISCALITÉ / RETRAITE ──────────────────────────────────────────────
  // TMI ≥ 30 % + objectif retraite → étude PER pertinente
  if (input.marginalTaxRate >= 0.3 && input.goals.includes('RETRAITE')) {
    items.push({
      axis: 'FISCALITE',
      title: 'Étudier un axe retraite à dominante PER',
      summary:
        'Le niveau de TMI permet d\u2019examiner l\u2019intérêt d\u2019une enveloppe retraite avec effet fiscal à l\u2019entrée.',
      urgency: 'MOYENNE',
      rationale: [
        `TMI à ${Math.round(input.marginalTaxRate * 100)} % — levier fiscal mobilisable à l\u2019entrée via le PER.`,
        'Objectif retraite déjà identifié — horizon cohérent avec une enveloppe tunnel.',
        'L\u2019économie fiscale à l\u2019entrée renforce l\u2019effort d\u2019épargne net réel.',
      ],
    })
  }

  // ─── 5. TRANSMISSION ──────────────────────────────────────────────────────
  // Déclenchée si :
  // - patrimoine net > 150 000 € ET enfants présents
  // - OU transmission dans les objectifs
  // - OU score transmission < 50 (non formalisée)
  const transmissionInGoals = input.goals.includes('TRANSMISSION')
  const hasTransmissionStakes =
    transmissionInGoals ||
    (hasChildren && netWorth > 150000) ||
    (hasChildren && input.age >= 50)

  if (hasTransmissionStakes && !transmissionInGoals) {
    const rationale: string[] = []

    if (hasChildren && netWorth > 150000) {
      rationale.push(
        `Patrimoine net de ${Math.round(netWorth).toLocaleString('fr-FR')} € avec ${input.household.childrenCount} enfant(s) — des enjeux de transmission existent.`,
      )
    }
    if (input.age >= 50) {
      rationale.push(
        `Âge (${input.age} ans) — c\u2019est le bon moment pour anticiper l\u2019organisation de la transmission.`,
      )
    }
    if (!transmissionInGoals) {
      rationale.push(
        'La transmission n\u2019est pas encore formalisée comme objectif — à aborder lors d\u2019une prochaine revue.',
      )
    }

    items.push({
      axis: 'TRANSMISSION',
      title: 'Anticiper l\u2019organisation de la transmission',
      summary:
        'Le patrimoine et la situation familiale justifient d\u2019anticiper la réflexion sur la transmission, même si ce n\u2019est pas encore l\u2019objectif prioritaire.',
      urgency: input.age >= 55 ? 'MOYENNE' : 'FAIBLE',
      rationale,
    })
  }

  if (transmissionInGoals) {
    items.push({
      axis: 'TRANSMISSION',
      title: 'Structurer la stratégie de transmission',
      summary:
        'La transmission est un objectif explicite du dossier — elle doit être intégrée dans la réflexion patrimoniale globale.',
      urgency: 'MOYENNE',
      rationale: [
        'Objectif transmission exprimé explicitement.',
        hasChildren
          ? `${input.household.childrenCount} enfant(s) à charge — organisation de la transmission à formaliser.`
          : 'Transmission à organiser selon les souhaits du client.',
        netWorth > 150000
          ? `Patrimoine net de ${Math.round(netWorth).toLocaleString('fr-FR')} € — les outils de transmission méritent d\u2019être étudiés.`
          : 'Réflexion transmission à intégrer progressivement.',
      ],
    })
  }

  // ─── Fallback ─────────────────────────────────────────────────────────────
  if (items.length === 0 && alerts.length === 0) {
    items.push({
      axis: 'DIVERSIFICATION',
      title: 'Consolider l\u2019organisation patrimoniale',
      summary:
        'La première lecture ne fait pas ressortir d\u2019alerte majeure. Le travail peut se concentrer sur la structuration, la cohérence des enveloppes et l\u2019alignement avec les objectifs.',
      urgency: 'FAIBLE',
      rationale: [
        'Aucune alerte bloquante immédiate.',
        'Logique de structuration plus que de correction.',
      ],
    })
  }

  // Tri par urgence décroissante puis retour des 5 premières
  const urgencyOrder = { ELEVEE: 0, MOYENNE: 1, FAIBLE: 2 }
  return items
    .sort((a, b) => urgencyOrder[a.urgency] - urgencyOrder[b.urgency])
    .slice(0, 5)
}
