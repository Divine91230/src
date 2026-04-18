import type { Dispatch, SetStateAction } from 'react'
import { Field, areaStyle, formGridStyle, inputStyle } from '../components/Field'
import type { DiscoveryFormState } from '../discovery.types'

export function DocumentsNotesSection({ state, setState }: { state: DiscoveryFormState; setState: Dispatch<SetStateAction<DiscoveryFormState>> }) {
  function update<K extends keyof DiscoveryFormState['documents']>(key: K, value: DiscoveryFormState['documents'][K]) {
    setState((current) => ({ ...current, documents: { ...current.documents, [key]: value } }))
  }
  return (
    <section className="content-grid">
      <div className="card">
        <div className="section-title"><h2>Documents reçus</h2></div>
        <div style={formGridStyle}>
          <Field label="Pièce d'identité reçue ?"><select value={state.documents.idDocumentReceived ? 'Oui' : 'Non'} onChange={(e) => update('idDocumentReceived', e.target.value === 'Oui')} style={inputStyle}><option>Oui</option><option>Non</option></select></Field>
          <Field label="Avis d'imposition reçu ?"><select value={state.documents.taxNoticeReceived ? 'Oui' : 'Non'} onChange={(e) => update('taxNoticeReceived', e.target.value === 'Oui')} style={inputStyle}><option>Oui</option><option>Non</option></select></Field>
          <Field label="Bulletins / justificatifs revenus reçus ?"><select value={state.documents.paySlipsReceived ? 'Oui' : 'Non'} onChange={(e) => update('paySlipsReceived', e.target.value === 'Oui')} style={inputStyle}><option>Oui</option><option>Non</option></select></Field>
          <Field label="Relevés bancaires reçus ?"><select value={state.documents.bankStatementsReceived ? 'Oui' : 'Non'} onChange={(e) => update('bankStatementsReceived', e.target.value === 'Oui')} style={inputStyle}><option>Oui</option><option>Non</option></select></Field>
          <Field label="Contrats / placements reçus ?"><select value={state.documents.contractsReceived ? 'Oui' : 'Non'} onChange={(e) => update('contractsReceived', e.target.value === 'Oui')} style={inputStyle}><option>Oui</option><option>Non</option></select></Field>
        </div>
      </div>
      <div className="card">
        <div className="section-title"><h2>Notes conseiller</h2></div>
        <Field label="Pièces manquantes"><textarea value={state.documents.missingDocuments} onChange={(e) => update('missingDocuments', e.target.value)} style={areaStyle} /></Field>
        <div style={{ marginTop: 12 }}><Field label="Commentaires / points d'attention"><textarea value={state.documents.advisorNotes} onChange={(e) => update('advisorNotes', e.target.value)} style={areaStyle} /></Field></div>
      </div>
    </section>
  )
}
