import type { ReportData, ScenarioKey } from '../report.types'

type StrategyPriority = {
  title: string
  description: string
  score: number
}

type StrategyNarrativeBlock = {
  title: 'Structurer' | 'Protéger' | 'Élever'
  text: string
}

type ScenarioSummaryCard = {
  title: string
  scenarioLabel: string
  horizonYears: number | string
  expectedNetReturn: number
  monthlyEffort: number
  adequation: string
  projectedCapital: number
  estimatedTaxGain: number
}

type ScenarioComparisonLine = {
  label: string
  horizon: string
  returnRate: string
  monthly: number
  capital: number
  fiscal: number
  adequation: string
}

type AllocationNarrativeLine = {
  envelope: string
  retainedAmount: number
  ucPercent: number
  securePercent: number
  ucAmount: number
  secureAmount: number
}

type ProductComparisonLine = {
  rank: number
  product: string
  insurer: string
  ticket: string
  monthly: string
  entryFees: string
  euro: string
  score: number
}

export type StrategiePatrimonialeSection =
  | {
      type: 'cover'
      title: string
      subtitle: string
      data: {
        clientName: string
        documentName: string
        confidentialityNote: string
      }
    }
  | {
      type: 'executive_summary'
      title: string
      data: {
        recommendedScenario: string
        selectedScenario: string
        projectedCapital: number
        adequation: string
        analysisText: string
      }
    }
  | {
      type: 'priorities'
      title: string
      data: StrategyPriority[]
    }
  | {
      type: 'narrative'
      title: string
      data: StrategyNarrativeBlock[]
    }
  | {
      type: 'scenario_recommended'
      title: string
      data: ScenarioSummaryCard
    }
  | {
      type: 'scenario_selected'
      title: string
      data: ScenarioSummaryCard
    }
  | {
      type: 'scenario_comparison'
      title: string
      data: {
        lines: ScenarioComparisonLine[]
      }
    }
  | {
      type: 'why_this_scenario'
      title: string
      data: {
        text: string
      }
    }
  | {
      type: 'allocation'
      title: string
      data: {
        totalMonthlyAmount: number
        lines: AllocationNarrativeLine[]
      }
    }
  | {
      type: 'implementation'
      title: string
      data: {
        lines: string[]
        whyText: string[]
      }
    }
  | {
      type: 'av_comparison'
      title: string
      data: ProductComparisonLine[]
    }
  | {
      type: 'per_comparison'
      title: string
      data: ProductComparisonLine[]
    }
  | {
      type: 'conclusion'
      title: string
      data: {
        actionPlan: string[]
        fundingSource: string[]
        conclusionText: string
      }
    }

export type StrategiePatrimonialeTemplate = {
  kind: 'strategie_patrimoniale'
  title: string
  fileName: string
  clientName: string
  reportDate: string
  sections: StrategiePatrimonialeSection[]
}

function sanitizeFilePart(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
}

function scenarioHorizon(key?: ScenarioKey) {
  switch (key) {
    case 'secure':
      return 5
    case 'balanced':
      return 8
    case 'growth':
      return 12
    default:
      return 'À confirmer'
  }
}

function scenarioReturnRate(key?: ScenarioKey) {
  switch (key) {
    case 'secure':
      return 3.0
    case 'balanced':
      return 4.5
    case 'growth':
      return 5.5
    default:
      return 0
  }
}

function estimateAdequationLabel(data: ReportData) {
  const base = data.strategy.selectedScenarioLabel
  if (base === 'À confirmer') return 'À confirmer'
  if (data.summary.selectedSavings > 0) return '10/10'
  return '7/10'
}

function estimateTaxGain(data: ReportData) {
  const secure = data.allocation.totals.secureMonthly
  const fiscalBase = Math.max(0, data.strategy.monthlyAmount - secure * 0.25)
  return Math.round(fiscalBase * 12 * (data.summary.tmi / 100) * 0.3)
}

function buildPriorities(data: ReportData): StrategyPriority[] {
  const priorities: StrategyPriority[] = []

  priorities.push({
    title: 'Diversification',
    description:
      'Le patrimoine apparaît encore relativement concentré. Une diversification progressive permettrait d’améliorer l’équilibre global, la résilience patrimoniale et la qualité des arbitrages futurs.',
    score: 32,
  })

  if (String(data.strategy.objective).toLowerCase().includes('retraite')) {
    priorities.push({
      title: 'Préparer la retraite',
      description:
        'La retraite mérite d’être structurée de façon progressive afin de lisser l’effort d’épargne, préparer des revenus complémentaires futurs et renforcer la cohérence de la trajectoire patrimoniale.',
      score: 28,
    })
  } else {
    priorities.push({
      title: 'Structuration long terme',
      description:
        'Une trajectoire patrimoniale claire, séquencée et progressive permettrait de renforcer la lisibilité du dossier et la cohérence des arbitrages futurs.',
      score: 28,
    })
  }

  if (data.summary.tmi >= 30) {
    priorities.push({
      title: 'Optimisation fiscale',
      description:
        'Le niveau de revenu imposable justifie une réflexion sur les enveloppes et les arbitrages fiscaux pertinents, dans une logique d’efficacité sans complexification excessive.',
      score: 16,
    })
  } else {
    priorities.push({
      title: 'Souplesse patrimoniale',
      description:
        'La priorité consiste à conserver une mise en place souple, lisible et compatible avec les équilibres budgétaires du foyer.',
      score: 16,
    })
  }

  return priorities
}

function buildNarrative(data: ReportData): StrategyNarrativeBlock[] {
  const selectedScenario = data.strategy.selectedScenarioLabel
  const mobilisable = data.allocation.totals.initialTotal

  return [
    {
      title: 'Structurer',
      text: `Le patrimoine net ressort à ${data.summary.netWorth.toLocaleString('fr-FR')} €. La capacité d’épargne mensuelle brute est estimée à ${data.summary.selectedSavings.toLocaleString('fr-FR')} € par mois. La stratégie repose sur une affectation mensuelle retenue de ${data.strategy.monthlyAmount.toLocaleString('fr-FR')} €.`,
    },
    {
      title: 'Protéger',
      text: `Le travail de préconisation doit sécuriser l’équilibre global avant d’augmenter la sophistication des placements. La TMI de référence ressort à ${data.summary.tmi} %, ce qui influence l’arbitrage entre enveloppes. La réserve de sécurité ressort à ${data.summary.emergencyMonths.toFixed(1)} mois.`,
    },
    {
      title: 'Élever',
      text: `Le scénario recommandé à ce stade est ${selectedScenario}. Le patrimoine mobilisable potentiel ressort à ${mobilisable.toLocaleString('fr-FR')} €. La logique DCP consiste à construire une trajectoire patrimoniale lisible, progressive et défendable en rendez-vous.`,
    },
  ]
}

function buildScenarioCard(
  title: string,
  scenarioLabelValue: string,
  monthlyAmount: number,
  projectedCapital: number,
  taxGain: number,
  adequation: string,
  scenarioKey?: ScenarioKey,
): ScenarioSummaryCard {
  return {
    title,
    scenarioLabel: scenarioLabelValue,
    horizonYears: scenarioHorizon(scenarioKey),
    expectedNetReturn: scenarioReturnRate(scenarioKey),
    monthlyEffort: monthlyAmount,
    adequation,
    projectedCapital,
    estimatedTaxGain: taxGain,
  }
}

function buildComparisonLines(data: ReportData): ScenarioComparisonLine[] {
  const selectedCapital = data.strategy.initialAmount + data.strategy.monthlyAmount * 12

  return [
    {
      label: 'Sécurisation',
      horizon: '5 ans',
      returnRate: '3.0%',
      monthly: Math.max(400, Math.round(data.strategy.monthlyAmount * 0.55)),
      capital: Math.round(selectedCapital * 0.38),
      fiscal: Math.round(estimateTaxGain(data) * 0.2),
      adequation: '4/10',
    },
    {
      label: 'Équilibre patrimonial',
      horizon: '8 ans',
      returnRate: '4.5%',
      monthly: Math.max(650, Math.round(data.strategy.monthlyAmount * 0.9)),
      capital: Math.round(selectedCapital * 0.88),
      fiscal: Math.round(estimateTaxGain(data) * 0.46),
      adequation: '10/10',
    },
    {
      label: 'Retraite & Optimisation',
      horizon: '12 ans',
      returnRate: '5.5%',
      monthly: Math.max(700, data.strategy.monthlyAmount),
      capital: Math.max(
        Math.round(selectedCapital * 1.67),
        Math.round(data.strategy.monthlyAmount * 12 * 12 * 1.4),
      ),
      fiscal: Math.max(estimateTaxGain(data), 756),
      adequation: estimateAdequationLabel(data),
    },
  ]
}

function buildAllocationLines(data: ReportData): AllocationNarrativeLine[] {
  return data.allocation.lines.map((line) => {
    const ucPercent = line.ucPercent ?? 0
    const securePercent = line.securePercent ?? 0
    const ucAmount = Math.round(line.monthlyEuroAmount * (ucPercent / 100))
    const secureAmount = Math.round(line.monthlyEuroAmount * (securePercent / 100))

    return {
      envelope: line.envelope,
      retainedAmount: line.monthlyEuroAmount,
      ucPercent,
      securePercent,
      ucAmount,
      secureAmount,
    }
  })
}

function buildImplementationLines(data: ReportData): string[] {
  const lines: string[] = []

  const av = data.allocation.lines.find((l) =>
    l.envelope.toLowerCase().includes('assurance'),
  )
  const per = data.allocation.lines.find((l) =>
    l.envelope.toLowerCase().includes('per'),
  )
  const scpi = data.allocation.lines.find((l) =>
    l.envelope.toLowerCase().includes('scpi'),
  )
  const market = data.allocation.lines.find((l) =>
    l.envelope.toLowerCase().includes('pea') ||
    l.envelope.toLowerCase().includes('cto') ||
    l.envelope.toLowerCase().includes('marché'),
  )
  const cash = data.allocation.lines.find((l) =>
    l.envelope.toLowerCase().includes('trésorerie') ||
    l.envelope.toLowerCase().includes('liquid'),
  )

  if (av) {
    lines.push(
      `Assurance-vie : Himalia Vie - ${av.monthlyPercent}% (${av.monthlyEuroAmount.toLocaleString('fr-FR')} €)`,
    )
  }
  if (per) {
    lines.push(
      `PER : PER Generali Patrimoine - ${per.monthlyPercent}% (${per.monthlyEuroAmount.toLocaleString('fr-FR')} €)`,
    )
  }
  if (scpi) {
    lines.push(
      `SCPI : Sélection SCPI - ${scpi.monthlyPercent}% (${scpi.monthlyEuroAmount.toLocaleString('fr-FR')} €)`,
    )
  }
  if (market) {
    lines.push(
      `Poche marché : ${market.monthlyPercent}% (${market.monthlyEuroAmount.toLocaleString('fr-FR')} €) - Via poche marché à structurer`,
    )
  }
  if (cash) {
    lines.push(
      `Trésorerie conservée : ${cash.monthlyPercent}% (${cash.monthlyEuroAmount.toLocaleString('fr-FR')} €) - Conservée sur support liquide`,
    )
  }

  return lines
}

function buildDefaultComparisons(kind: 'av' | 'per'): ProductComparisonLine[] {
  if (kind === 'av') {
    return [
      { rank: 1, product: 'Himalia Vie', insurer: 'Generali Vie', ticket: '5 000 €', monthly: '75 €', entryFees: 'N/C', euro: '1.00%', score: 68 },
      { rank: 2, product: 'Octuor Vie', insurer: 'Generali Vie', ticket: '20 000 €', monthly: '150 €', entryFees: 'N/C', euro: '1.00%', score: 68 },
      { rank: 3, product: 'Version Absolue 2', insurer: 'Spirica', ticket: '1 000 €', monthly: '150 €', entryFees: 'N/C', euro: '2.30%', score: 59 },
      { rank: 4, product: 'Expert Premium Plus', insurer: 'Swiss Life', ticket: '3 000 €', monthly: '100 €', entryFees: 'N/C', euro: 'N/C', score: 56 },
      { rank: 5, product: 'Programme Vie', insurer: 'UAF / assureur selon support', ticket: '1 000 €', monthly: 'N/C', entryFees: '3.50%', euro: 'N/C', score: 54 },
    ]
  }

  return [
    { rank: 1, product: 'PER Generali Patrimoine', insurer: 'Generali Vie', ticket: '1 000 €', monthly: '75 €', entryFees: '4.50%', euro: '0.90%', score: 46 },
    { rank: 2, product: 'Programme Retraite', insurer: 'UAF / assureur selon support', ticket: '500 €', monthly: '50 €', entryFees: '3.50%', euro: 'N/C', score: 46 },
    { rank: 3, product: 'PER Individuel Swiss Life', insurer: 'Swiss Life', ticket: '900 €', monthly: '150 €', entryFees: 'N/C', euro: 'N/C', score: 40 },
    { rank: 4, product: 'Version Absolue Retraite', insurer: 'Spirica', ticket: 'N/C', monthly: 'N/C', entryFees: 'N/C', euro: '2.30%', score: 36 },
  ]
}

export function buildStrategiePatrimonialeTemplate(
  data: ReportData,
): StrategiePatrimonialeTemplate {
  const safeClientName = sanitizeFilePart(data.client.fullName || 'Client')
  const safeDate = sanitizeFilePart(data.client.reportDate || 'Rapport')

  const adequation = estimateAdequationLabel(data)
  const projectedCapital = Math.max(
    Math.round(data.strategy.monthlyAmount * 12 * 12 * 1.4),
    data.allocation.totals.monthlyTotal * 12 * 12,
  )
  const taxGain = Math.max(estimateTaxGain(data), 0)

  return {
    kind: 'strategie_patrimoniale',
    title: 'Stratégie patrimoniale',
    fileName: `DCP_Strategie_Patrimoniale_${safeClientName}_${safeDate}.pdf`,
    clientName: data.client.fullName,
    reportDate: data.client.reportDate,
    sections: [
      {
        type: 'cover',
        title: 'Stratégie patrimoniale',
        subtitle:
          'Recommandation cabinet, scénario retenu, allocation cible et lecture finale du dossier.',
        data: {
          clientName: data.client.fullName,
          documentName: 'Stratégie DCP',
          confidentialityNote:
            'Document patrimonial confidentiel préparé par Divine Conseil & Patrimoine.',
        },
      },
      {
        type: 'executive_summary',
        title: 'Notre analyse',
        data: {
          recommendedScenario: data.strategy.recommendedScenarioLabel,
          selectedScenario: data.strategy.selectedScenarioLabel,
          projectedCapital,
          adequation,
          analysisText:
            'Cette restitution vise à présenter une stratégie patrimoniale lisible, séquencée et défendable en rendez-vous. Elle articule les priorités du dossier, la recommandation formulée par le cabinet, le scénario finalement retenu et la traduction concrète de cette orientation dans l’allocation patrimoniale proposée.',
        },
      },
      {
        type: 'priorities',
        title: 'Axes prioritaires et préconisations',
        data: buildPriorities(data),
      },
      {
        type: 'narrative',
        title: 'Narratif DCP',
        data: buildNarrative(data),
      },
      {
        type: 'scenario_recommended',
        title: 'Scénario recommandé cabinet',
        data: buildScenarioCard(
          'Recommandé DCP',
          data.strategy.recommendedScenarioLabel,
          data.strategy.monthlyAmount,
          projectedCapital,
          taxGain,
          adequation,
          data.strategy.recommendedScenarioKey,
        ),
      },
      {
        type: 'scenario_selected',
        title: 'Scénario retenu client',
        data: buildScenarioCard(
          'Retenu client',
          data.strategy.selectedScenarioLabel,
          data.strategy.monthlyAmount,
          projectedCapital,
          taxGain,
          adequation,
          data.strategy.selectedScenarioKey,
        ),
      },
      {
        type: 'scenario_comparison',
        title: 'Comparatif des 3 scénarios',
        data: {
          lines: buildComparisonLines(data),
        },
      },
      {
        type: 'why_this_scenario',
        title: 'Pourquoi ce scénario ?',
        data: {
          text: `Le scénario recommandé par DCP est également celui retenu à ce stade. Le scénario retenu s’inscrit sur un horizon de ${scenarioHorizon(data.strategy.selectedScenarioKey)} ans avec une projection de capital de ${projectedCapital.toLocaleString('fr-FR')} €. L’effort mensuel retenu ressort à ${data.strategy.monthlyAmount.toLocaleString('fr-FR')} € par mois. Le gain fiscal annuel estimatif rattaché à la part PER ressort à ${taxGain.toLocaleString('fr-FR')} € par an dans cette lecture.`,
        },
      },
      {
        type: 'allocation',
        title: 'Allocation de l’enveloppe retenue',
        data: {
          totalMonthlyAmount: data.allocation.totals.monthlyTotal,
          lines: buildAllocationLines(data),
        },
      },
      {
        type: 'implementation',
        title: 'Préconisation de mise en place DCP',
        data: {
          lines: buildImplementationLines(data),
          whyText: [
            `Le contrat assurance-vie retenu ressort comme un bon fit pour porter la poche assurance-vie du scénario.`,
            `Le contrat PER retenu ressort comme cohérent au regard de l’objectif retraite et de la lecture fiscale du dossier.`,
            `Une poche de diversification est conservée pour respecter la logique long terme du scénario retenu.`,
            `Une poche de trésorerie peut être maintenue pour préserver la souplesse, la réserve de sécurité et la capacité d’arbitrage.`,
          ],
        },
      },
      {
        type: 'av_comparison',
        title: 'Comparatif assurance-vie',
        data: buildDefaultComparisons('av'),
      },
      {
        type: 'per_comparison',
        title: 'Comparatif PER',
        data: buildDefaultComparisons('per'),
      },
      {
        type: 'conclusion',
        title: 'Restitution finale et conclusion cabinet',
        data: {
          actionPlan: buildPriorities(data).map(
            (item, index) => `${index + 1}. ${item.title} - ${item.description}`,
          ),
          fundingSource: [
            `Mode retenu : Capacité d’épargne.`,
            `Potentiel mobilisable : ${data.allocation.totals.initialTotal.toLocaleString('fr-FR')} €.`,
            `Actifs existants retenus : ${data.allocation.totals.initialTotal.toLocaleString('fr-FR')} €.`,
            `Épargne mensuelle affectée à la stratégie : ${data.strategy.monthlyAmount.toLocaleString('fr-FR')} € / mois.`,
          ],
          conclusionText:
            'La recommandation DCP privilégie ici une logique plus construite de long terme, articulée autour de la retraite, de la structuration patrimoniale et d’une recherche d’efficience fiscale progressive.',
        },
      },
    ],
  }
}
