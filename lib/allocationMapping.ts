import type { ContractEnvelope, RiskProfile } from '../data/contractsCatalog'

export type AllocationLine = {
  id: string
  envelope: string
  initialPercent?: number
  percent?: number
  euroAmount: number
  monthlyPercent?: number
  monthlyEuroAmount: number
  securePercent?: number
  ucPercent?: number
  initialSecurePercent?: number
  initialUcPercent?: number
  monthlySecurePercent?: number
  monthlyUcPercent?: number
}

export type EnvelopeStructureType =
  | 'assurance'
  | 'market'
  | 'real_estate'
  | 'other'

export type ResolvedEnvelopeAllocation = {
  envelope: ContractEnvelope
  sourceLabel: string
  displayLabel: string

  euroAmount: number
  monthlyEuroAmount: number

  initialSecurePercent: number
  initialUcPercent: number
  monthlySecurePercent: number
  monthlyUcPercent: number

  structureType: EnvelopeStructureType
  supportLabelPrimary: string
  supportLabelSecondary: string
}

function toSafeNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value

  if (typeof value === 'string') {
    const normalized = value.replace(/\s/g, '').replace(',', '.').trim()
    const parsed = Number(normalized)
    return Number.isFinite(parsed) ? parsed : 0
  }

  return 0
}

export function getEnvelopeStructureType(
  envelope: ContractEnvelope,
): EnvelopeStructureType {
  if (
    envelope === 'Assurance-vie' ||
    envelope === 'PER' ||
    envelope === 'Contrat de capitalisation'
  ) {
    return 'assurance'
  }

  if (envelope === 'PEA' || envelope === 'CTO') {
    return 'market'
  }

  if (
    envelope === 'SCPI' ||
    envelope === 'Nue-propriété'
  ) {
    return 'real_estate'
  }

  return 'other'
}

export function getEnvelopeDisplayLabel(envelope: ContractEnvelope): string {
  if (envelope === 'Assurance-vie') return 'Assurance-vie'
  if (envelope === 'PER') return 'PER'
  if (envelope === 'Contrat de capitalisation') return 'Contrat de capitalisation'
  if (envelope === 'PEA') return 'PEA'
  if (envelope === 'CTO') return 'Compte-titres ordinaire'
  if (envelope === 'SCPI') return 'SCPI'
  if (envelope === 'Nue-propriété') return 'Nue-propriété'
  if (envelope === 'Produit structuré') return 'Produit structuré'
  if (envelope === 'Fiscal') return 'Solution fiscale'
  if (envelope === 'Lux') return 'Contrat luxembourgeois'
  return envelope
}

export function getEnvelopeSupportLabels(envelope: ContractEnvelope): {
  primary: string
  secondary: string
} {
  if (envelope === 'Assurance-vie') {
    return {
      primary: 'Fonds euros / poche prudente',
      secondary: 'Unités de compte / diversification',
    }
  }

  if (envelope === 'PER') {
    return {
      primary: 'Poche prudente retraite',
      secondary: 'Poche long terme diversifiée',
    }
  }

  if (envelope === 'Contrat de capitalisation') {
    return {
      primary: 'Poche prudente',
      secondary: 'Poche diversifiée',
    }
  }

  if (envelope === 'PEA') {
    return {
      primary: 'Liquidités / poche d’attente',
      secondary: 'ETF / actions éligibles',
    }
  }

  if (envelope === 'CTO') {
    return {
      primary: 'Trésorerie / poche défensive',
      secondary: 'Obligations / ETF / actions',
    }
  }

  if (envelope === 'SCPI') {
    return {
      primary: 'Immobilier indirect',
      secondary: 'Revenus potentiels / valorisation long terme',
    }
  }

  if (envelope === 'Nue-propriété') {
    return {
      primary: 'Immobilier démembré',
      secondary: 'Valorisation long terme',
    }
  }

  return {
    primary: 'Poche principale',
    secondary: 'Poche complémentaire',
  }
}

export function pickMarketEnvelope(params: {
  riskProfile: RiskProfile
  objective: string
}): ContractEnvelope {
  const objective = (params.objective || '').trim().toLowerCase()

  if (
    objective.includes('fiscal') ||
    objective.includes('retraite') ||
    objective.includes('long terme') ||
    objective.includes('divers')
  ) {
    return 'PEA'
  }

  if (params.riskProfile === 'Dynamique') {
    return 'CTO'
  }

  return 'PEA'
}

export function mapAllocationLabelToEnvelope(
  label: string,
  params: {
    riskProfile: RiskProfile
    objective: string
  },
): ContractEnvelope | null {
  if (label === 'Assurance-vie') return 'Assurance-vie'
  if (label === 'PER') return 'PER'
  if (label === 'SCPI' || label === 'SCPI / immobilier papier') return 'SCPI'
  if (label === 'Contrat de capitalisation') return 'Contrat de capitalisation'

  if (label === 'Marché' || label === 'PEA / CTO') {
    return pickMarketEnvelope(params)
  }

  if (label === 'PEA') return 'PEA'
  if (label === 'CTO') return 'CTO'

  return null
}

export function resolveAllocationToEnvelopes(
  allocation: AllocationLine[],
  params: {
    riskProfile: RiskProfile
    objective: string
  },
): ResolvedEnvelopeAllocation[] {
  const mapped = (allocation ?? [])
    .map((line) => {
      const envelope = mapAllocationLabelToEnvelope(line.envelope, params)
      if (!envelope) return null

      const structureType = getEnvelopeStructureType(envelope)
      const supportLabels = getEnvelopeSupportLabels(envelope)

      return {
        envelope,
        sourceLabel: line.envelope,
        displayLabel: getEnvelopeDisplayLabel(envelope),
        euroAmount: toSafeNumber(line.euroAmount),
        monthlyEuroAmount: toSafeNumber(line.monthlyEuroAmount),

        initialSecurePercent: toSafeNumber(
          line.initialSecurePercent ?? line.securePercent ?? 0,
        ),
        initialUcPercent: toSafeNumber(
          line.initialUcPercent ?? line.ucPercent ?? 0,
        ),
        monthlySecurePercent: toSafeNumber(
          line.monthlySecurePercent ?? line.securePercent ?? 0,
        ),
        monthlyUcPercent: toSafeNumber(
          line.monthlyUcPercent ?? line.ucPercent ?? 0,
        ),

        structureType,
        supportLabelPrimary: supportLabels.primary,
        supportLabelSecondary: supportLabels.secondary,
      }
    })
    .filter(Boolean) as ResolvedEnvelopeAllocation[]

  const merged = new Map<ContractEnvelope, ResolvedEnvelopeAllocation>()

  for (const item of mapped) {
    const existing = merged.get(item.envelope)

    if (!existing) {
      merged.set(item.envelope, item)
      continue
    }

    const nextInitial = existing.euroAmount + item.euroAmount
    const nextMonthly = existing.monthlyEuroAmount + item.monthlyEuroAmount

    merged.set(item.envelope, {
      envelope: item.envelope,
      sourceLabel: `${existing.sourceLabel} + ${item.sourceLabel}`,
      displayLabel: existing.displayLabel,
      euroAmount: nextInitial,
      monthlyEuroAmount: nextMonthly,

      initialSecurePercent:
        nextInitial > 0
          ? Math.round(
              ((existing.euroAmount * existing.initialSecurePercent) +
                (item.euroAmount * item.initialSecurePercent)) /
                nextInitial,
            )
          : 0,

      initialUcPercent:
        nextInitial > 0
          ? Math.round(
              ((existing.euroAmount * existing.initialUcPercent) +
                (item.euroAmount * item.initialUcPercent)) /
                nextInitial,
            )
          : 0,

      monthlySecurePercent:
        nextMonthly > 0
          ? Math.round(
              ((existing.monthlyEuroAmount * existing.monthlySecurePercent) +
                (item.monthlyEuroAmount * item.monthlySecurePercent)) /
                nextMonthly,
            )
          : 0,

      monthlyUcPercent:
        nextMonthly > 0
          ? Math.round(
              ((existing.monthlyEuroAmount * existing.monthlyUcPercent) +
                (item.monthlyEuroAmount * item.monthlyUcPercent)) /
                nextMonthly,
            )
          : 0,

      structureType: existing.structureType,
      supportLabelPrimary: existing.supportLabelPrimary,
      supportLabelSecondary: existing.supportLabelSecondary,
    })
  }

  return Array.from(merged.values())
}

export function findResolvedEnvelopeAllocation(
  resolved: ResolvedEnvelopeAllocation[],
  envelope: ContractEnvelope,
) {
  return (resolved ?? []).find((item) => item.envelope === envelope)
}

export function getResolvedSecurePercent(
  line: ResolvedEnvelopeAllocation | undefined,
  mode: 'initial' | 'monthly',
) {
  if (!line) return 0
  return mode === 'initial' ? line.initialSecurePercent : line.monthlySecurePercent
}

export function getResolvedUcPercent(
  line: ResolvedEnvelopeAllocation | undefined,
  mode: 'initial' | 'monthly',
) {
  if (!line) return 0
  return mode === 'initial' ? line.initialUcPercent : line.monthlyUcPercent
}

export function buildResolvedAllocationMixLabel(
  line: ResolvedEnvelopeAllocation | undefined,
  mode: 'initial' | 'monthly',
) {
  if (!line) return 'À définir'

  const secure = getResolvedSecurePercent(line, mode)
  const dynamic = getResolvedUcPercent(line, mode)

  if (line.structureType === 'assurance') {
    return `${line.supportLabelPrimary} ${secure}% · ${line.supportLabelSecondary} ${dynamic}%`
  }

  if (line.envelope === 'PEA') {
    return `Liquidités ${secure}% · investi ${dynamic}%`
  }

  if (line.envelope === 'CTO') {
    return `Trésorerie / défensif ${secure}% · obligations / actions ${dynamic}%`
  }

  if (line.structureType === 'real_estate') {
    return line.supportLabelPrimary
  }

  return `${line.supportLabelPrimary} / ${line.supportLabelSecondary}`
}
