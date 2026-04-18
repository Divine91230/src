import type {
  EnvelopeReorganizationDecision,
  EnvelopeReorganizationReview,
  ExistingEnvelopeRecord,
} from './envelopeReorg.types'

export function getEnvelopeDecisionLabel(
  decision: EnvelopeReorganizationDecision,
): EnvelopeReorganizationReview['statusLabel'] {
  switch (decision) {
    case 'KEEP':
      return 'Conserver'
    case 'KEEP_REALLOCATE':
      return 'Conserver mais réallouer'
    case 'KEEP_STOP_PAYMENTS':
      return 'Conserver sans nouveaux versements'
    case 'TRANSFER':
      return 'Transférer'
    case 'ADD_COMPLEMENT':
      return 'Compléter avec une nouvelle enveloppe'
    case 'REPLACE_PARTIAL':
      return 'Remplacer partiellement'
    case 'REPLACE_TOTAL':
      return 'Remplacer totalement'
    default:
      return 'À étudier manuellement'
  }
}

function prettyEnvelopeType(envelope: ExistingEnvelopeRecord) {
  switch (envelope.type) {
    case 'ASSURANCE_VIE':
      return 'contrat d’assurance-vie'
    case 'PEA':
      return 'PEA'
    case 'CTO':
      return 'compte-titres'
    case 'PER':
      return 'PER'
    case 'SCPI':
      return 'poche SCPI'
    case 'EPARGNE_BANCAIRE':
      return 'épargne bancaire'
    default:
      return 'enveloppe patrimoniale'
  }
}

export function buildEnvelopeDiagnosis(
  envelope: ExistingEnvelopeRecord,
  statusLabel: string,
  globalScore: number,
) {
  return `Le ${prettyEnvelopeType(envelope)} « ${envelope.label} » présente un score global de ${globalScore}/10. Le statut recommandé ressort à : ${statusLabel.toLowerCase()}.`
}

export function buildEnvelopeAdvisorReading(
  envelope: ExistingEnvelopeRecord,
  decision: EnvelopeReorganizationDecision,
) {
  if (decision === 'KEEP') {
    return `L’enveloppe demeure cohérente avec l’architecture patrimoniale du dossier et peut continuer à jouer son rôle sans remise en cause structurelle.`
  }
  if (decision === 'KEEP_REALLOCATE') {
    return `L’enveloppe conserve un intérêt patrimonial, mais sa place dans la stratégie doit être revue : allocation, niveau de versement ou usage cible.`
  }
  if (decision === 'KEEP_STOP_PAYMENTS') {
    return `L’historique ou la fonction patrimoniale justifie la conservation, mais l’enveloppe ne doit plus être privilégiée comme support principal des nouveaux efforts d’épargne.`
  }
  if (decision === 'TRANSFER') {
    return `La logique de l’enveloppe reste pertinente, mais son environnement actuel paraît perfectible ; un transfert peut améliorer la qualité de mise en œuvre sans perdre l’intérêt du cadre.`
  }
  if (decision === 'ADD_COMPLEMENT') {
    return `L’existant garde une utilité, mais il ne suffit pas à lui seul à porter la stratégie cible. Une enveloppe complémentaire paraît justifiée pour améliorer l’adéquation globale.`
  }
  if (decision === 'REPLACE_PARTIAL' || decision === 'REPLACE_TOTAL') {
    return `L’enveloppe paraît insuffisamment adaptée pour soutenir le développement patrimonial futur dans de bonnes conditions de coût, de qualité de supports ou de cohérence stratégique.`
  }
  return `La décision doit être complétée par une analyse manuelle, notamment sur les frais, les supports ou les conséquences opérationnelles.`
}

export function buildEnvelopeRecommendedAction(
  envelope: ExistingEnvelopeRecord,
  decision: EnvelopeReorganizationDecision,
) {
  switch (decision) {
    case 'KEEP':
      return `Conserver l’enveloppe et l’intégrer comme brique stable de la stratégie cible.`
    case 'KEEP_REALLOCATE':
      return `Conserver l’enveloppe, revoir l’allocation et ajuster sa fonction dans le dossier.`
    case 'KEEP_STOP_PAYMENTS':
      return `Conserver l’enveloppe, mais interrompre ou limiter les nouveaux versements.`
    case 'TRANSFER':
      return `Étudier un transfert pour préserver l’intérêt de l’enveloppe dans de meilleures conditions de gestion.`
    case 'ADD_COMPLEMENT':
      return `Conserver l’existant tout en ouvrant une enveloppe complémentaire mieux alignée avec le profil et les objectifs.`
    case 'REPLACE_PARTIAL':
      return `Réduire progressivement l’usage du contrat actuel au profit d’une structure plus adaptée.`
    case 'REPLACE_TOTAL':
      return `Préparer un remplacement complet, après validation des impacts fiscaux et opérationnels.`
    default:
      return `Approfondir le diagnostic avant arbitrage définitif.`
  }
}

export function buildEnvelopeClientImpact(
  envelope: ExistingEnvelopeRecord,
  decision: EnvelopeReorganizationDecision,
) {
  if (decision === 'KEEP') {
    return `Le client conserve la lisibilité de son architecture actuelle sans changement structurant immédiat.`
  }
  if (decision === 'TRANSFER') {
    return `Le client peut préserver l’intérêt de l’enveloppe tout en améliorant les conditions d’exploitation et la qualité de mise en œuvre.`
  }
  if (decision === 'ADD_COMPLEMENT') {
    return `Le client conserve l’historique utile de l’existant tout en renforçant la pertinence de la stratégie future.`
  }
  if (decision === 'KEEP_STOP_PAYMENTS') {
    return `Le client évite d’accentuer une enveloppe moins prioritaire tout en gardant la souplesse de l’existant.`
  }
  return `Le client retrouve progressivement une architecture plus cohérente avec ses objectifs, sa liquidité et son profil de risque.`
}

export function buildEnvelopeComplianceJustification(
  envelope: ExistingEnvelopeRecord,
  decision: EnvelopeReorganizationDecision,
) {
  return `La recommandation relative à « ${envelope.label} » est fondée sur l’analyse conjointe de l’ancienneté de l’enveloppe, de son intérêt patrimonial, de sa liquidité, de son adéquation au profil client, de ses objectifs et de la cohérence globale de l’architecture recommandée.`
}

export function buildEnvelopeVigilancePoints(
  envelope: ExistingEnvelopeRecord,
  decision: EnvelopeReorganizationDecision,
) {
  const points: string[] = []

  if (envelope.type === 'ASSURANCE_VIE' && envelope.beneficiaryClauseUpdated === false) {
    points.push('Mettre à jour la clause bénéficiaire.')
  }
  if (envelope.type === 'PER') {
    points.push('Vérifier l’intérêt réel de nouveaux versements au regard de la TMI et du besoin de liquidité.')
  }
  if (envelope.type === 'SCPI') {
    points.push('Tenir compte de la liquidité plus contrainte et du poids immobilier déjà présent dans le patrimoine.')
  }
  if (envelope.type === 'PEA' || envelope.type === 'CTO') {
    points.push('Vérifier l’adéquation de la poche actions au profil de risque retenu.')
  }
  if (decision === 'TRANSFER' || decision === 'REPLACE_PARTIAL' || decision === 'REPLACE_TOTAL') {
    points.push('Analyser précisément les impacts fiscaux et opérationnels avant mise en œuvre.')
  }
  return points
}

export function buildPreserveStrengths(envelope: ExistingEnvelopeRecord, decision: EnvelopeReorganizationDecision) {
  const strengths: string[] = []
  if (envelope.type === 'ASSURANCE_VIE') strengths.push('Antériorité fiscale potentielle à préserver')
  if (envelope.type === 'PEA') strengths.push('Cadre fiscal actions à conserver si le plan est déjà mature')
  if (envelope.type === 'EPARGNE_BANCAIRE') strengths.push('Souplesse de liquidité immédiate')
  if (decision === 'KEEP' || decision === 'KEEP_REALLOCATE') strengths.push('Enveloppe déjà intégrée au patrimoine du client')
  return strengths
}

export function buildImprovePoints(envelope: ExistingEnvelopeRecord, decision: EnvelopeReorganizationDecision) {
  const points: string[] = []
  if (decision === 'KEEP_REALLOCATE') points.push('Revoir l’allocation interne')
  if (decision === 'TRANSFER') points.push('Améliorer l’environnement de détention')
  if (decision === 'ADD_COMPLEMENT') points.push('Créer une enveloppe complémentaire mieux adaptée')
  if (envelope.type === 'ASSURANCE_VIE') points.push('Vérifier la qualité des supports et la clause bénéficiaire')
  return points
}

export function buildAvoidPoints(envelope: ExistingEnvelopeRecord, decision: EnvelopeReorganizationDecision) {
  const points: string[] = []
  if (decision === 'KEEP_STOP_PAYMENTS') points.push('Ne plus en faire un support prioritaire de versements')
  if (envelope.type === 'PER') points.push('Éviter de rigidifier excessivement la liquidité du dossier')
  if (envelope.type === 'SCPI') points.push('Éviter d’accentuer la concentration immobilière sans nécessité')
  return points
}
