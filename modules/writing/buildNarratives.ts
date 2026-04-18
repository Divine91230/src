import type { Recommendation } from '../../domain/types/analysis'
import type { ClientSnapshot } from '../../domain/types/patrimony'
import { buildAdviceJustification } from '../justification/buildAdviceJustification'
import type { RecommendationNarrative } from './narrative.types'

export function buildRecommendationNarratives(
  client: ClientSnapshot,
  recommendations: Recommendation[],
): RecommendationNarrative {
  const justifications = buildAdviceJustification(client, recommendations)

  const executiveSummary = recommendations.length === 0
    ? 'La lecture patrimoniale ne fait pas ressortir d’alerte majeure immédiate ; l’enjeu principal porte sur la cohérence d’ensemble et la qualité de structuration du dossier.'
    : `La lecture patrimoniale fait ressortir ${recommendations.length} axe(s) prioritaire(s), avec une dominante ${recommendations[0].axis.toLowerCase()} à traiter en premier.`

  return {
    executiveSummary,
    justifications,
    blocks: [
      {
        title: 'Lecture synthétique',
        paragraphs: [
          executiveSummary,
          'Les recommandations ci-dessous visent à ordonner les sujets dans un enchaînement cohérent : sécuriser les fondamentaux, structurer les enveloppes puis optimiser selon l’horizon et les objectifs.',
        ],
      },
      {
        title: 'Préconisations',
        paragraphs: recommendations.map((item) => `${item.title} — ${item.summary}`),
      },
    ],
  }
}
