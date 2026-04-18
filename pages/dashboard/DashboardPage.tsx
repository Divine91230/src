
import { useMemo } from 'react'
import { useCabinetStore } from '../../store/useCabinetStore'
import { useComplaintsStore } from '../../store/useComplaintsStore'
import { useDeviationStore } from '../../store/useDeviationStore'
import { useReportArchiveStore } from '../../store/useReportArchiveStore'
import { useClientAuditStore } from '../../store/useClientAuditStore'
import { useCabinetSettingsStore } from '../../store/useCabinetSettingsStore'
import { buildDiscoveryCompleteness } from '../../modules/quality/buildDiscoveryCompleteness'
import { buildClientFreshnessChecks } from '../../modules/compliance/buildClientFreshnessChecks'
import './DashboardPage.css'

type StageKey = 'qualification' | 'discovery' | 'analysis' | 'restitution' | 'followup'

function getStageFromClient(client: any): StageKey {
  const progress = String(client?.progress ?? '').toLowerCase()
  const nextAction = String(client?.nextAction ?? '').toLowerCase()

  if (progress.includes('suivi') || nextAction.includes('suivi')) return 'followup'
  if (progress.includes('restitution') || nextAction.includes('restitution') || nextAction.includes('documents')) return 'restitution'
  if (progress.includes('analyse') || nextAction.includes('analyse')) return 'analysis'
  if (progress.includes('découverte') || progress.includes('decouverte') || nextAction.includes('découverte') || nextAction.includes('decouverte')) return 'discovery'
  return 'qualification'
}

function formatDateTime(value?: string) {
  if (!value) return '—'
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return '—'
  return date.toLocaleString('fr-FR')
}

export function DashboardPage() {
  const clients = useCabinetStore((state) => state.clients)
  const discoveryByClientId = useCabinetStore((state) => state.discoveryByClientId)
  const createNewClient = useCabinetStore((state) => state.createNewClient)

  const complaints = useComplaintsStore((state) => state.complaints)
  const deviations = useDeviationStore((state) => state.deviations)
  const reportHistory = useReportArchiveStore((state) => state.history)
  const auditItems = useClientAuditStore((state) => state.items)
  const settings = useCabinetSettingsStore((state) => state.settings)

  const activeClients = useMemo(() => clients.filter((item) => !item.archived), [clients])
  const prospects = useMemo(() => activeClients.filter((item) => item.status === 'Prospect'), [activeClients])

  const dossierStats = useMemo(() => {
    const byStage = {
      qualification: 0,
      discovery: 0,
      analysis: 0,
      restitution: 0,
      followup: 0,
    }

    let incomplete = 0
    let finalizable = 0
    let freshnessAlerts = 0

    for (const client of activeClients) {
      const stage = getStageFromClient(client)
      byStage[stage] += 1

      const discovery = discoveryByClientId[client.id]
      const completeness = buildDiscoveryCompleteness(discovery ?? null)
      if (!completeness.isComplete) incomplete += 1
      else finalizable += 1

      const freshness = buildClientFreshnessChecks({
        selectedClient: client,
        discovery: discovery ?? null,
      })
      if (freshness.some((item) => item.level === 'warning')) freshnessAlerts += 1
    }

    return { byStage, incomplete, finalizable, freshnessAlerts }
  }, [activeClients, discoveryByClientId])

  const openComplaints = useMemo(
    () => complaints.filter((item) => item.status !== 'cloturee').length,
    [complaints],
  )

  const unresolvedDeviations = useMemo(
    () => deviations.filter((item) => !String(item.justification ?? '').trim()).length,
    [deviations],
  )

  const finalReports = useMemo(
    () => reportHistory.filter((item) => item.documentStatus === 'final').length,
    [reportHistory],
  )

  const recentReports = useMemo(() => reportHistory.slice(0, 6), [reportHistory])
  const recentAudit = useMemo(() => auditItems.slice(0, 6), [auditItems])

  const priorityCards = useMemo(() => {
    const cards: Array<{ title: string; value: string; helper: string; tone: 'danger' | 'warning' | 'success' }> = []

    if (dossierStats.incomplete > 0) {
      cards.push({
        title: 'Dossiers incomplets',
        value: String(dossierStats.incomplete),
        helper: 'Des découvertes patrimoniales restent à compléter avant finalisation.',
        tone: 'danger',
      })
    }

    if (dossierStats.freshnessAlerts > 0) {
      cards.push({
        title: 'Dossiers à réactualiser',
        value: String(dossierStats.freshnessAlerts),
        helper: 'Des dossiers anciens doivent être revus avant édition finale.',
        tone: 'warning',
      })
    }

    if (openComplaints > 0) {
      cards.push({
        title: 'Réclamations ouvertes',
        value: String(openComplaints),
        helper: 'Un suivi est attendu côté conformité et relation client.',
        tone: 'warning',
      })
    }

    if (cards.length === 0) {
      cards.push({
        title: 'Cabinet sous contrôle',
        value: 'OK',
        helper: 'Aucune alerte majeure détectée sur le périmètre actif.',
        tone: 'success',
      })
    }

    return cards
  }, [dossierStats.incomplete, dossierStats.freshnessAlerts, openComplaints])

  const pipeline = [
    { title: 'À qualifier', count: dossierStats.byStage.qualification, helper: 'Prospects ou dossiers à cadrer' },
    { title: 'Découverte', count: dossierStats.byStage.discovery, helper: 'Recueil patrimonial à consolider' },
    { title: 'Analyse', count: dossierStats.byStage.analysis, helper: 'Lecture cabinet et priorités' },
    { title: 'Restitution', count: dossierStats.byStage.restitution, helper: 'Rapports, PDF et décision finale' },
    { title: 'Suivi', count: dossierStats.byStage.followup, helper: 'Dossiers déjà engagés' },
  ]

  const kpis = [
    { value: String(activeClients.length), label: 'Dossiers actifs', helper: 'Clients et prospects non archivés' },
    { value: String(prospects.length), label: 'Prospects', helper: 'Dossiers encore à convertir ou qualifier' },
    { value: String(dossierStats.incomplete), label: 'Dossiers incomplets', helper: 'Complétude découverte insuffisante' },
    { value: String(dossierStats.finalizable), label: 'Dossiers structurés', helper: 'Découverte suffisamment avancée' },
    { value: String(finalReports), label: 'PDF finaux', helper: 'Documents générés en mode final' },
    { value: String(openComplaints), label: 'Réclamations ouvertes', helper: 'Suivi conformité en cours' },
  ]

  return (
    <div className="dashboard-v3-page">
      <section className="dashboard-v3-hero">
        <div className="dashboard-v3-hero-copy">
          <div className="dashboard-v3-kicker">Pilotage cabinet</div>
          <h1>Dashboard cabinet</h1>
          <p>
            Vue de pilotage globale sur l’activité du cabinet, les points de conformité, la production documentaire et les priorités dossiers.
          </p>
        </div>

        <div className="dashboard-v3-hero-actions">
          <button className="dashboard-v3-gold-cta" type="button" onClick={() => createNewClient()}>
            + Nouveau dossier
          </button>

          <div className="dashboard-v3-settings-box">
            <div className="dashboard-v3-settings-label">Mode rapports</div>
            <div className="dashboard-v3-settings-value">
              {settings.ui.defaultReportViewMode === 'client' ? 'Vue client' : 'Vue cabinet'}
            </div>
          </div>
        </div>
      </section>

      <section className="dashboard-v3-kpis">
        {kpis.map((item) => (
          <article key={item.label} className="dashboard-v3-kpi-card">
            <div className="dashboard-v3-kpi-value">{item.value}</div>
            <div className="dashboard-v3-kpi-label">{item.label}</div>
            <div className="dashboard-v3-kpi-helper">{item.helper}</div>
          </article>
        ))}
      </section>

      <section className="dashboard-v3-section">
        <div className="dashboard-v3-section-head">
          <h2>Pipeline cabinet</h2>
        </div>

        <div className="dashboard-v3-pipeline-grid">
          {pipeline.map((column) => (
            <article key={column.title} className="dashboard-v3-pipeline-card">
              <h3>{column.title}</h3>
              <div className="dashboard-v3-pipeline-count">{column.count}</div>
              <div className="dashboard-v3-pipeline-helper">{column.helper}</div>
            </article>
          ))}
        </div>
      </section>

      <section className="dashboard-v3-lower-grid">
        <article className="dashboard-v3-priorities-card">
          <div className="dashboard-v3-section-head">
            <h2>Priorités du jour</h2>
          </div>

          <div className="dashboard-v3-priority-grid">
            {priorityCards.map((item) => (
              <article key={item.title} className={`dashboard-v3-priority-item ${item.tone}`}>
                <div className="dashboard-v3-priority-value">{item.value}</div>
                <div className="dashboard-v3-priority-title">{item.title}</div>
                <div className="dashboard-v3-priority-helper">{item.helper}</div>
              </article>
            ))}
          </div>
        </article>

        <div className="dashboard-v3-side-stack">
          <article className="dashboard-v3-side-card">
            <div className="dashboard-v3-section-head">
              <h2>Production documentaire</h2>
            </div>

            {recentReports.length ? (
              <div className="dashboard-v3-activity-list">
                {recentReports.map((item) => (
                  <div key={item.id} className="dashboard-v3-activity-item">
                    <div>
                      <strong>{item.documentTitle}</strong>
                      <span>{item.clientName}</span>
                    </div>
                    <div className="dashboard-v3-activity-meta">
                      <span className="dashboard-v3-pill">{item.documentStatus === 'final' ? 'Final' : 'Brouillon'}</span>
                      <span className="dashboard-v3-pill">{item.versionLabel}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="dashboard-v3-empty-panel">
                <strong>Aucun PDF généré récemment</strong>
                <span>Les dernières éditions apparaîtront ici.</span>
              </div>
            )}
          </article>

          <article className="dashboard-v3-side-card">
            <div className="dashboard-v3-section-head">
              <h2>Activité récente</h2>
            </div>

            {recentAudit.length ? (
              <div className="dashboard-v3-activity-list">
                {recentAudit.map((item) => (
                  <div key={item.id} className="dashboard-v3-activity-item">
                    <div>
                      <strong>{item.label}</strong>
                      <span>{item.clientName}</span>
                    </div>
                    <div className="dashboard-v3-activity-date">{formatDateTime(item.createdAt)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="dashboard-v3-empty-panel">
                <strong>Aucune activité récente</strong>
                <span>Les événements cabinet s’afficheront ici.</span>
              </div>
            )}
          </article>

          <article className="dashboard-v3-side-card">
            <div className="dashboard-v3-section-head">
              <h2>Vue conformité</h2>
            </div>

            <div className="dashboard-v3-compliance-stack">
              <div className="dashboard-v3-compliance-item">
                <strong>Écarts non justifiés</strong>
                <span>{unresolvedDeviations}</span>
              </div>
              <div className="dashboard-v3-compliance-item">
                <strong>Réclamations ouvertes</strong>
                <span>{openComplaints}</span>
              </div>
              <div className="dashboard-v3-compliance-item">
                <strong>Dossiers anciens</strong>
                <span>{dossierStats.freshnessAlerts}</span>
              </div>
            </div>
          </article>
        </div>
      </section>
    </div>
  )
}

export default DashboardPage
