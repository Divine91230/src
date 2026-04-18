import type { Dispatch, SetStateAction } from 'react'
import { Field, areaStyle, formGridStyle, inputStyle } from '../components/Field'
import {
  getResolvedRiskProfile,
  getRiskScore,
  getSuggestedRiskProfile,
  getRiskProfileExplanation,
} from '../discovery.helpers'
import type {
  DiscoveryFormState,
  MainObjectiveOption,
  RiskAnswer,
  SecondaryObjectiveOption,
} from '../discovery.types'

const esgThemes = [
  'Environnement',
  'Social',
  'Gouvernance',
  'Transition climatique',
  'Santé / éducation',
  'Inclusion',
]

const esgExclusions = [
  'Armement',
  'Tabac',
  'Énergies fossiles',
  "Jeux d'argent",
  'Alcool',
]

const objectiveOptions: MainObjectiveOption[] = [
  'Préparer la retraite',
  'Valoriser un capital',
  'Diversifier le patrimoine',
  'Optimiser la fiscalité',
  'Protéger le foyer',
  'Générer des revenus complémentaires',
  'Transmettre le patrimoine',
  'Financer un projet',
  'Conserver une forte liquidité',
]

const secondaryObjectiveOptions: SecondaryObjectiveOption[] = [
  '',
  'Préparer la retraite',
  'Valoriser un capital',
  'Diversifier le patrimoine',
  'Optimiser la fiscalité',
  'Protéger le foyer',
  'Générer des revenus complémentaires',
  'Transmettre le patrimoine',
  'Financer un projet',
  'Conserver une forte liquidité',
]

const riskQuestions: Array<{
  key: keyof Pick<
    DiscoveryFormState['objectives'],
    | 'horizonTolerance'
    | 'marketKnowledge'
    | 'investmentExperience'
    | 'drawdownReaction'
    | 'lossCapacity'
    | 'performanceGoal'
    | 'returnVolatilityTradeoff'
    | 'capitalStabilityNeed'
  >
  label: string
  helper?: string
  options: Array<{ value: RiskAnswer; label: string }>
}> = [
  {
    key: 'horizonTolerance',
    label: 'Quel horizon réaliste pouvez-vous accepter pour un placement orienté performance ?',
    helper: 'Plus l’horizon est long, plus une part d’actifs volatils peut être envisagée.',
    options: [
      { value: 1, label: 'Moins de 3 ans' },
      { value: 2, label: '3 à 5 ans' },
      { value: 3, label: '5 à 8 ans' },
      { value: 4, label: 'Plus de 8 ans' },
    ],
  },
  {
    key: 'marketKnowledge',
    label: 'Quel est votre niveau de connaissance des supports financiers ?',
    helper: 'Cette question mesure la familiarité avec les marchés, les fonds, les ETF, les UC et les risques associés.',
    options: [
      { value: 1, label: 'Très limité' },
      { value: 2, label: 'Basique' },
      { value: 3, label: 'Intermédiaire' },
      { value: 4, label: 'Avancé' },
    ],
  },
  {
    key: 'investmentExperience',
    label: 'Quelle est votre expérience concrète de l’investissement ?',
    helper: 'On mesure ici l’expérience réellement vécue, pas seulement l’intérêt pour le sujet.',
    options: [
      { value: 1, label: 'Aucune expérience' },
      { value: 2, label: 'Quelques placements simples' },
      { value: 3, label: 'Expérience régulière' },
      { value: 4, label: 'Expérience étendue et diversifiée' },
    ],
  },
  {
    key: 'drawdownReaction',
    label: 'Si votre placement perd 15 % sur une période courte, quelle serait votre réaction ?',
    helper: 'Cette réponse est très structurante : elle reflète la réaction comportementale face à la baisse.',
    options: [
      { value: 1, label: 'Je sors immédiatement' },
      { value: 2, label: 'J’attends mais je suis très inconfortable' },
      { value: 3, label: 'Je conserve la position' },
      { value: 4, label: 'Je peux conserver voire renforcer' },
    ],
  },
  {
    key: 'lossCapacity',
    label: 'Quelle perte temporaire pouvez-vous supporter sans compromettre vos projets ?',
    helper: 'Il s’agit de la perte temporaire réellement supportable sans mettre en danger vos objectifs.',
    options: [
      { value: 1, label: 'Très faible' },
      { value: 2, label: 'Faible' },
      { value: 3, label: 'Moyenne' },
      { value: 4, label: 'Élevée' },
    ],
  },
  {
    key: 'performanceGoal',
    label: 'Votre objectif de rendement se situe plutôt sur quel niveau ?',
    helper: 'Cette question permet de positionner le compromis entre sécurité et recherche de performance.',
    options: [
      { value: 1, label: 'Priorité à la sécurité' },
      { value: 2, label: 'Rendement modéré' },
      { value: 3, label: 'Recherche d’équilibre rendement / risque' },
      { value: 4, label: 'Recherche de performance élevée' },
    ],
  },
  {
    key: 'returnVolatilityTradeoff',
    label: 'Êtes-vous prêt à accepter davantage de volatilité pour viser plus de performance ?',
    helper: 'On teste ici l’acceptation d’un chemin d’investissement moins stable.',
    options: [
      { value: 1, label: 'Non, pas vraiment' },
      { value: 2, label: 'Plutôt non' },
      { value: 3, label: 'Plutôt oui' },
      { value: 4, label: 'Oui clairement' },
    ],
  },
  {
    key: 'capitalStabilityNeed',
    label: 'À quel point la stabilité du capital est-elle prioritaire pour vous ?',
    helper: 'Une priorité forte à la stabilité pousse naturellement vers un profil plus prudent.',
    options: [
      { value: 1, label: 'Absolument prioritaire' },
      { value: 2, label: 'Importante' },
      { value: 3, label: 'Secondaire' },
      { value: 4, label: "Pas prioritaire si l’horizon est long" },
    ],
  },
]

function getProfileTone(profile: string) {
  if (profile === 'Prudent') {
    return {
      bg: 'rgba(200,166,106,0.10)',
      border: 'rgba(200,166,106,0.22)',
      text: '#8f6f43',
    }
  }

  if (profile === 'Équilibré') {
    return {
      bg: 'rgba(178,135,71,0.14)',
      border: 'rgba(178,135,71,0.28)',
      text: '#7c5c2f',
    }
  }

  return {
    bg: 'rgba(160,120,60,0.18)',
    border: 'rgba(160,120,60,0.30)',
    text: '#6f4f22',
  }
}

export function ObjectivesRiskEsgSection({
  state,
  setState,
}: {
  state: DiscoveryFormState
  setState: Dispatch<SetStateAction<DiscoveryFormState>>
}) {
  const score = getRiskScore(state)
  const suggested = getSuggestedRiskProfile(state)
  const resolved = getResolvedRiskProfile(state)
  const explanation = getRiskProfileExplanation(state)
  const tone = getProfileTone(suggested)

  function update<K extends keyof DiscoveryFormState['objectives']>(
    key: K,
    value: DiscoveryFormState['objectives'][K],
  ) {
    setState((current) => ({
      ...current,
      objectives: {
        ...current.objectives,
        [key]: value,
      },
    }))
  }

  function toggleArrayValue(field: 'esgThemes' | 'esgExclusions', value: string) {
    setState((current) => ({
      ...current,
      objectives: {
        ...current.objectives,
        [field]: current.objectives[field].includes(value)
          ? current.objectives[field].filter((item) => item !== value)
          : [...current.objectives[field], value],
      },
    }))
  }

  return (
    <>
      <section className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Score risque</div>
          <div className="metric-value">{score}</div>
          <div className="metric-help">Lecture comportementale et patrimoniale</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Profil suggéré</div>
          <div className="metric-value" style={{ fontSize: 22 }}>{suggested}</div>
          <div className="metric-help">Calcul automatique</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Profil retenu</div>
          <div className="metric-value" style={{ fontSize: 22 }}>{resolved}</div>
          <div className="metric-help">Auto ou manuel</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Préférence ESG</div>
          <div className="metric-value" style={{ fontSize: 22 }}>
            {state.objectives.esgPreference}
          </div>
          <div className="metric-help">Intégration des critères durables</div>
        </div>
      </section>

      <section className="card">
        <div className="section-title">
          <h2>Objectifs patrimoniaux</h2>
        </div>

        <div style={formGridStyle}>
          <Field label="Objectif principal">
            <select
              value={state.objectives.mainObjective}
              onChange={(e) =>
                update('mainObjective', e.target.value as MainObjectiveOption)
              }
              style={inputStyle}
            >
              {objectiveOptions.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </Field>

          <Field label="Objectif secondaire">
            <select
              value={state.objectives.secondaryObjective}
              onChange={(e) =>
                update(
                  'secondaryObjective',
                  e.target.value as SecondaryObjectiveOption,
                )
              }
              style={inputStyle}
            >
              <option value="">Aucun</option>
              {secondaryObjectiveOptions.filter(Boolean).map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </Field>

          <Field label="Horizon de placement (années)">
            <input
              type="number"
              value={state.objectives.horizonYears}
              onChange={(e) =>
                update('horizonYears', Number(e.target.value) || '')
              }
              style={inputStyle}
            />
          </Field>

          <Field label="Besoin de liquidité">
            <select
              value={state.objectives.liquidityNeed}
              onChange={(e) =>
                update(
                  'liquidityNeed',
                  e.target.value as DiscoveryFormState['objectives']['liquidityNeed'],
                )
              }
              style={inputStyle}
            >
              <option>Très élevé</option>
              <option>Modéré</option>
              <option>Faible</option>
            </select>
          </Field>
        </div>
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <div className="section-title">
          <h2>Questionnaire profil de risque</h2>
        </div>

        <p>
          Ce questionnaire aide à apprécier le profil de risque du client à partir
          de son horizon, de son expérience, de sa tolérance aux pertes et de son
          comportement attendu face à la volatilité.
        </p>

        <div
          style={{
            marginTop: 14,
            padding: 14,
            borderRadius: 16,
            background: tone.bg,
            border: `1px solid ${tone.border}`,
            color: tone.text,
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 6 }}>
            Lecture automatique actuelle : {suggested}
          </div>
          <div style={{ lineHeight: 1.6, fontSize: 14 }}>
            {explanation}
          </div>
        </div>

        <div style={{ display: 'grid', gap: 14, marginTop: 16 }}>
          {riskQuestions.map((question) => (
            <Field key={question.key} label={question.label}>
              <div style={{ display: 'grid', gap: 8 }}>
                <select
                  value={state.objectives[question.key]}
                  onChange={(e) =>
                    update(question.key, Number(e.target.value) as RiskAnswer)
                  }
                  style={inputStyle}
                >
                  {question.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                {question.helper ? (
                  <div className="metric-help">{question.helper}</div>
                ) : null}
              </div>
            </Field>
          ))}

          <Field label="Profil retenu">
  <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 8 }}>
    <select
      value={state.objectives.riskProfileMode}
      onChange={(e) => {
        const nextMode = e.target.value as 'auto' | 'manual'
        setState((current) => ({
          ...current,
          objectives: {
            ...current.objectives,
            riskProfileMode: nextMode,
            riskProfileManual:
              nextMode === 'manual'
                ? getSuggestedRiskProfile(current)
                : current.objectives.riskProfileManual,
          },
        }))
      }}
      style={inputStyle}
    >
      <option value="auto">Automatique</option>
      <option value="manual">Manuel</option>
    </select>

    <select
      value={
        state.objectives.riskProfileMode === 'auto'
          ? getSuggestedRiskProfile(state)
          : state.objectives.riskProfileManual
      }
      onChange={(e) =>
        update(
          'riskProfileManual',
          e.target.value as DiscoveryFormState['objectives']['riskProfileManual'],
        )
      }
      style={inputStyle}
      disabled={state.objectives.riskProfileMode === 'auto'}
    >
      <option>Prudent</option>
      <option>Équilibré</option>
      <option>Dynamique</option>
    </select>
  </div>
</Field>
        </div>
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <div className="section-title">
          <h2>Préférences ESG</h2>
        </div>

        <div style={formGridStyle}>
          <Field label="Intégrer des critères ESG ?">
            <select
              value={state.objectives.esgPreference}
              onChange={(e) =>
                update(
                  'esgPreference',
                  e.target.value as DiscoveryFormState['objectives']['esgPreference'],
                )
              }
              style={inputStyle}
            >
              <option>Oui</option>
              <option>Non</option>
              <option>Sans préférence</option>
            </select>
          </Field>

          <Field label="Importance ESG">
            <select
              value={state.objectives.esgImportance}
              onChange={(e) =>
                update(
                  'esgImportance',
                  e.target.value as DiscoveryFormState['objectives']['esgImportance'],
                )
              }
              style={inputStyle}
            >
              <option>Faible</option>
              <option>Modérée</option>
              <option>Importante</option>
              <option>Prioritaire</option>
            </select>
          </Field>
        </div>

        <div style={{ marginTop: 12 }}>
          <div className="metric-label" style={{ marginBottom: 8 }}>
            Thèmes ESG d'intérêt
          </div>
          <div className="kpi-row">
            {esgThemes.map((item) => (
              <button
                key={item}
                type="button"
                className="pill"
                onClick={() => toggleArrayValue('esgThemes', item)}
                style={{
                  cursor: 'pointer',
                  background: state.objectives.esgThemes.includes(item)
                    ? 'rgba(178,135,71,0.14)'
                    : 'transparent',
                }}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <div className="metric-label" style={{ marginBottom: 8 }}>
            Exclusions souhaitées
          </div>
          <div className="kpi-row">
            {esgExclusions.map((item) => (
              <button
                key={item}
                type="button"
                className="pill"
                onClick={() => toggleArrayValue('esgExclusions', item)}
                style={{
                  cursor: 'pointer',
                  background: state.objectives.esgExclusions.includes(item)
                    ? 'rgba(178,135,71,0.14)'
                    : 'transparent',
                }}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <Field label="Commentaire ESG">
            <textarea
              value={state.objectives.esgComment}
              onChange={(e) => update('esgComment', e.target.value)}
              style={areaStyle}
            />
          </Field>
        </div>
      </section>
    </>
  )
}