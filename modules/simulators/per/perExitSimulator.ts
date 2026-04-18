import { FRANCE_TAX_2026 } from '../../tax/taxParameters/france_2026'
import type { PerExitComparisonResult, PerExitInput, PerExitScenarioResult } from './perSimulation.types'

function round(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

// ─── Sortie en capital ────────────────────────────────────────────────────────
// Règle fiscale PER 2026 :
//
// Versements DÉDUITS (cas le plus fréquent) :
//   → Les versements sont réintégrés au barème IR à la TMI du client
//   → Les gains sont imposés au PFU 30 % (12,8 % IR + 17,2 % PS)
//   → Pas de possibilité de fractionnement dans cette simulation (cas général)
//
// Versements NON DÉDUITS (versements volontaires non déduits) :
//   → Les versements ne sont PAS réintégrés (déjà imposés à l'entrée)
//   → Les gains sont imposés au PFU 30 % uniquement
//
// Note : le fractionnement sur plusieurs années (article 163-0 A du CGI)
// peut réduire significativement la facture fiscale mais nécessite une
// analyse personnalisée hors simulation standard.
function buildCapitalScenario(input: PerExitInput): PerExitScenarioResult {
  const contributions = Math.max(input.contributions, 0)
  const gains = Math.max(input.gains, 0)
  const gross = contributions + gains

  let contributionIR = 0
  let gainIR = 0
  let gainPS = 0

  if (input.taxMode === 'DEDUCTED') {
    // Versements déduits : réintégrés au barème à la TMI
    contributionIR = contributions * input.marginalTaxRate
    // Gains : PFU = IR 12,8 % + PS 17,2 %
    gainIR = gains * FRANCE_TAX_2026.pfuIncomeTaxRate
    gainPS = gains * FRANCE_TAX_2026.socialContributionsRate
  } else {
    // Versements non déduits : pas de réintégration IR sur la part versements
    // Gains uniquement : PFU 30 %
    gainIR = gains * FRANCE_TAX_2026.pfuIncomeTaxRate
    gainPS = gains * FRANCE_TAX_2026.socialContributionsRate
  }

  const totalIR = contributionIR + gainIR
  const totalTax = totalIR + gainPS

  const notes: string[] = []

  if (input.taxMode === 'DEDUCTED') {
    notes.push(
      `Versements déduits à l'entrée : réintégrés au barème IR à la TMI retenue (${Math.round(input.marginalTaxRate * 100)} %). Les gains sont imposés au PFU 30 % (12,8 % IR + 17,2 % PS).`,
    )
    notes.push(
      'Le fractionnement de la sortie sur plusieurs années (art. 163-0 A CGI) peut réduire significativement l\u2019imposition — à étudier selon le dossier.',
    )
  } else {
    notes.push(
      'Versements non déduits à l\u2019entrée : la part correspondant aux versements n\u2019est pas réintégrée au barème. Seuls les gains sont soumis au PFU 30 %.',
    )
  }

  return {
    grossAmount: round(gross),
    incomeTax: round(totalIR),
    socialContributions: round(gainPS),
    totalTax: round(totalTax),
    netAmount: round(gross - totalTax),
    notes,
  }
}

// ─── Sortie en rente ──────────────────────────────────────────────────────────
// Règle fiscale PER 2026 :
//
// Versements DÉDUITS :
//   → Rente imposée comme pension retraite : barème IR après abattement 10 %
//   → PS : 9,1 % (régime des pensions, pas 17,2 %)
//   → On modélise ici par une fraction taxable de 90 % à la TMI
//
// Versements NON DÉDUITS :
//   → Rente à titre onéreux : fraction taxable selon âge au 1er versement
//     (art. 158-6 CGI) — fraction fixée contractuellement
//   → PS : 17,2 % sur la fraction imposable
//
// Le taux de conversion capital → rente (taux viager) est propre à chaque
// assureur. On retient 4,5 % comme hypothèse centrale prudente.
function buildAnnuityScenario(input: PerExitInput): PerExitScenarioResult {
  const grossCapital = Math.max(input.capital, 0)
  const conversionRate = input.annuityConversionRate ?? 0.045
  const annualGrossAnnuity = grossCapital * conversionRate

  let taxableShare: number
  let psRate: number
  let irNote: string

  if (input.taxMode === 'DEDUCTED') {
    // Rente pension : 90 % imposable à la TMI, PS 9,1 %
    taxableShare = 0.9
    psRate = 0.091
    irNote = `Rente imposée comme pension retraite : 90 % de la rente brute soumis au barème IR à la TMI retenue (${Math.round(input.marginalTaxRate * 100)} %), PS 9,1 %.`
  } else {
    // Rente à titre onéreux : fraction taxable selon âge (hypothèse 40 % si non fournie)
    taxableShare = input.annuityTaxableShare ?? 0.4
    psRate = FRANCE_TAX_2026.socialContributionsRate
    irNote = `Rente à titre onéreux : fraction imposable retenue à ${Math.round(taxableShare * 100)} % (à confirmer selon l\u2019âge au 1er versement — art. 158-6 CGI). PS 17,2 % sur la fraction imposable.`
  }

  const taxableBase = annualGrossAnnuity * taxableShare
  const incomeTax = taxableBase * input.marginalTaxRate
  const socialContributions = taxableBase * psRate
  const totalTax = incomeTax + socialContributions

  return {
    grossAmount: round(annualGrossAnnuity),
    incomeTax: round(incomeTax),
    socialContributions: round(socialContributions),
    totalTax: round(totalTax),
    netAmount: round(annualGrossAnnuity - totalTax),
    notes: [
      'La rente est exprimée en flux annuel brut puis net estimé. Le taux de conversion retenu est ' +
        `${(conversionRate * 100).toFixed(1)} % — à confirmer auprès de l\u2019assureur.`,
      irNote,
    ],
  }
}

// ─── Sortie mixte (capital partiel + rente résiduelle) ────────────────────────
function buildMixedScenario(input: PerExitInput): PerExitScenarioResult {
  const capitalShare = Math.min(Math.max(input.mixCapitalShare ?? 0.5, 0), 1)

  const capitalInput: PerExitInput = {
    ...input,
    contributions: input.contributions * capitalShare,
    gains: input.gains * capitalShare,
  }
  const annuityInput: PerExitInput = {
    ...input,
    capital: input.capital * (1 - capitalShare),
    contributions: input.contributions * (1 - capitalShare),
    gains: input.gains * (1 - capitalShare),
  }

  const capitalScenario = buildCapitalScenario(capitalInput)
  const annuityScenario = buildAnnuityScenario(annuityInput)

  return {
    grossAmount: round(capitalScenario.grossAmount + annuityScenario.grossAmount),
    incomeTax: round(capitalScenario.incomeTax + annuityScenario.incomeTax),
    socialContributions: round(
      capitalScenario.socialContributions + annuityScenario.socialContributions,
    ),
    totalTax: round(capitalScenario.totalTax + annuityScenario.totalTax),
    netAmount: round(capitalScenario.netAmount + annuityScenario.netAmount),
    notes: [
      `Simulation mixte : ${Math.round(capitalShare * 100)} % en capital + ${Math.round((1 - capitalShare) * 100)} % en rente.`,
      'La comparaison capital / rente dépend du besoin de revenus récurrents et de la durée de vie estimée — à analyser avec le client.',
    ],
  }
}

// ─── Point d'entrée principal ─────────────────────────────────────────────────
export function comparePerExitScenarios(input: PerExitInput): PerExitComparisonResult {
  const capital = buildCapitalScenario(input)
  const annuity = buildAnnuityScenario(input)
  const mixed = buildMixedScenario(input)

  const recommendation =
    capital.netAmount >= mixed.netAmount && capital.netAmount >= annuity.netAmount
      ? 'La sortie en capital ressort la plus favorable dans cette simulation. À confronter au besoin de revenus récurrents et à l\u2019opportunité d\u2019un fractionnement fiscal sur plusieurs années.'
      : mixed.netAmount >= annuity.netAmount
      ? 'La sortie mixte offre ici un bon compromis entre liquidité immédiate et maintien d\u2019un revenu viager. À arbitrer selon les besoins du client.'
      : 'La rente ressort comme la solution la plus stable sur longue durée dans cette simulation. À confronter à la durée de vie estimée et au besoin de disponibilité du capital.'

  return { capital, annuity, mixed, recommendation }
}
