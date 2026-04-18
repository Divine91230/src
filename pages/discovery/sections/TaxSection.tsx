import type { Dispatch, SetStateAction } from 'react'
import { Field, formGridStyle, inputStyle } from '../components/Field'
import {
  formatResolvedPercent,
  getDependentChildrenCount,
  getDependentChildrenCountOrigin,
  getResolvedTaxParts,
  getResolvedTaxSituation,
  getResolvedTaxableIncome,
  getResolvedTmi,
  getTaxableIncomeOrigin,
  getTaxPartsOrigin,
  getTaxSituationOrigin,
  getTmiOrigin,
  type ValueOrigin,
} from '../discovery.helpers'
import { getFieldStateLabel, getFieldStateStyle } from '../discovery.fieldStates'
import type { DiscoveryFormState } from '../discovery.types'
import { buildQualityChecks } from '../../../modules/quality/buildQualityChecks'

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

export function TaxSection({
  state,
  setState,
}: {
  state: DiscoveryFormState
  setState: Dispatch<SetStateAction<DiscoveryFormState>>
}) {
  const autoSituation = getResolvedTaxSituation({
    ...state,
    tax: { ...state.tax, situationFiscaleMode: 'auto' },
  })
  const autoParts = getResolvedTaxParts({
    ...state,
    tax: { ...state.tax, partsMode: 'auto' },
  })
  const autoTaxable = getResolvedTaxableIncome({
    ...state,
    tax: { ...state.tax, taxableIncomeMode: 'auto' },
  })
  const autoTmi = getResolvedTmi({
    ...state,
    tax: { ...state.tax, tmiMode: 'auto' },
  })
  const autoDependentChildren = getDependentChildrenCount({
    ...state,
    tax: { ...state.tax, useDependentChildrenOverride: false },
  })

  const situationOrigin = getTaxSituationOrigin(state)
  const partsOrigin = getTaxPartsOrigin(state)
  const taxableOrigin = getTaxableIncomeOrigin(state)
  const tmiOrigin = getTmiOrigin(state)
  const dependentChildrenOrigin = getDependentChildrenCountOrigin(state)

  const taxWarnings = buildQualityChecks(state)
    .filter((issue) => issue.section === 'tax' || issue.section === 'identity')
    .map((issue) => issue.message)

  function updateTax<K extends keyof DiscoveryFormState['tax']>(
    key: K,
    value: DiscoveryFormState['tax'][K],
  ) {
    setState((current) => ({
      ...current,
      tax: {
        ...current.tax,
        [key]: value,
      },
    }))
  }

  return (
    <>
      <section className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Situation fiscale retenue</div>
          <div className="metric-value" style={{ fontSize: 18 }}>
            {getResolvedTaxSituation(state)}
          </div>
          <div className="metric-help" style={{ marginTop: 8 }}>
            <StatusPill origin={situationOrigin} />
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Parts fiscales</div>
          <div className="metric-value">{getResolvedTaxParts(state)}</div>
          <div className="metric-help" style={{ marginTop: 8 }}>
            <StatusPill origin={partsOrigin} />
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Revenu imposable retenu</div>
          <div className="metric-value">
            {getResolvedTaxableIncome(state).toLocaleString('fr-FR')} €
          </div>
          <div className="metric-help" style={{ marginTop: 8 }}>
            <StatusPill origin={taxableOrigin} />
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-label">TMI retenue</div>
          <div className="metric-value">{getResolvedTmi(state)}</div>
          <div className="metric-help" style={{ marginTop: 8 }}>
            <StatusPill origin={tmiOrigin} />
          </div>
        </div>
      </section>

      {taxWarnings.length > 0 ? (
        <section className="card" style={{ marginTop: 16 }}>
          <div className="section-title">
            <h2>Points à confirmer</h2>
          </div>
          <ul className="list">
            {taxWarnings.map((message) => (
              <li key={message} className="list-item">
                <span>{message}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="card" style={{ marginTop: 16 }}>
        <div className="section-title">
          <h2>Fiscalité du foyer</h2>
        </div>

        <div style={formGridStyle}>
          <Field label="Résident fiscal français ?">
            <select
              value={state.tax.residentInFrance ? 'Oui' : 'Non'}
              onChange={(e) => updateTax('residentInFrance', e.target.value === 'Oui')}
              style={inputStyle}
            >
              <option>Oui</option>
              <option>Non</option>
            </select>
          </Field>

          <Field label="Pays de résidence fiscale">
            <input
              value={state.tax.taxResidenceCountry}
              onChange={(e) => updateTax('taxResidenceCountry', e.target.value)}
              style={inputStyle}
            />
          </Field>

          <Field label="Foyer fiscal commun ?">
            <select
              value={state.tax.commonTaxHousehold ? 'Oui' : 'Non'}
              onChange={(e) => updateTax('commonTaxHousehold', e.target.value === 'Oui')}
              style={inputStyle}
            >
              <option>Oui</option>
              <option>Non</option>
            </select>
          </Field>

          <Field label="Type de déclaration">
            <select
              value={state.tax.householdDeclarationType}
              onChange={(e) =>
                updateTax(
                  'householdDeclarationType',
                  e.target.value as DiscoveryFormState['tax']['householdDeclarationType'],
                )
              }
              style={inputStyle}
            >
              <option>Personne seule</option>
              <option>Imposition commune</option>
              <option>Impositions séparées</option>
              <option>À confirmer</option>
            </select>
          </Field>

          <Field label="Nombre d'enfants à charge">
            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <StatusPill origin={dependentChildrenOrigin} />
                <span className="metric-help">Calcul automatique actuel : {autoDependentChildren}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 8 }}>
                <select
                  value={state.tax.useDependentChildrenOverride ? 'Manuel' : 'Automatique'}
                  onChange={(e) => updateTax('useDependentChildrenOverride', e.target.value === 'Manuel')}
                  style={inputStyle}
                >
                  <option>Automatique</option>
                  <option>Manuel</option>
                </select>

                <input
                  type="number"
                  value={state.tax.numberOfDependentChildrenManual}
                  onChange={(e) =>
                    updateTax('numberOfDependentChildrenManual', Number(e.target.value) || '')
                  }
                  style={inputStyle}
                  disabled={!state.tax.useDependentChildrenOverride}
                />
              </div>
            </div>
          </Field>

          <Field label="Situation fiscale retenue">
            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <StatusPill origin={situationOrigin} />
                <span className="metric-help">Lecture automatique : {autoSituation}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 8 }}>
                <select
                  value={state.tax.situationFiscaleMode}
                  onChange={(e) => updateTax('situationFiscaleMode', e.target.value as 'auto' | 'manual')}
                  style={inputStyle}
                >
                  <option value="auto">Automatique</option>
                  <option value="manual">Manuel</option>
                </select>

                <input
                  value={state.tax.taxSituationManual}
                  onChange={(e) => updateTax('taxSituationManual', e.target.value)}
                  style={inputStyle}
                  disabled={state.tax.situationFiscaleMode === 'auto'}
                  placeholder={
                    state.tax.situationFiscaleMode === 'auto'
                      ? autoSituation
                      : 'Saisir la situation retenue'
                  }
                />
              </div>
            </div>
          </Field>

          <Field label="Parts fiscales retenues">
            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <StatusPill origin={partsOrigin} />
                <span className="metric-help">Calcul automatique : {autoParts}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 8 }}>
                <select
                  value={state.tax.partsMode}
                  onChange={(e) => updateTax('partsMode', e.target.value as 'auto' | 'manual')}
                  style={inputStyle}
                >
                  <option value="auto">Automatique</option>
                  <option value="manual">Manuel</option>
                </select>

                <input
                  type="number"
                  value={state.tax.partsManual}
                  onChange={(e) => updateTax('partsManual', Number(e.target.value) || '')}
                  style={inputStyle}
                  disabled={state.tax.partsMode === 'auto'}
                  placeholder={state.tax.partsMode === 'auto' ? String(autoParts) : 'Saisir les parts fiscales'}
                />
              </div>
            </div>
          </Field>

          <Field label="Revenu imposable retenu">
            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <StatusPill origin={taxableOrigin} />
                <span className="metric-help">
                  Estimation automatique : {autoTaxable.toLocaleString('fr-FR')} €
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 8 }}>
                <select
                  value={state.tax.taxableIncomeMode}
                  onChange={(e) => updateTax('taxableIncomeMode', e.target.value as 'auto' | 'manual')}
                  style={inputStyle}
                >
                  <option value="auto">Automatique</option>
                  <option value="manual">Manuel</option>
                </select>

                <input
                  type="number"
                  value={state.tax.taxableIncomeManual}
                  onChange={(e) => updateTax('taxableIncomeManual', Number(e.target.value) || '')}
                  style={inputStyle}
                  disabled={state.tax.taxableIncomeMode === 'auto'}
                  placeholder={state.tax.taxableIncomeMode === 'auto' ? `${autoTaxable}` : 'Saisir le revenu imposable'}
                />
              </div>
            </div>
          </Field>

          <Field label="TMI retenue">
            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <StatusPill origin={tmiOrigin} />
                <span className="metric-help">Lecture automatique : {autoTmi}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 8 }}>
                <select
                  value={state.tax.tmiMode}
                  onChange={(e) => updateTax('tmiMode', e.target.value as 'auto' | 'manual')}
                  style={inputStyle}
                >
                  <option value="auto">Automatique</option>
                  <option value="manual">Manuel</option>
                </select>

                <select
                  value={state.tax.tmiMode === 'auto' ? autoTmi : state.tax.tmiManual}
                  onChange={(e) => updateTax('tmiManual', e.target.value)}
                  style={inputStyle}
                  disabled={state.tax.tmiMode === 'auto'}
                >
                  <option value="">À compléter</option>
                  <option value="0 %">0 %</option>
                  <option value="11 %">11 %</option>
                  <option value="30 %">30 %</option>
                  <option value="41 %">41 %</option>
                  <option value="45 %">45 %</option>
                </select>
              </div>
            </div>
          </Field>
        </div>
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <div className="section-title">
          <h2>Lecture fiscale retenue</h2>
        </div>

        <div className="kpi-row">
          <span className="pill">Situation : {getResolvedTaxSituation(state)}</span>
          <span className="pill">Parts : {getResolvedTaxParts(state)}</span>
          <span className="pill">
            Revenu imposable : {getResolvedTaxableIncome(state).toLocaleString('fr-FR')} €
          </span>
          <span className="pill">TMI : {formatResolvedPercent(getResolvedTmi(state))}</span>
        </div>
      </section>
    </>
  )
}
