export type FollowUpInput = {
  targetMonthlySavings: number
  actualMonthlySavings: number
  targetEmergencyMonths: number
  actualEmergencyMonths: number
  targetRiskProfile: string
  actualRiskProfile: string
  targetNetWorth?: number
  actualNetWorth?: number
}

export type FollowUpInsight = {
  title: string
  status: 'OK' | 'VIGILANCE' | 'ALERTE'
  text: string
}

export function buildFollowUpInsights(input: FollowUpInput): FollowUpInsight[] {
  const items: FollowUpInsight[] = []

  const savingsGap = input.actualMonthlySavings - input.targetMonthlySavings
  items.push({
    title: 'Discipline d’épargne',
    status: savingsGap >= 0 ? 'OK' : savingsGap >= -150 ? 'VIGILANCE' : 'ALERTE',
    text: savingsGap >= 0
      ? 'Le rythme d’épargne reste au niveau cible ou au-dessus.'
      : 'Le rythme d’épargne observé est inférieur à la cible et appelle un point de revue.',
  })

  const reserveGap = input.actualEmergencyMonths - input.targetEmergencyMonths
  items.push({
    title: 'Réserve de sécurité',
    status: reserveGap >= 0 ? 'OK' : reserveGap >= -1 ? 'VIGILANCE' : 'ALERTE',
    text: reserveGap >= 0
      ? 'La réserve de sécurité reste alignée avec l’objectif retenu.'
      : 'La réserve de sécurité est en retrait par rapport à la cible et doit être reconstituée en priorité.',
  })

  items.push({
    title: 'Cohérence de profil',
    status: input.targetRiskProfile === input.actualRiskProfile ? 'OK' : 'VIGILANCE',
    text: input.targetRiskProfile === input.actualRiskProfile
      ? 'Le profil de risque observé reste cohérent avec la stratégie cible.'
      : 'Le profil ou le comportement observé mérite une revue au regard de la stratégie initiale.',
  })

  if (typeof input.targetNetWorth === 'number' && typeof input.actualNetWorth === 'number') {
    items.push({
      title: 'Avancement patrimonial',
      status: input.actualNetWorth >= input.targetNetWorth ? 'OK' : 'VIGILANCE',
      text: input.actualNetWorth >= input.targetNetWorth
        ? 'Le patrimoine net atteint ou dépasse la cible de suivi.'
        : 'Le patrimoine net reste en dessous de la cible de suivi, sans remettre en cause la trajectoire à ce stade.',
    })
  }

  return items
}
