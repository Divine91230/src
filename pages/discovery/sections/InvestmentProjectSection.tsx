import type { CSSProperties } from 'react'
import { getSelectedSavingsCapacity } from '../discovery.helpers'

type EnvelopeUsage = {
  id: string
  envelopeName: string
  selected: boolean
  useMode: 'full' | 'partial'
  amountUsed: number
}

type InvestmentProject = {
  investingMode: 'alone' | 'couple'
  fundingMode: 'capacity_only' | 'existing_only' | 'mixed'
  savingsUseMode: 'full' | 'partial'
  monthlySavingsAmount: number
  existingEnvelopesUseMode: 'full' | 'partial'
  existingEnvelopeUsages: EnvelopeUsage[]
  hasInitialLumpSum: boolean
  initialLumpSumAmount: number
  hasMonthlyContribution: boolean
  monthlyContributionAmount: number

  projectGoal: string
  projectSecondaryGoal: string
  liquidityNeed: 'high' | 'medium' | 'low'
  flexibilityNeed: 'high' | 'medium' | 'low'
  illiquidityTolerance: 'low' | 'medium' | 'high'
  fundingPreference: 'initial_priority' | 'monthly_priority' | 'balanced'
  targetAvailabilityHorizon: number
  monthlyEffortMin: number
  monthlyEffortTarget: number
  monthlyEffortMax: number
  wantsNewEnvelopes: boolean
  mayNeedFundsBeforeHorizon: boolean
  notes: string
}

export function InvestmentProjectSection({
  state,
  setState,
}: {
  state: any
  setState: React.Dispatch<React.SetStateAction<any>>
}) {
  const project: InvestmentProject = state.investmentProject ?? {
    investingMode: 'alone',
    fundingMode: 'capacity_only',
    savingsUseMode: 'full',
    monthlySavingsAmount: 0,
    existingEnvelopesUseMode: 'partial',
    existingEnvelopeUsages: [],
    hasInitialLumpSum: false,
    initialLumpSumAmount: 0,
    hasMonthlyContribution: true,
    monthlyContributionAmount: 0,
    projectGoal: '',
    projectSecondaryGoal: '',
    liquidityNeed: 'medium',
    flexibilityNeed: 'medium',
    illiquidityTolerance: 'medium',
    fundingPreference: 'balanced',
    targetAvailabilityHorizon: 8,
    monthlyEffortMin: 0,
    monthlyEffortTarget: 0,
    monthlyEffortMax: 0,
    wantsNewEnvelopes: true,
    mayNeedFundsBeforeHorizon: false,
    notes: '',
  }

  const selectedHouseholdIncome =
  state?.budgetOverrides?.householdIncomeMode === 'manual'
    ? Number(state?.budgetOverrides?.householdIncomeManual || 0)
    : Array.isArray(state?.revenues)
      ? state.revenues
          .filter((line: any) => line.includedInBudget)
          .reduce((sum: number, line: any) => sum + Number(line.monthlyAmount || 0), 0)
      : 0

const selectedCharges =
  state?.budgetOverrides?.chargesMode === 'manual'
    ? Number(state?.budgetOverrides?.chargesManual || 0)
    : Array.isArray(state?.charges)
      ? state.charges
          .filter((line: any) => line.includedInBudget)
          .reduce((sum: number, line: any) => sum + Number(line.monthlyAmount || 0), 0)
      : 0

const remainingToLive = selectedHouseholdIncome - selectedCharges

const suggestedSavingsCapacity = Math.max(
  0,
  Math.round(remainingToLive * 0.65),
)

const selectedSavingsCapacity =
  state?.budgetOverrides?.capacityMode === 'manual'
    ? Number(state?.budgetOverrides?.capacityManual || 0)
    : suggestedSavingsCapacity

  const existingEnvelopeOptions = Array.isArray(state?.assets)
    ? state.assets.map((asset: any, index: number) => ({
        id: asset.id ?? `${index}`,
        envelopeName:
          asset.name ||
          asset.label ||
          asset.envelopeType ||
          asset.category ||
          `Enveloppe ${index + 1}`,
        amount: Number(asset.amount || 0),
      }))
    : []

  function patchProject(patch: Partial<InvestmentProject>) {
    setState((current: any) => ({
      ...current,
      investmentProject: {
        ...(current.investmentProject ?? project),
        ...patch,
      },
    }))
  }

  function syncEnvelopeUsages() {
    const currentUsages = Array.isArray(project.existingEnvelopeUsages)
      ? project.existingEnvelopeUsages
      : []

    const nextUsages = existingEnvelopeOptions.map((item: { id: string; envelopeName: string; amount: number }) => {
      const existing = currentUsages.find((usage) => usage.id === item.id)
      return (
        existing ?? {
          id: item.id,
          envelopeName: item.envelopeName,
          selected: false,
          useMode: 'partial',
          amountUsed: 0,
        }
      )
    })

    patchProject({ existingEnvelopeUsages: nextUsages })
  }

  function updateEnvelopeUsage(id: string, patch: Partial<EnvelopeUsage>) {
    const next = (project.existingEnvelopeUsages ?? []).map((usage) =>
      usage.id === id ? { ...usage, ...patch } : usage,
    )
    patchProject({ existingEnvelopeUsages: next })
  }

  const totalEnvelopeMobilized = (project.existingEnvelopeUsages ?? [])
    .filter((item) => item.selected)
    .reduce((sum, item) => sum + Number(item.amountUsed || 0), 0)

  const monthlyFunding =
    project.fundingMode === 'capacity_only'
      ? project.savingsUseMode === 'full'
        ? selectedSavingsCapacity
        : Number(project.monthlySavingsAmount || 0)
      : project.fundingMode === 'mixed' && project.hasMonthlyContribution
        ? Number(project.monthlyContributionAmount || 0)
        : project.hasMonthlyContribution
          ? Number(project.monthlyContributionAmount || 0)
          : 0

  return (
    <>
      <section className="content-grid">
        <div className="card">
          <div className="section-title">
            <h2>Cadre de mise en place</h2>
          </div>

          <div style={formGridStyle}>
            <Field label="Investissement">
              <select
                value={project.investingMode}
                onChange={(e) =>
                  patchProject({
                    investingMode: e.target.value as 'alone' | 'couple',
                  })
                }
                style={inputStyle}
              >
                <option value="alone">Seul</option>
                <option value="couple">En couple</option>
              </select>
            </Field>

            <Field label="Mode de financement">
              <select
                value={project.fundingMode}
                onChange={(e) =>
                  patchProject({
                    fundingMode: e.target.value as
                      | 'capacity_only'
                      | 'existing_only'
                      | 'mixed',
                  })
                }
                style={inputStyle}
              >
                <option value="capacity_only">Capacité d’épargne</option>
                <option value="existing_only">Enveloppes existantes</option>
                <option value="mixed">Mix des deux</option>
              </select>
            </Field>

            <Field label="Préférence de financement">
              <select
                value={project.fundingPreference}
                onChange={(e) =>
                  patchProject({
                    fundingPreference: e.target.value as
                      | 'initial_priority'
                      | 'monthly_priority'
                      | 'balanced',
                  })
                }
                style={inputStyle}
              >
                <option value="initial_priority">Priorité au versement initial</option>
                <option value="monthly_priority">Priorité au mensuel</option>
                <option value="balanced">Équilibre entre les deux</option>
              </select>
            </Field>

            <Field label="Horizon cible de disponibilité (années)">
              <input
                type="number"
                value={project.targetAvailabilityHorizon}
                onChange={(e) =>
                  patchProject({
                    targetAvailabilityHorizon: Number(e.target.value),
                  })
                }
                style={inputStyle}
              />
            </Field>
          </div>
        </div>

        <div className="card">
          <div className="section-title">
            <h2>Lecture retenue</h2>
          </div>

          <ul className="list">
            <li className="list-item">
              <span>Capacité d’épargne calculée</span>
              <span className="pill">
                {selectedSavingsCapacity.toLocaleString('fr-FR')} €/mois
              </span>
            </li>
            <li className="list-item">
              <span>Montant initial retenu</span>
              <span className="pill">
                {Number(project.initialLumpSumAmount || 0).toLocaleString('fr-FR')} €
              </span>
            </li>
            <li className="list-item">
              <span>Mensuel retenu</span>
              <span className="pill">
                {monthlyFunding.toLocaleString('fr-FR')} €/mois
              </span>
            </li>
            <li className="list-item">
              <span>Enveloppes existantes mobilisées</span>
              <span className="pill">
                {totalEnvelopeMobilized.toLocaleString('fr-FR')} €
              </span>
            </li>
          </ul>
        </div>
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <div className="section-title">
          <h2>Finalité du projet</h2>
        </div>

        <div style={formGridStyle}>
          <Field label="Objectif principal du projet">
            <select
              value={project.projectGoal}
              onChange={(e) =>
                patchProject({
                  projectGoal: e.target.value,
                })
              }
              style={inputStyle}
            >
              <option value="">Sélectionner</option>
              <option value="Préparer la retraite">Préparer la retraite</option>
              <option value="Diversifier le patrimoine">Diversifier le patrimoine</option>
              <option value="Optimiser la fiscalité">Optimiser la fiscalité</option>
              <option value="Générer des revenus complémentaires">Générer des revenus complémentaires</option>
              <option value="Valoriser le capital">Valoriser le capital</option>
              <option value="Transmettre">Transmettre</option>
            </select>
          </Field>

          <Field label="Objectif secondaire du projet">
            <select
              value={project.projectSecondaryGoal}
              onChange={(e) =>
                patchProject({
                  projectSecondaryGoal: e.target.value,
                })
              }
              style={inputStyle}
            >
              <option value="">Aucun / non précisé</option>
              <option value="Préparer la retraite">Préparer la retraite</option>
              <option value="Diversifier le patrimoine">Diversifier le patrimoine</option>
              <option value="Optimiser la fiscalité">Optimiser la fiscalité</option>
              <option value="Générer des revenus complémentaires">Générer des revenus complémentaires</option>
              <option value="Valoriser le capital">Valoriser le capital</option>
              <option value="Transmettre">Transmettre</option>
            </select>
          </Field>

          <Field label="Besoin de liquidité">
            <select
              value={project.liquidityNeed}
              onChange={(e) =>
                patchProject({
                  liquidityNeed: e.target.value as 'high' | 'medium' | 'low',
                })
              }
              style={inputStyle}
            >
              <option value="high">Élevé</option>
              <option value="medium">Modéré</option>
              <option value="low">Faible</option>
            </select>
          </Field>

          <Field label="Besoin de souplesse">
            <select
              value={project.flexibilityNeed}
              onChange={(e) =>
                patchProject({
                  flexibilityNeed: e.target.value as 'high' | 'medium' | 'low',
                })
              }
              style={inputStyle}
            >
              <option value="high">Élevé</option>
              <option value="medium">Modéré</option>
              <option value="low">Faible</option>
            </select>
          </Field>

          <Field label="Tolérance à l’illiquidité">
            <select
              value={project.illiquidityTolerance}
              onChange={(e) =>
                patchProject({
                  illiquidityTolerance: e.target.value as 'low' | 'medium' | 'high',
                })
              }
              style={inputStyle}
            >
              <option value="low">Faible</option>
              <option value="medium">Modérée</option>
              <option value="high">Élevée</option>
            </select>
          </Field>

          <Field label="Ouverture à de nouvelles enveloppes">
            <select
              value={project.wantsNewEnvelopes ? 'oui' : 'non'}
              onChange={(e) =>
                patchProject({
                  wantsNewEnvelopes: e.target.value === 'oui',
                })
              }
              style={inputStyle}
            >
              <option value="oui">Oui</option>
              <option value="non">Non</option>
            </select>
          </Field>

          <Field label="Des fonds pourraient-ils être nécessaires avant l’horizon ?">
            <select
              value={project.mayNeedFundsBeforeHorizon ? 'oui' : 'non'}
              onChange={(e) =>
                patchProject({
                  mayNeedFundsBeforeHorizon: e.target.value === 'oui',
                })
              }
              style={inputStyle}
            >
              <option value="non">Non</option>
              <option value="oui">Oui</option>
            </select>
          </Field>
        </div>
      </section>

      {(project.fundingMode === 'capacity_only' || project.fundingMode === 'mixed') && (
        <section className="card" style={{ marginTop: 16 }}>
          <div className="section-title">
            <h2>Utilisation de la capacité d’épargne</h2>
          </div>

          <div style={formGridStyle}>
            <Field label="Utiliser">
              <select
                value={project.savingsUseMode}
                onChange={(e) =>
                  patchProject({
                    savingsUseMode: e.target.value as 'full' | 'partial',
                  })
                }
                style={inputStyle}
              >
                <option value="full">La totalité</option>
                <option value="partial">Une partie</option>
              </select>
            </Field>

            <Field label="Montant mensuel retenu">
              <input
                type="number"
                value={
                  project.savingsUseMode === 'full'
                    ? selectedSavingsCapacity
                    : project.monthlySavingsAmount
                }
                onChange={(e) =>
                  patchProject({
                    monthlySavingsAmount: Number(e.target.value),
                  })
                }
                style={inputStyle}
                disabled={project.savingsUseMode === 'full'}
              />
            </Field>

            <Field label="Effort minimum acceptable">
              <input
                type="number"
                value={project.monthlyEffortMin}
                onChange={(e) =>
                  patchProject({
                    monthlyEffortMin: Number(e.target.value),
                  })
                }
                style={inputStyle}
              />
            </Field>

            <Field label="Effort cible">
              <input
                type="number"
                value={project.monthlyEffortTarget}
                onChange={(e) =>
                  patchProject({
                    monthlyEffortTarget: Number(e.target.value),
                  })
                }
                style={inputStyle}
              />
            </Field>

            <Field label="Effort maximum acceptable">
              <input
                type="number"
                value={project.monthlyEffortMax}
                onChange={(e) =>
                  patchProject({
                    monthlyEffortMax: Number(e.target.value),
                  })
                }
                style={inputStyle}
              />
            </Field>
          </div>
        </section>
      )}

      {(project.fundingMode === 'existing_only' || project.fundingMode === 'mixed') && (
        <section className="card" style={{ marginTop: 16 }}>
          <div className="section-title">
            <h2>Utilisation des enveloppes existantes</h2>
            <button type="button" style={secondaryButtonStyle} onClick={syncEnvelopeUsages}>
              Actualiser depuis les actifs
            </button>
          </div>

          <div style={{ marginBottom: 16 }}>
            <Field label="Mode d’utilisation">
              <select
                value={project.existingEnvelopesUseMode}
                onChange={(e) =>
                  patchProject({
                    existingEnvelopesUseMode: e.target.value as 'full' | 'partial',
                  })
                }
                style={inputStyle}
              >
                <option value="full">Utiliser la totalité</option>
                <option value="partial">Utiliser une partie</option>
              </select>
            </Field>
          </div>

          {(project.existingEnvelopeUsages ?? []).length === 0 ? (
            <p>Aucune enveloppe synchronisée pour le moment. Clique sur “Actualiser depuis les actifs”.</p>
          ) : (
            <div className="table-card">
              <table>
                <thead>
                  <tr>
                    <th>Enveloppe</th>
                    <th>Sélection</th>
                    <th>Mode</th>
                    <th>Montant mobilisé</th>
                  </tr>
                </thead>
                <tbody>
                  {(project.existingEnvelopeUsages ?? []).map((usage) => (
                    <tr key={usage.id}>
                      <td>{usage.envelopeName}</td>
                      <td>
                        <input
                          type="checkbox"
                          checked={usage.selected}
                          onChange={(e) =>
                            updateEnvelopeUsage(usage.id, {
                              selected: e.target.checked,
                            })
                          }
                        />
                      </td>
                      <td>
                        <select
                          value={usage.useMode}
                          onChange={(e) =>
                            updateEnvelopeUsage(usage.id, {
                              useMode: e.target.value as 'full' | 'partial',
                            })
                          }
                          style={miniInputStyle}
                        >
                          <option value="full">Totale</option>
                          <option value="partial">Partielle</option>
                        </select>
                      </td>
                      <td>
                        <input
                          type="number"
                          value={usage.amountUsed}
                          onChange={(e) =>
                            updateEnvelopeUsage(usage.id, {
                              amountUsed: Number(e.target.value),
                            })
                          }
                          style={miniInputStyle}
                          disabled={!usage.selected || usage.useMode === 'full'}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <section className="card" style={{ marginTop: 16 }}>
        <div className="section-title">
          <h2>Rythme de mise en place</h2>
        </div>

        <div style={formGridStyle}>
          <Field label="Versement initial unique">
            <select
              value={project.hasInitialLumpSum ? 'oui' : 'non'}
              onChange={(e) =>
                patchProject({
                  hasInitialLumpSum: e.target.value === 'oui',
                })
              }
              style={inputStyle}
            >
              <option value="oui">Oui</option>
              <option value="non">Non</option>
            </select>
          </Field>

          <Field label="Montant initial">
            <input
              type="number"
              value={project.initialLumpSumAmount}
              onChange={(e) =>
                patchProject({
                  initialLumpSumAmount: Number(e.target.value),
                })
              }
              style={inputStyle}
              disabled={!project.hasInitialLumpSum}
            />
          </Field>

          <Field label="Versements programmés mensuels">
            <select
              value={project.hasMonthlyContribution ? 'oui' : 'non'}
              onChange={(e) =>
                patchProject({
                  hasMonthlyContribution: e.target.value === 'oui',
                })
              }
              style={inputStyle}
            >
              <option value="oui">Oui</option>
              <option value="non">Non</option>
            </select>
          </Field>

          <Field label="Montant mensuel programmé">
            <input
              type="number"
              value={project.monthlyContributionAmount}
              onChange={(e) =>
                patchProject({
                  monthlyContributionAmount: Number(e.target.value),
                })
              }
              style={inputStyle}
              disabled={!project.hasMonthlyContribution}
            />
          </Field>
        </div>
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <div className="section-title">
          <h2>Commentaire projet</h2>
        </div>

        <Field label="Notes conseiller / attentes client">
          <textarea
            value={project.notes}
            onChange={(e) =>
              patchProject({
                notes: e.target.value,
              })
            }
            style={textareaStyle}
            rows={5}
          />
        </Field>
      </section>
    </>
  )
}

function Field({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="metric-label" style={{ marginBottom: 8 }}>
        {label}
      </div>
      {children}
    </div>
  )
}

const formGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 14,
}

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 14,
  border: '1px solid rgba(127,114,95,0.22)',
  background: 'rgba(255,255,255,0.82)',
  color: 'inherit',
  outline: 'none',
}

const miniInputStyle: CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  borderRadius: 10,
  border: '1px solid rgba(127,114,95,0.22)',
  background: 'rgba(255,255,255,0.82)',
  color: 'inherit',
  outline: 'none',
}

const textareaStyle: CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 14,
  border: '1px solid rgba(127,114,95,0.22)',
  background: 'rgba(255,255,255,0.82)',
  color: 'inherit',
  outline: 'none',
  resize: 'vertical',
}

const secondaryButtonStyle: CSSProperties = {
  padding: '10px 14px',
  borderRadius: 12,
  border: '1px solid rgba(127,114,95,0.18)',
  background: 'rgba(255,255,255,0.72)',
  color: 'inherit',
  cursor: 'pointer',
}
