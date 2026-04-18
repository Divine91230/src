import type { Dispatch, SetStateAction } from 'react'
import {
  Field,
  buttonStyle,
  formGridStyle,
  inputStyle,
  subtleButtonStyle,
} from '../components/Field'
import {
  generateId,
  getIncludedChargesTotal,
  getIncludedRevenueTotal,
  getRemainingToLive,
  getRemainingToLiveOrigin,
  getSelectedCharges,
  getSelectedChargesOrigin,
  getSelectedHouseholdIncome,
  getSelectedHouseholdIncomeOrigin,
  getSelectedSavingsCapacity,
  getSelectedSavingsCapacityOrigin,
  getSuggestedSavingsCapacity,
} from '../discovery.helpers'
import { getFieldStateLabel, getFieldStateStyle } from '../discovery.fieldStates'
import type {
  ChargeType,
  DiscoveryFormState,
  RevenueType,
} from '../discovery.types'
import { buildBudgetChecks } from '../../../modules/quality/budgetChecks'
import type { ValueOrigin } from '../discovery.helpers'

const revenueOptions: RevenueType[] = [
  'Salaire net avant IR',
  'Revenu TNS net estimé',
  'Pension / retraite nette',
  'Pension alimentaire reçue',
  'Revenus locatifs encaissés',
  'Autre revenu récurrent',
]

const chargeOptions: ChargeType[] = [
  'Loyer / mensualité RP',
  'Crédit immobilier locatif',
  'Crédit consommation',
  'Charges foyer',
  'Pension alimentaire versée',
  'Autre charge récurrente',
]

function StatusPill({ origin }: { origin: ValueOrigin }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 999,
        padding: '6px 10px',
        fontSize: 12,
        fontWeight: 700,
        ...getFieldStateStyle(origin),
      }}
    >
      {getFieldStateLabel(origin)}
    </span>
  )
}

function WarningBox({ messages }: { messages: string[] }) {
  if (messages.length === 0) return null

  return (
    <section className="card" style={{ marginTop: 16, borderColor: 'rgba(200,166,106,0.28)' }}>
      <div className="section-title">
        <h2>Points de vigilance budget</h2>
      </div>
      <ul className="list">
        {messages.map((message) => (
          <li key={message} className="list-item">
            <span>{message}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function IncomeChargesSection({
  state,
  setState,
}: {
  state: DiscoveryFormState
  setState: Dispatch<SetStateAction<DiscoveryFormState>>
}) {
  const autoIncome = getIncludedRevenueTotal(state.revenues)
  const autoCharges = getIncludedChargesTotal(state.charges)
  const selectedIncome = getSelectedHouseholdIncome(state)
  const selectedCharges = getSelectedCharges(state)
  const remaining = getRemainingToLive(state)
  const suggestedCapacity = getSuggestedSavingsCapacity(state)
  const selectedCapacity = getSelectedSavingsCapacity(state)

  const incomeOrigin = getSelectedHouseholdIncomeOrigin(state)
  const chargesOrigin = getSelectedChargesOrigin(state)
  const remainingOrigin = getRemainingToLiveOrigin(state)
  const capacityOrigin = getSelectedSavingsCapacityOrigin(state)

  const budgetMessages = buildBudgetChecks(state)
    .filter((issue) => issue.severity !== 'info')
    .map((issue) => issue.message)

  function addRevenue() {
    setState((current) => ({
      ...current,
      revenues: [
        ...current.revenues,
        {
          id: generateId('rev'),
          personId: 'household',
          label: '',
          type: 'Salaire net avant IR',
          monthlyAmount: 0,
          recurring: true,
          includedInBudget: true,
        },
      ],
    }))
  }

  function removeRevenue(id: string) {
    setState((current) => {
      if (current.revenues.length <= 1) return current
      return {
        ...current,
        revenues: current.revenues.filter((line) => line.id !== id),
      }
    })
  }

  function addCharge() {
    setState((current) => ({
      ...current,
      charges: [
        ...current.charges,
        {
          id: generateId('chg'),
          label: '',
          type: 'Charges foyer',
          monthlyAmount: 0,
          recurring: true,
          includedInBudget: true,
        },
      ],
    }))
  }

  function removeCharge(id: string) {
    setState((current) => {
      if (current.charges.length <= 1) return current
      return {
        ...current,
        charges: current.charges.filter((line) => line.id !== id),
      }
    })
  }

  return (
    <>
      <section className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Revenus foyer retenus</div>
          <div className="metric-value">{selectedIncome.toLocaleString('fr-FR')} €</div>
          <div className="metric-help" style={{ marginTop: 8 }}>
            <StatusPill origin={incomeOrigin} />
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Charges retenues</div>
          <div className="metric-value">{selectedCharges.toLocaleString('fr-FR')} €</div>
          <div className="metric-help" style={{ marginTop: 8 }}>
            <StatusPill origin={chargesOrigin} />
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Reste à vivre</div>
          <div className="metric-value">{remaining.toLocaleString('fr-FR')} €</div>
          <div className="metric-help" style={{ marginTop: 8 }}>
            <StatusPill origin={remainingOrigin} />
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Capacité d'épargne retenue</div>
          <div className="metric-value">{selectedCapacity.toLocaleString('fr-FR')} €</div>
          <div className="metric-help" style={{ marginTop: 8 }}>
            <StatusPill origin={capacityOrigin} />
          </div>
        </div>
      </section>

      <WarningBox messages={budgetMessages} />

      <section className="content-grid">
        <div className="card">
          <div className="section-title">
            <h2>Revenus du foyer</h2>
            <button type="button" style={buttonStyle} onClick={addRevenue}>
              Ajouter un revenu
            </button>
          </div>

          <p>
            Les revenus sont à saisir idéalement en <strong>net mensuel avant impôt sur le revenu</strong>.
            Tu peux ensuite ajuster la valeur retenue manuellement si nécessaire.
          </p>

          <ul className="list">
            {state.revenues.map((line) => (
              <li key={line.id} className="list-item" style={{ display: 'block' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 12,
                  }}
                >
                  <strong>{line.label || 'Revenu'}</strong>
                  <button
                    type="button"
                    style={subtleButtonStyle}
                    onClick={() => removeRevenue(line.id)}
                    disabled={state.revenues.length <= 1}
                  >
                    Supprimer
                  </button>
                </div>

                <div style={formGridStyle}>
                  <Field label="Libellé">
                    <input
                      value={line.label}
                      onChange={(e) =>
                        setState((current) => ({
                          ...current,
                          revenues: current.revenues.map((r) =>
                            r.id === line.id ? { ...r, label: e.target.value } : r,
                          ),
                        }))
                      }
                      style={inputStyle}
                    />
                  </Field>

                  <Field label="Type">
                    <select
                      value={line.type}
                      onChange={(e) =>
                        setState((current) => ({
                          ...current,
                          revenues: current.revenues.map((r) =>
                            r.id === line.id ? { ...r, type: e.target.value as RevenueType } : r,
                          ),
                        }))
                      }
                      style={inputStyle}
                    >
                      {revenueOptions.map((opt) => (
                        <option key={opt}>{opt}</option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Montant mensuel">
                    <input
                      type="number"
                      value={line.monthlyAmount}
                      onChange={(e) =>
                        setState((current) => ({
                          ...current,
                          revenues: current.revenues.map((r) =>
                            r.id === line.id ? { ...r, monthlyAmount: Number(e.target.value) || 0 } : r,
                          ),
                        }))
                      }
                      style={inputStyle}
                    />
                  </Field>

                  <Field label="Retenu dans le budget ?">
                    <select
                      value={line.includedInBudget ? 'Oui' : 'Non'}
                      onChange={(e) =>
                        setState((current) => ({
                          ...current,
                          revenues: current.revenues.map((r) =>
                            r.id === line.id
                              ? { ...r, includedInBudget: e.target.value === 'Oui' }
                              : r,
                          ),
                        }))
                      }
                      style={inputStyle}
                    >
                      <option>Oui</option>
                      <option>Non</option>
                    </select>
                  </Field>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          <div className="section-title">
            <h2>Charges du foyer</h2>
            <button type="button" style={buttonStyle} onClick={addCharge}>
              Ajouter une charge
            </button>
          </div>

          <ul className="list">
            {state.charges.map((line) => (
              <li key={line.id} className="list-item" style={{ display: 'block' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 12,
                  }}
                >
                  <strong>{line.label || 'Charge'}</strong>
                  <button
                    type="button"
                    style={subtleButtonStyle}
                    onClick={() => removeCharge(line.id)}
                    disabled={state.charges.length <= 1}
                  >
                    Supprimer
                  </button>
                </div>

                <div style={formGridStyle}>
                  <Field label="Libellé">
                    <input
                      value={line.label}
                      onChange={(e) =>
                        setState((current) => ({
                          ...current,
                          charges: current.charges.map((c) =>
                            c.id === line.id ? { ...c, label: e.target.value } : c,
                          ),
                        }))
                      }
                      style={inputStyle}
                    />
                  </Field>

                  <Field label="Type">
                    <select
                      value={line.type}
                      onChange={(e) =>
                        setState((current) => ({
                          ...current,
                          charges: current.charges.map((c) =>
                            c.id === line.id ? { ...c, type: e.target.value as ChargeType } : c,
                          ),
                        }))
                      }
                      style={inputStyle}
                    >
                      {chargeOptions.map((opt) => (
                        <option key={opt}>{opt}</option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Montant mensuel">
                    <input
                      type="number"
                      value={line.monthlyAmount}
                      onChange={(e) =>
                        setState((current) => ({
                          ...current,
                          charges: current.charges.map((c) =>
                            c.id === line.id ? { ...c, monthlyAmount: Number(e.target.value) || 0 } : c,
                          ),
                        }))
                      }
                      style={inputStyle}
                    />
                  </Field>

                  <Field label="Retenue dans le budget ?">
                    <select
                      value={line.includedInBudget ? 'Oui' : 'Non'}
                      onChange={(e) =>
                        setState((current) => ({
                          ...current,
                          charges: current.charges.map((c) =>
                            c.id === line.id
                              ? { ...c, includedInBudget: e.target.value === 'Oui' }
                              : c,
                          ),
                        }))
                      }
                      style={inputStyle}
                    >
                      <option>Oui</option>
                      <option>Non</option>
                    </select>
                  </Field>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <div className="section-title">
          <h2>Ajustements manuels</h2>
        </div>

        <div style={formGridStyle}>
          <Field label={`Revenus du foyer (${autoIncome.toLocaleString('fr-FR')} € auto)`}>
            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 8 }}>
              <select
                value={state.budgetOverrides.householdIncomeMode}
                onChange={(e) =>
                  setState((current) => ({
                    ...current,
                    budgetOverrides: {
                      ...current.budgetOverrides,
                      householdIncomeMode: e.target.value as 'auto' | 'manual',
                    },
                  }))
                }
                style={inputStyle}
              >
                <option value="auto">Automatique</option>
                <option value="manual">Manuel</option>
              </select>

              <input
                type="number"
                value={state.budgetOverrides.householdIncomeManual}
                onChange={(e) =>
                  setState((current) => ({
                    ...current,
                    budgetOverrides: {
                      ...current.budgetOverrides,
                      householdIncomeManual: Number(e.target.value) || '',
                    },
                  }))
                }
                style={inputStyle}
                disabled={state.budgetOverrides.householdIncomeMode === 'auto'}
                placeholder="Saisir un revenu retenu"
              />
            </div>
          </Field>

          <Field label={`Charges retenues (${autoCharges.toLocaleString('fr-FR')} € auto)`}>
            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 8 }}>
              <select
                value={state.budgetOverrides.chargesMode}
                onChange={(e) =>
                  setState((current) => ({
                    ...current,
                    budgetOverrides: {
                      ...current.budgetOverrides,
                      chargesMode: e.target.value as 'auto' | 'manual',
                    },
                  }))
                }
                style={inputStyle}
              >
                <option value="auto">Automatique</option>
                <option value="manual">Manuel</option>
              </select>

              <input
                type="number"
                value={state.budgetOverrides.chargesManual}
                onChange={(e) =>
                  setState((current) => ({
                    ...current,
                    budgetOverrides: {
                      ...current.budgetOverrides,
                      chargesManual: Number(e.target.value) || '',
                    },
                  }))
                }
                style={inputStyle}
                disabled={state.budgetOverrides.chargesMode === 'auto'}
                placeholder="Saisir les charges retenues"
              />
            </div>
          </Field>

          <Field label={`Capacité d'épargne (${suggestedCapacity.toLocaleString('fr-FR')} € suggérée)`}>
            <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 8 }}>
              <select
                value={state.budgetOverrides.capacityMode}
                onChange={(e) =>
                  setState((current) => ({
                    ...current,
                    budgetOverrides: {
                      ...current.budgetOverrides,
                      capacityMode: e.target.value as 'auto' | 'manual',
                    },
                  }))
                }
                style={inputStyle}
              >
                <option value="auto">Automatique</option>
                <option value="manual">Manuel</option>
              </select>

              <input
                type="number"
                value={state.budgetOverrides.capacityManual}
                onChange={(e) =>
                  setState((current) => ({
                    ...current,
                    budgetOverrides: {
                      ...current.budgetOverrides,
                      capacityManual: Number(e.target.value) || '',
                    },
                  }))
                }
                style={inputStyle}
                disabled={state.budgetOverrides.capacityMode === 'auto'}
                placeholder="Saisir la capacité retenue"
              />
            </div>
          </Field>
        </div>
      </section>
    </>
  )
}
