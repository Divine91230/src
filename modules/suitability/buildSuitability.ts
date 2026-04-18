import type { ScenarioScoringInput } from '../../lib/recommendationScoring'
import type { SuitabilityResult, SuitabilityStatus } from './suitability.types'

export function buildSuitability(input: ScenarioScoringInput): SuitabilityResult {
  const strengths: string[] = []
  const reserves: string[] = []

  // ─── TMI : normalisation nombre ou string ─────────────────────────────────
  const tmiNumeric = typeof input.tmi === 'number' && input.tmi <= 1
    ? input.tmi * 100
    : Number(String(input.tmi ?? '').replace('%', '').replace(',', '.').trim()) || 0

  // ─── 1. Réserve de sécurité ───────────────────────────────────────────────
  if (input.emergencyMonths >= 6) {
    strengths.push('La réserve de sécurité est bien constituée et sécurise la mise en place.')
  } else if (input.emergencyMonths >= 3) {
    strengths.push('Le niveau de réserve de sécurité apporte une base de liquidité minimale.')
  } else {
    reserves.push('La réserve de sécurité apparaît insuffisante au regard des charges du foyer.')
  }

  // ─── 2. Financement du projet ─────────────────────────────────────────────
  if (input.baseMonthlyContribution > 0 || input.baseInitialCapital > 0) {
    strengths.push('Le projet dispose d\'un rythme de mise en place identifiable.')
  } else {
    reserves.push('Le financement opérationnel de la stratégie doit encore être confirmé.')
  }

  // ─── 3. Endettement ───────────────────────────────────────────────────────
  if (input.debtRatio >= 40) {
    reserves.push('Le poids des charges appelle une vigilance renforcée sur l\'effort de mise en place.')
  }

  // ─── 4. TMI ───────────────────────────────────────────────────────────────
  if (tmiNumeric >= 30) {
    strengths.push('Le niveau de TMI permet d\'examiner des leviers fiscaux plus structurés.')
  }

  // ─── 5. Horizon ───────────────────────────────────────────────────────────
  const horizonYears = input.investmentHorizonYears ?? 0

  if (horizonYears >= 12) {
    strengths.push('L\'horizon long terme est pleinement compatible avec une allocation diversifiée.')
  } else if (horizonYears >= 8) {
    strengths.push('L\'horizon de placement est suffisamment long pour absorber la volatilité.')
  }

  // ─── 6. Cohérence profil risque / scénario ───────────────────────────────
  // C'est ici que les 3 scénarios vont différer pour un même client
  const riskProfile = input.riskProfile
  const liquidityNeed = input.liquidityNeed   // 'high' | 'medium' | 'low' : besoin du scénario
  const illiquidityTol = input.illiquidityTolerance // 'low' | 'medium' | 'high' : tolérance scénario

  // Scénario Sécurisation (liquidityNeed: 'high', illiquidityTolerance: 'low')
  // → Sous réserve si profil Dynamique ou besoin liquidité Faible
  if (liquidityNeed === 'high') {
    if (riskProfile === 'Dynamique') {
      reserves.push('Le scénario de sécurisation sous-exploite la tolérance au risque du profil Dynamique.')
    }
    if (input.flexibilityNeed === 'low') {
      reserves.push('Le besoin de liquidité faible déclaré rend ce scénario conservateur par rapport aux objectifs.')
    }
    if (horizonYears >= 12) {
      reserves.push('L\'horizon long terme invite à envisager une allocation plus ambitieuse que la sécurisation pure.')
    }
  }

  // Scénario Équilibre (liquidityNeed: 'medium', illiquidityTolerance: 'medium')
  // → Adapté pour les profils Équilibrés avec un horizon moyen/long
  if (liquidityNeed === 'medium') {
    if (riskProfile === 'Prudent' && horizonYears < 8) {
      reserves.push('Le profil prudent sur un horizon court invite à privilégier davantage de sécurité.')
    }
    if (riskProfile === 'Dynamique' && horizonYears >= 12) {
      reserves.push('Le profil dynamique avec un horizon long pourrait bénéficier d\'une allocation plus offensive.')
    }
  }

  // Scénario Valorisation (liquidityNeed: 'low', illiquidityTolerance: 'high')
  // → Sous réserve si profil Prudent ou besoin liquidité élevé
  if (liquidityNeed === 'low') {
    if (riskProfile === 'Prudent') {
      reserves.push('Le profil prudent n\'est pas aligné avec une allocation fortement orientée vers la performance.')
    }
    if (riskProfile === 'Équilibré') {
      reserves.push('Le profil équilibré mérite une validation avant d\'adopter une allocation aussi offensive.')
    }
    if (illiquidityTol === 'high' && input.flexibilityNeed === 'high') {
      reserves.push('Le besoin de souplesse élevé entre en tension avec la contrainte de liquidité de ce scénario.')
    }
    if (input.emergencyMonths < 6) {
      reserves.push('La réserve de sécurité limitée rend risquée une allocation peu liquide.')
    }
  }

  // ─── 7. Cohérence liquidité déclarée vs scénario ─────────────────────────
  if (input.flexibilityNeed === 'high' && liquidityNeed === 'low') {
    reserves.push('Le besoin de disponibilité élevé est peu compatible avec un scénario à faible liquidité.')
  }

  if (input.flexibilityNeed === 'low' && liquidityNeed === 'high' && horizonYears >= 10) {
    reserves.push('Avec un faible besoin de liquidité et un horizon long, ce scénario reste trop prudent.')
  }

  // ─── Statut final ─────────────────────────────────────────────────────────
  let status: SuitabilityStatus = 'ADAPTEE'
  if (reserves.length >= 3) status = 'NON_ADAPTEE'
  else if (reserves.length >= 1) status = 'ADAPTEE_SOUS_RESERVE'

  const summary =
    status === 'ADAPTEE'
      ? 'La recommandation ressort globalement adaptée au regard des informations retenues.'
      : status === 'ADAPTEE_SOUS_RESERVE'
        ? 'La recommandation paraît cohérente sous réserve de validation de certains points structurants.'
        : 'La recommandation apparaît insuffisamment adaptée tant que plusieurs réserves majeures ne sont pas levées.'

  return { status, summary, strengths, reserves }
}
