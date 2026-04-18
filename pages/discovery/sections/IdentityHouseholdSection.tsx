import type { Dispatch, SetStateAction } from 'react'
import { Field, areaStyle, buttonStyle, formGridStyle, inputStyle, subtleButtonStyle } from '../components/Field'
import { calculateAge, generateId, getHouseholdSummary, personLabel } from '../discovery.helpers'
import type { DiscoveryFormState, LinkedPersonRole } from '../discovery.types'

export function IdentityHouseholdSection({ state, setState }: { state: DiscoveryFormState; setState: Dispatch<SetStateAction<DiscoveryFormState>> }) {
  const summary = getHouseholdSummary(state)

  function updateMain<K extends keyof DiscoveryFormState['mainPerson']>(key: K, value: DiscoveryFormState['mainPerson'][K]) {
    setState((current) => ({ ...current, mainPerson: { ...current.mainPerson, [key]: value } }))
  }

  function addLinkedPerson(role: LinkedPersonRole) {
    setState((current) => ({
      ...current,
      linkedPersons: [
        ...current.linkedPersons,
        {
          id: generateId('person'),
          role,
          firstName: '',
          lastName: '',
          birthDate: '',
          employmentStatus: 'Sans activité',
          profession: '',
          monthlyNetIncome: 0,
          isDependent: role === 'Enfant',
          isTaxAttached: role === 'Enfant',
          notes: '',
        },
      ],
    }))
  }

  function updateLinked(id: string, key: string, value: unknown) {
    setState((current) => ({
      ...current,
      linkedPersons: current.linkedPersons.map((person) =>
        person.id === id ? { ...person, [key]: value } : person,
      ),
    }))
  }

  function removeLinked(id: string) {
    setState((current) => ({
      ...current,
      linkedPersons: current.linkedPersons.filter((person) => person.id !== id),
    }))
  }

  return (
    <>
      <section className="content-grid">
        <div className="card">
          <div className="section-title"><h2>Personne principale</h2></div>
          <div style={formGridStyle}>
            <Field label="Civilité">
              <select value={state.mainPerson.civility} onChange={(e) => updateMain('civility', e.target.value as DiscoveryFormState['mainPerson']['civility'])} style={inputStyle}>
                <option>Madame</option><option>Monsieur</option><option>Autre</option>
              </select>
            </Field>
            <Field label="Date de naissance" hint={calculateAge(state.mainPerson.birthDate) !== null ? `${calculateAge(state.mainPerson.birthDate)} ans` : undefined}>
              <input type="date" value={state.mainPerson.birthDate} onChange={(e) => updateMain('birthDate', e.target.value)} style={inputStyle} />
            </Field>
            <Field label="Prénom"><input value={state.mainPerson.firstName} onChange={(e) => updateMain('firstName', e.target.value)} style={inputStyle} /></Field>
            <Field label="Nom"><input value={state.mainPerson.lastName} onChange={(e) => updateMain('lastName', e.target.value)} style={inputStyle} /></Field>
            <Field label="Email"><input value={state.mainPerson.email} onChange={(e) => updateMain('email', e.target.value)} style={inputStyle} /></Field>
            <Field label="Téléphone"><input value={state.mainPerson.phone} onChange={(e) => updateMain('phone', e.target.value)} style={inputStyle} /></Field>
            <Field label="Adresse"><input value={state.mainPerson.address} onChange={(e) => updateMain('address', e.target.value)} style={inputStyle} /></Field>
            <Field label="Code postal"><input value={state.mainPerson.zipCode} onChange={(e) => updateMain('zipCode', e.target.value)} style={inputStyle} /></Field>
            <Field label="Ville"><input value={state.mainPerson.city} onChange={(e) => updateMain('city', e.target.value)} style={inputStyle} /></Field>
            <Field label="Profession"><input value={state.mainPerson.profession} onChange={(e) => updateMain('profession', e.target.value)} style={inputStyle} /></Field>
            <Field label="Statut professionnel">
              <select value={state.mainPerson.employmentStatus} onChange={(e) => updateMain('employmentStatus', e.target.value as DiscoveryFormState['mainPerson']['employmentStatus'])} style={inputStyle}>
                <option>Salarié</option><option>TNS</option><option>Dirigeant</option><option>Retraité</option><option>Sans activité</option><option>Autre</option>
              </select>
            </Field>
            <Field label="Situation familiale">
              <select value={state.mainPerson.householdStatus} onChange={(e) => updateMain('householdStatus', e.target.value as DiscoveryFormState['mainPerson']['householdStatus'])} style={inputStyle}>
                <option>Célibataire</option><option>Marié(e)</option><option>Pacsé(e)</option><option>Concubinage</option><option>Divorcé(e)</option><option>Veuf / Veuve</option>
              </select>
            </Field>
            <Field label="Régime matrimonial">
              <select value={state.mainPerson.maritalRegime} onChange={(e) => updateMain('maritalRegime', e.target.value as DiscoveryFormState['mainPerson']['maritalRegime'])} style={inputStyle}>
                <option>Non applicable</option><option>Communauté réduite aux acquêts</option><option>Séparation de biens</option><option>Communauté universelle</option><option>Participation aux acquêts</option><option>Autre</option>
              </select>
            </Field>
          </div>
        </div>

        <div className="card">
          <div className="section-title"><h2>Synthèse foyer</h2></div>
          <ul className="list">
            <li className="list-item"><span>Personnes liées</span><span className="pill">{summary.linkedCount}</span></li>
            <li className="list-item"><span>Personnes à charge / rattachées</span><span className="pill">{summary.dependants}</span></li>
            <li className="list-item"><span>Parts fiscales estimées</span><span className="pill">{summary.taxParts}</span></li>
            <li className="list-item"><span>Situation fiscale estimée</span><span className="pill">{summary.taxSituation}</span></li>
          </ul>
          <p style={{ marginTop: 16 }}>
            Chaque personne liée créée ici sera aussi visible dans la base Clients, tout en restant rattachée à ce dossier principal.
          </p>
        </div>
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <div className="section-title">
          <h2>Personnes liées</h2>
          <div className="kpi-row">
            <button type="button" style={buttonStyle} onClick={() => addLinkedPerson('Conjoint')}>Ajouter un conjoint</button>
            <button type="button" style={buttonStyle} onClick={() => addLinkedPerson('Enfant')}>Ajouter un enfant</button>
            <button type="button" style={buttonStyle} onClick={() => addLinkedPerson('Autre')}>Ajouter une personne liée</button>
          </div>
        </div>

        <ul className="list">
          {state.linkedPersons.map((person, index) => (
            <li key={person.id} className="list-item" style={{ display: 'block' }}>
              <div className="section-title" style={{ marginBottom: 10 }}>
                <h3 style={{ margin: 0, fontSize: 16 }}>{person.role} {index + 1} — {personLabel(person)}</h3>
                <button type="button" style={subtleButtonStyle} onClick={() => removeLinked(person.id)}>Supprimer</button>
              </div>
              <div style={formGridStyle}>
                <Field label="Prénom"><input value={person.firstName} onChange={(e) => updateLinked(person.id, 'firstName', e.target.value)} style={inputStyle} /></Field>
                <Field label="Nom"><input value={person.lastName} onChange={(e) => updateLinked(person.id, 'lastName', e.target.value)} style={inputStyle} /></Field>
                <Field label="Date de naissance" hint={calculateAge(person.birthDate) !== null ? `${calculateAge(person.birthDate)} ans` : undefined}><input type="date" value={person.birthDate} onChange={(e) => updateLinked(person.id, 'birthDate', e.target.value)} style={inputStyle} /></Field>
                <Field label="Profession"><input value={person.profession} onChange={(e) => updateLinked(person.id, 'profession', e.target.value)} style={inputStyle} /></Field>
                <Field label="Statut professionnel"><select value={person.employmentStatus} onChange={(e) => updateLinked(person.id, 'employmentStatus', e.target.value)} style={inputStyle}><option>Salarié</option><option>TNS</option><option>Dirigeant</option><option>Retraité</option><option>Sans activité</option><option>Autre</option></select></Field>
                <Field label="Revenus nets mensuels"><input type="number" value={person.monthlyNetIncome} onChange={(e) => updateLinked(person.id, 'monthlyNetIncome', Number(e.target.value))} style={inputStyle} /></Field>
                <Field label="À charge ?"><select value={person.isDependent ? 'Oui' : 'Non'} onChange={(e) => updateLinked(person.id, 'isDependent', e.target.value === 'Oui')} style={inputStyle}><option>Oui</option><option>Non</option></select></Field>
                <Field label="Rattaché fiscalement ?"><select value={person.isTaxAttached ? 'Oui' : 'Non'} onChange={(e) => updateLinked(person.id, 'isTaxAttached', e.target.value === 'Oui')} style={inputStyle}><option>Oui</option><option>Non</option></select></Field>
              </div>
              <div style={{ marginTop: 12 }}>
                <Field label="Notes"><textarea value={person.notes} onChange={(e) => updateLinked(person.id, 'notes', e.target.value)} style={areaStyle} /></Field>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
