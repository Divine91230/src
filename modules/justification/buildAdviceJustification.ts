import type { Recommendation } from '../../domain/types/analysis'
import type { ClientSnapshot } from '../../domain/types/patrimony'
import type { AdviceJustification } from './justification.types'

export function buildAdviceJustification(
  client: ClientSnapshot,
  recommendations: Recommendation[],
): AdviceJustification[] {
  return recommendations.map((item) => ({
    axis: item.axis,
    title: item.title,
    finding: item.summary,
    issue: buildIssueLabel(item.axis),
    objective: buildObjectiveLabel(item.axis, client),
    recommendation: item.title,
    reasons: item.rationale,
    alternatives: buildAlternatives(item.axis),
    watchpoints: buildWatchpoints(item.axis, client),
    expectedImpacts: buildExpectedImpacts(item.axis),
  }))
}

function buildIssueLabel(axis: Recommendation['axis']) {
  if (axis === 'LIQUIDITE') return 'Le niveau de liquidité du foyer apparaît insuffisant au regard des charges et des besoins de souplesse.'
  if (axis === 'DIVERSIFICATION') return 'La structure patrimoniale paraît concentrée et gagnerait à être mieux équilibrée.'
  if (axis === 'FISCALITE') return 'Le dossier présente un potentiel d’optimisation fiscale à analyser sans rompre l’équilibre global.'
  if (axis === 'RETRAITE') return 'La préparation du long terme mérite une architecture plus lisible et mieux séquencée.'
  if (axis === 'PROTECTION') return 'La protection du foyer doit être confortée avant toute montée en complexité.'
  return 'Le dossier appelle un travail de structuration patrimoniale.'
}

function buildObjectiveLabel(axis: Recommendation['axis'], client: ClientSnapshot) {
  if (axis === 'LIQUIDITE') return 'Préserver la souplesse financière et renforcer la réserve de sécurité.'
  if (axis === 'DIVERSIFICATION') return 'Répartir davantage le patrimoine entre plusieurs classes d’actifs et enveloppes.'
  if (axis === 'FISCALITE') return `Améliorer l’efficacité fiscale sans dégrader la liquidité ni la lisibilité du dossier.`
  if (axis === 'RETRAITE') return 'Structurer progressivement une poche long terme cohérente avec l’horizon visé.'
  if (axis === 'PROTECTION') return 'Sécuriser le foyer, la continuité financière et les personnes à charge.'
  if (client.goals.includes('TRANSMISSION')) return 'Préparer plus sereinement les objectifs de transmission.'
  return 'Structurer le patrimoine avec un ordre de priorités cohérent.'
}

function buildAlternatives(axis: Recommendation['axis']) {
  if (axis === 'LIQUIDITE') return ['Maintenir une poche de trésorerie inchangée', 'Différer les solutions moins liquides']
  if (axis === 'DIVERSIFICATION') return ['Renforcer les enveloppes existantes', 'Étudier une nouvelle enveloppe plus adaptée']
  if (axis === 'FISCALITE') return ['Conserver une approche neutre fiscalement', 'Différer tout levier fiscal si la liquidité prime']
  if (axis === 'RETRAITE') return ['Mettre en place une solution progressive', 'Conserver une logique hors retraite dans l’immédiat']
  if (axis === 'PROTECTION') return ['Actualiser les garanties existantes', 'Revoir les clauses et la prévoyance']
  return ['Maintenir l’existant', 'Approfondir le diagnostic avant décision']
}

function buildWatchpoints(axis: Recommendation['axis'], client: ClientSnapshot) {
  const items: string[] = []
  if (axis === 'LIQUIDITE' && client.budget.monthlySavingsCapacity <= 0) {
    items.push('L’effort d’épargne disponible reste limité à ce stade.')
  }
  if (axis === 'DIVERSIFICATION' && client.assets.realEstate > client.assets.financial) {
    items.push('La poche immobilière conserve un poids important dans la structure actuelle.')
  }
  if (axis === 'FISCALITE' && client.marginalTaxRate < 0.3) {
    items.push('Le levier fiscal doit rester secondaire si le gain attendu est modéré.')
  }
  if (axis === 'PROTECTION' && client.household.childrenCount > 0) {
    items.push('La protection des personnes à charge doit être traitée explicitement.')
  }
  if (items.length === 0) items.push('La recommandation doit rester cohérente avec les moyens réellement mobilisables.')
  return items
}

function buildExpectedImpacts(axis: Recommendation['axis']) {
  if (axis === 'LIQUIDITE') return ['Amélioration de la résilience budgétaire', 'Moindre pression sur les arbitrages à court terme']
  if (axis === 'DIVERSIFICATION') return ['Meilleure répartition du risque', 'Souplesse patrimoniale accrue']
  if (axis === 'FISCALITE') return ['Efficacité fiscale plus lisible', 'Meilleure cohérence entre horizon et enveloppes']
  if (axis === 'RETRAITE') return ['Visibilité renforcée sur le long terme', 'Discipline d’investissement plus structurée']
  if (axis === 'PROTECTION') return ['Sécurisation du foyer', 'Réduction du risque patrimonial en cas d’aléa']
  return ['Meilleure lisibilité du dossier', 'Décisions plus cohérentes dans le temps']
}
