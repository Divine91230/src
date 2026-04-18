export type FreshnessCheck = {
  label: string
  level: 'ok' | 'attention' | 'warning'
}

function daysBetween(dateString: string) {
  const value = new Date(dateString).getTime()
  if (!Number.isFinite(value)) return null
  const now = Date.now()
  return Math.floor((now - value) / (1000 * 60 * 60 * 24))
}

export function buildClientFreshnessChecks(args: {
  selectedClient: any | null
  discovery: any | null
}) {
  const updatedAt =
    args.discovery?.updatedAt ||
    args.discovery?.lastUpdatedAt ||
    args.discovery?.meta?.updatedAt ||
    args.selectedClient?.updatedAt ||
    args.selectedClient?.lastUpdatedAt ||
    null

  const checks: FreshnessCheck[] = []

  if (!updatedAt) {
    checks.push({
      label: 'Date de dernière mise à jour du dossier introuvable',
      level: 'attention',
    })
    return checks
  }

  const ageInDays = daysBetween(updatedAt)

  if (ageInDays === null) {
    checks.push({
      label: 'Date de mise à jour non exploitable',
      level: 'attention',
    })
    return checks
  }

  if (ageInDays <= 60) {
    checks.push({
      label: `Dossier mis à jour récemment (${ageInDays} jours)`,
      level: 'ok',
    })
  } else if (ageInDays <= 180) {
    checks.push({
      label: `Dossier à réactualiser bientôt (${ageInDays} jours depuis la dernière mise à jour)`,
      level: 'attention',
    })
  } else {
    checks.push({
      label: `Dossier ancien : ${ageInDays} jours depuis la dernière mise à jour`,
      level: 'warning',
    })
  }

  return checks
}
