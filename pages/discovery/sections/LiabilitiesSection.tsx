import type { Dispatch, SetStateAction } from 'react'
import { Field, buttonStyle, formGridStyle, inputStyle, subtleButtonStyle } from '../components/Field'
import { generateId, getTotalLiabilitiesCapital } from '../discovery.helpers'
import type { DebtType, DiscoveryFormState } from '../discovery.types'

const debtOptions: DebtType[] = ['Crédit résidence principale', 'Crédit locatif', 'Crédit consommation', 'Dette privée', 'Autre']

export function LiabilitiesSection({ state, setState }: { state: DiscoveryFormState; setState: Dispatch<SetStateAction<DiscoveryFormState>> }) {
  function addDebt() {
    setState((current) => ({ ...current, liabilities: [...current.liabilities, { id: generateId('deb'), label: '', debtType: 'Autre', monthlyPayment: 0, outstandingCapital: 0, holderPersonId: 'household', comment: '' }] }))
  }

  function removeDebt(id: string) {
    setState((current) => ({
      ...current,
      liabilities: current.liabilities.filter((line) => line.id !== id),
    }))
  }

  return (
    <>
      <section className="metrics-grid">
        <div className="metric-card"><div className="metric-label">Capital restant dû</div><div className="metric-value">{getTotalLiabilitiesCapital(state).toLocaleString('fr-FR')} €</div><div className="metric-help">Passif financier du foyer</div></div>
      </section>
      <section className="card">
        <div className="section-title"><h2>Passif</h2><button type="button" style={buttonStyle} onClick={addDebt}>Ajouter une dette</button></div>
        <ul className="list">
          {state.liabilities.map((line, index) => (
            <li key={line.id} className="list-item" style={{ display: 'block' }}>
              <div className="section-title" style={{ marginBottom: 10 }}>
                <h3 style={{ margin: 0, fontSize: 16 }}>Dette {index + 1}</h3>
                <button type="button" style={subtleButtonStyle} onClick={() => removeDebt(line.id)}>Supprimer</button>
              </div>
              <div style={formGridStyle}>
                <Field label="Libellé"><input value={line.label} onChange={(e) => setState((current) => ({ ...current, liabilities: current.liabilities.map((d) => d.id === line.id ? { ...d, label: e.target.value } : d) }))} style={inputStyle} /></Field>
                <Field label="Type"><select value={line.debtType} onChange={(e) => setState((current) => ({ ...current, liabilities: current.liabilities.map((d) => d.id === line.id ? { ...d, debtType: e.target.value as DebtType } : d) }))} style={inputStyle}>{debtOptions.map((opt) => <option key={opt}>{opt}</option>)}</select></Field>
                <Field label="Mensualité"><input type="number" value={line.monthlyPayment} onChange={(e) => setState((current) => ({ ...current, liabilities: current.liabilities.map((d) => d.id === line.id ? { ...d, monthlyPayment: Number(e.target.value) } : d) }))} style={inputStyle} /></Field>
                <Field label="Capital restant dû"><input type="number" value={line.outstandingCapital} onChange={(e) => setState((current) => ({ ...current, liabilities: current.liabilities.map((d) => d.id === line.id ? { ...d, outstandingCapital: Number(e.target.value) } : d) }))} style={inputStyle} /></Field>
                <Field label="Commentaire"><input value={line.comment} onChange={(e) => setState((current) => ({ ...current, liabilities: current.liabilities.map((d) => d.id === line.id ? { ...d, comment: e.target.value } : d) }))} style={inputStyle} /></Field>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
