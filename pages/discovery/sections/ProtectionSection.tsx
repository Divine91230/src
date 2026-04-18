import type { Dispatch, SetStateAction } from 'react'
import { Field, areaStyle, formGridStyle, inputStyle } from '../components/Field'
import type { DiscoveryFormState } from '../discovery.types'

export function ProtectionSection({ state, setState }: { state: DiscoveryFormState; setState: Dispatch<SetStateAction<DiscoveryFormState>> }) {
  function update<K extends keyof DiscoveryFormState['protection']>(key: K, value: DiscoveryFormState['protection'][K]) {
    setState((current) => ({ ...current, protection: { ...current.protection, [key]: value } }))
  }
  return (
    <section className="card">
      <div className="section-title"><h2>Protection et prévoyance</h2></div>
      <div style={formGridStyle}>
        <Field label="Couverture décès ?"><select value={state.protection.deathCoverage ? 'Oui' : 'Non'} onChange={(e) => update('deathCoverage', e.target.value === 'Oui')} style={inputStyle}><option>Oui</option><option>Non</option></select></Field>
        <Field label="Couverture invalidité ?"><select value={state.protection.disabilityCoverage ? 'Oui' : 'Non'} onChange={(e) => update('disabilityCoverage', e.target.value === 'Oui')} style={inputStyle}><option>Oui</option><option>Non</option></select></Field>
        <Field label="Assurance emprunteur ?"><select value={state.protection.borrowerInsurance ? 'Oui' : 'Non'} onChange={(e) => update('borrowerInsurance', e.target.value === 'Oui')} style={inputStyle}><option>Oui</option><option>Non</option></select></Field>
        <Field label="Conjoint protégé ?"><select value={state.protection.spouseProtected ? 'Oui' : 'Non'} onChange={(e) => update('spouseProtected', e.target.value === 'Oui')} style={inputStyle}><option>Oui</option><option>Non</option></select></Field>
        <Field label="Enfants / personnes à charge protégés ?"><select value={state.protection.dependantsProtected ? 'Oui' : 'Non'} onChange={(e) => update('dependantsProtected', e.target.value === 'Oui')} style={inputStyle}><option>Oui</option><option>Non</option></select></Field>
      </div>
      <div style={{ marginTop: 12 }}><Field label="Points de vulnérabilité"><textarea value={state.protection.vulnerablePoints} onChange={(e) => update('vulnerablePoints', e.target.value)} style={areaStyle} /></Field></div>
    </section>
  )
}
