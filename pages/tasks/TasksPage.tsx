import { PageHero } from '../../components/ui/PageHero'
import { useCabinetStore } from '../../store/useCabinetStore'
import {
  getEmergencyFundMonths,
  getResolvedRiskProfile,
  getResolvedTmi,
  getSelectedSavingsCapacity,
} from '../discovery/discovery.helpers'

type TaskItem = {
  title: string
  detail: string
  priority: 'ÉLEVÉE' | 'MOYENNE' | 'FAIBLE'
  status: 'À faire' | 'En cours' | 'Prêt'
}

export function TasksPage() {
  const client = useCabinetStore((state) => state.selectedClient)
  const discovery = useCabinetStore((state) => state.getDiscoveryForSelectedClient())

  if (!client) {
    return (
      <>
        <PageHero title="Tâches" description="Aucun client sélectionné." />
        <section className="card">
          <h2>Dossier non sélectionné</h2>
          <p>Passe par la page Clients pour ouvrir un dossier.</p>
        </section>
      </>
    )
  }

  if (!discovery) {
    return (
      <>
        <PageHero
          title={`Tâches — ${client.fullName}`}
          description="Aucune découverte patrimoniale disponible pour ce dossier."
        />
        <section className="card">
          <h2>Données insuffisantes</h2>
          <p>
            Commence par renseigner la Découverte patrimoniale pour générer une
            liste de tâches utile.
          </p>
        </section>
      </>
    )
  }

  const displayName =
    `${discovery?.mainPerson?.firstName ?? ''} ${discovery?.mainPerson?.lastName ?? ''}`.trim() ||
    client.fullName

  const emergencyMonths = getEmergencyFundMonths(discovery)
  const tmi = getResolvedTmi(discovery)
  const riskProfile = getResolvedRiskProfile(discovery)
  const selectedSavings = getSelectedSavingsCapacity(discovery)

  const tasks: TaskItem[] = []

  const hasIdentity =
    Boolean(discovery?.mainPerson?.firstName) &&
    Boolean(discovery?.mainPerson?.lastName)

  const hasMainObjective = Boolean(discovery?.objectives?.mainObjective)
  const hasIncome = Number(discovery?.householdBudget?.selectedMonthlyIncome || 0) > 0
  const hasAssets = Array.isArray(discovery?.assets) && discovery.assets.length > 0
  const hasRiskQuestionnaire = Array.isArray(discovery?.riskQuestionnaireAnswers)
    ? discovery.riskQuestionnaireAnswers.length > 0
    : true

  if (!hasIdentity) {
    tasks.push({
      title: 'Compléter l’identité du client',
      detail: 'Nom, prénom et informations de base doivent être finalisés.',
      priority: 'ÉLEVÉE',
      status: 'À faire',
    })
  }

  if (!hasMainObjective) {
    tasks.push({
      title: 'Clarifier l’objectif principal',
      detail: 'Le dossier doit être rattaché à un objectif patrimonial prioritaire.',
      priority: 'ÉLEVÉE',
      status: 'À faire',
    })
  }

  if (!hasIncome) {
    tasks.push({
      title: 'Valider les revenus du foyer',
      detail: 'Les revenus retenus doivent être confirmés pour fiabiliser l’analyse.',
      priority: 'ÉLEVÉE',
      status: 'À faire',
    })
  }

  if (!hasAssets) {
    tasks.push({
      title: 'Renseigner les actifs',
      detail: 'La structure patrimoniale reste incomplète sans les actifs détaillés.',
      priority: 'ÉLEVÉE',
      status: 'À faire',
    })
  }

  if (!hasRiskQuestionnaire) {
    tasks.push({
      title: 'Compléter le questionnaire risque',
      detail: 'Le profil investisseur doit être documenté avant toute préconisation.',
      priority: 'ÉLEVÉE',
      status: 'À faire',
    })
  }

  if (emergencyMonths < 3) {
    tasks.push({
      title: 'Étudier un renforcement de la réserve de sécurité',
      detail: 'Le niveau de liquidités paraît insuffisant au regard des charges retenues.',
      priority: 'MOYENNE',
      status: 'En cours',
    })
  }

  if (selectedSavings > 0 && (tmi === '30 %' || tmi === '41 %' || tmi === '45 %')) {
    tasks.push({
      title: 'Arbitrer la piste retraite / fiscalité',
      detail: 'Une enveloppe retraite peut mériter une étude selon la TMI retenue.',
      priority: 'MOYENNE',
      status: 'En cours',
    })
  }

  if (riskProfile === 'Équilibré' || riskProfile === 'Dynamique') {
    tasks.push({
      title: 'Préparer une logique de diversification financière',
      detail: 'Le profil permet d’étudier une montée en puissance progressive sur la poche financière.',
      priority: 'FAIBLE',
      status: 'En cours',
    })
  }

  if (tasks.length === 0) {
    tasks.push({
      title: 'Dossier prêt pour restitution',
      detail: 'Les principaux blocs sont renseignés. La préparation de la restitution peut être lancée.',
      priority: 'FAIBLE',
      status: 'Prêt',
    })
  }

  const highPriority = tasks.filter((task) => task.priority === 'ÉLEVÉE').length
  const inProgress = tasks.filter((task) => task.status === 'En cours').length
  const ready = tasks.filter((task) => task.status === 'Prêt').length

  return (
    <>
      <PageHero
        title={`Tâches — ${displayName}`}
        description="Lecture opérationnelle du dossier : actions à mener, validations à obtenir et prochaines étapes cabinet."
      />

      <section className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Tâches ouvertes</div>
          <div className="metric-value">{tasks.length}</div>
          <div className="metric-help">Total des actions détectées</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Priorité élevée</div>
          <div className="metric-value">{highPriority}</div>
          <div className="metric-help">À traiter rapidement</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">En cours</div>
          <div className="metric-value">{inProgress}</div>
          <div className="metric-help">Actions intermédiaires</div>
        </div>

        <div className="metric-card">
          <div className="metric-label">Prêt</div>
          <div className="metric-value">{ready}</div>
          <div className="metric-help">Blocages levés</div>
        </div>
      </section>

      <section className="content-grid">
        <div className="card">
          <div className="section-title">
            <h2>Liste des tâches</h2>
          </div>

          <ul className="list">
            {tasks.map((task) => (
              <li key={task.title} className="list-item">
                <div>
                  <strong>{task.title}</strong>
                  <p>{task.detail}</p>
                </div>
                <div className="kpi-row">
                  <span className="badge">{task.priority}</span>
                  <span className="pill">{task.status}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="card">
          <div className="section-title">
            <h2>Lecture cabinet</h2>
          </div>

          <p>
            Cette page sert de passerelle entre la découverte du dossier et son
            traitement opérationnel : validations à obtenir, points à confirmer,
            et préparation des étapes suivantes.
          </p>

          <div className="kpi-row" style={{ marginTop: 16 }}>
            <span className="pill">Découverte</span>
            <span className="pill">Analyse</span>
            <span className="pill">Préconisations</span>
            <span className="pill">Restitution</span>
          </div>
        </div>
      </section>
    </>
  )
}