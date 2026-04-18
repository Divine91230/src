import { FRANCE_TAX_2026 } from '../../tax/taxParameters/france_2026'
import type { WithdrawalSimulationInput, WithdrawalSimulationResult } from '../common/withdrawal.types'

function round(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

// ─── simulateCapitalisationWithdrawal ─────────────────────────────────────────
//
// Le contrat de CAPITALISATION se distingue fiscalement de l'assurance-vie
// sur plusieurs points importants :
//
// 1. RACHAT PARTIEL — même mécanique que l'AV (quote-part de gains) ✅
//    → gainRatio = gains totaux / valeur du contrat
//    → gainPortion = retrait × gainRatio
//    → Les produits seuls sont imposables (pas le capital remboursé)
//
// 2. TAUX D'IMPOSITION IR — identique à l'AV ✅
//    → Avant 8 ans : PFU 12,8 %
//    → Après 8 ans : taux réduit 7,5 % (avec option IR possible)
//
// 3. ABATTEMENT ANNUEL — identique à l'AV ✅
//    → 4 600 € (célibataire) / 9 200 € (couple) après 8 ans
//
// 4. PRÉLÈVEMENTS SOCIAUX — identiques à l'AV ✅
//    → 17,2 % sur les gains (pas sur le capital)
//
// 5. TRANSMISSION — DIFFÉRENCE MAJEURE vs AV ⚠️
//    → Contrat de capitalisation : entre dans la succession (pas d'art. 990 I)
//    → Peut être transmis par donation ou cession sans dénouement
//    → Cette simulation ne couvre pas la dimension transmission
//    → Une note d'alerte est affichée à l'utilisateur
//
// 6. REMPLOI / DÉMEMBREMENT — DIFFÉRENCE MAJEURE vs AV ⚠️
//    → Le contrat de capitalisation peut faire l'objet d'une donation
//      en démembrement (usufruit / nue-propriété)
//    → Avantage patrimonial significatif pour les patrimoines importants
//    → Cette simulation ne couvre pas ce cas
//
// Source : CGI art. 125-0 A, BOFiP BOI-RPPM-RCM-20-10-20-50

export function simulateCapitalisationWithdrawal(
  input: WithdrawalSimulationInput,
): WithdrawalSimulationResult {
  const contractValue = Math.max(Number(input.contractValue || 0), 0)
  const contributions = Math.max(Number(input.totalContributions || 0), 0)
  const requested = Math.max(Number(input.requestedGrossWithdrawal || 0), 0)

  // Quote-part de gains incluse dans le retrait
  const gains = Math.max(contractValue - contributions, 0)
  const gainRatio = contractValue > 0 ? gains / contractValue : 0
  const gainPortion = requested * gainRatio
  const contributionPortion = Math.max(requested - gainPortion, 0)

  // Abattement : applicable après 8 ans (même règle que l'AV)
  const allowance =
    input.holdingYears >= 8
      ? input.isCouple
        ? FRANCE_TAX_2026.assuranceVie.annualAllowanceCouple
        : FRANCE_TAX_2026.assuranceVie.annualAllowanceSingle
      : 0

  const taxableGainAfterAllowance = Math.max(gainPortion - allowance, 0)

  // Taux IR : 7,5 % après 8 ans, PFU 12,8 % avant
  const incomeTaxRate =
    input.holdingYears >= 8 ? 0.075 : FRANCE_TAX_2026.pfuIncomeTaxRate

  const incomeTax = taxableGainAfterAllowance * incomeTaxRate

  // PS 17,2 % sur les gains bruts (pas après abattement)
  const socialContributions = gainPortion * FRANCE_TAX_2026.socialContributionsRate

  const totalTax = incomeTax + socialContributions
  const netWithdrawal = Math.max(requested - totalTax, 0)

  // ─── Notes spécifiques contrat de capitalisation ──────────────────────────
  const notes: string[] = []

  if (input.holdingYears >= 8) {
    notes.push(
      `Contrat de plus de 8 ans : abattement annuel de ${(input.isCouple ? FRANCE_TAX_2026.assuranceVie.annualAllowanceCouple : FRANCE_TAX_2026.assuranceVie.annualAllowanceSingle).toLocaleString('fr-FR')} € appliqué sur la quote-part de gains. Taux IR réduit à 7,5 %.`,
    )
  } else {
    notes.push(
      'Contrat de moins de 8 ans : pas d\u2019abattement. Gains soumis au PFU 12,8 % + PS 17,2 %.',
    )
  }

  notes.push(
    'La quote-part imposable porte uniquement sur les produits inclus dans le rachat (règle de proratisation).',
  )

  // Alerte transmission
  notes.push(
    '\u26a0\ufe0f Transmission : contrairement à l\u2019assurance-vie, le contrat de capitalisation entre dans la succession du souscripteur. Il peut toutefois être transmis par donation ou cession sans dénouement — à analyser selon la stratégie patrimoniale globale.',
  )

  // Alerte démembrement si patrimoine potentiellement élevé
  if (contractValue >= 100000) {
    notes.push(
      '\u26a0\ufe0f Démembrement : le contrat de capitalisation peut faire l\u2019objet d\u2019une donation en démembrement (usufruit / nue-propriété), ce qui peut représenter un avantage significatif. Cette simulation n\u2019en tient pas compte.',
    )
  }

  return {
    requestedGrossWithdrawal: round(requested),
    contributionPortion: round(contributionPortion),
    gainPortion: round(gainPortion),
    allowanceUsed: round(Math.min(gainPortion, allowance)),
    taxableGainAfterAllowance: round(taxableGainAfterAllowance),
    incomeTax: round(incomeTax),
    socialContributions: round(socialContributions),
    totalTax: round(totalTax),
    netWithdrawal: round(netWithdrawal),
    effectiveTaxRate: requested > 0 ? round(totalTax / requested) : 0,
    notes,
  }
}
