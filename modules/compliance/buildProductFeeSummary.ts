export type ProductFeeSummary = {
  title: string
  entryFees: string
  annualFees: string
  transactionFees: string
  notes: string
}

export function buildProductFeeSummary(input: {
  contractName: string
  envelope: string
}) : ProductFeeSummary {
  const envelope = String(input.envelope || '').toLowerCase()

  if (envelope.includes('assurance')) {
    return {
      title: input.contractName,
      entryFees: 'Selon contrat / à confirmer',
      annualFees: 'Frais de gestion fonds euros + UC à préciser',
      transactionFees: 'Arbitrages selon conditions du contrat',
      notes: 'Les frais exacts doivent être confirmés avant mise en œuvre et remis au client.',
    }
  }

  if (envelope.includes('per')) {
    return {
      title: input.contractName,
      entryFees: 'Selon contrat / à confirmer',
      annualFees: 'Frais annuels PER à préciser',
      transactionFees: 'Arbitrages selon conditions du contrat',
      notes: 'La lecture des frais doit être faite en lien avec l’intérêt fiscal et la durée de blocage.',
    }
  }

  return {
    title: input.contractName,
    entryFees: 'À confirmer',
    annualFees: 'À confirmer',
    transactionFees: 'À confirmer',
    notes: 'Les frais doivent être détaillés au client avant validation finale.',
  }
}
