import { useMemo, useState } from 'react'
import { PageHero } from '../../components/ui/PageHero'
import { Badge } from '../../components/ui/Badge'
import { useCabinetStore } from '../../store/useCabinetStore'
import { useCabinetSettingsStore } from '../../store/useCabinetSettingsStore'
import { useReportArchiveStore } from '../../store/useReportArchiveStore'
import { useDeviationStore } from '../../store/useDeviationStore'
import { useClientAuditStore } from '../../store/useClientAuditStore'
import { buildComplianceChecks } from '../../modules/compliance/buildComplianceChecks'
import { buildClientFreshnessChecks } from '../../modules/compliance/buildClientFreshnessChecks'
import { buildReportData } from '../../lib/reports/buildReportData'
import { buildOnePageSummaryTemplate } from '../../lib/reports/templates/onePageSummaryTemplate'
import { buildFullReportTemplate } from '../../lib/reports/templates/fullReportTemplate'
import { buildStrategyReportTemplate } from '../../lib/reports/templates/strategyReportTemplate'
import { buildAdequacyReportTemplate } from '../../lib/reports/templates/adequacyReportTemplate'
import { buildDerTemplate } from '../../lib/reports/templates/derTemplate'
import { buildEngagementLetterTemplate } from '../../lib/reports/templates/engagementLetterTemplate'
import { buildActionPlanTemplate } from '../../lib/reports/templates/actionPlanTemplate'
import {
  generatePdfFromOnePageSummaryTemplate,
  generatePdfFromFullReportTemplate,
  generatePdfFromStrategyReportTemplate,
  generatePdfFromAdequacyReportTemplate,
  generatePdfFromDerTemplate,
  generatePdfFromEngagementLetterTemplate,
  generatePdfFromActionPlanTemplate,
} from '../../lib/reports/pdf/pdfGenerator'
import './ReportDocumentsPage.css'

type DocTile = {
  id: string
  title: string
  family: 'Client' | 'Conformité' | 'Mission'
  description: string
  status: 'Prêt à générer' | 'À compléter'
  fileName: string
  run: () => Promise<void>
}

type GenerationMode = 'draft' | 'final'
type ScenarioKey = 'secure' | 'balanced' | 'growth'

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function nextVersionLabel(existingCount: number) {
  return `v${existingCount + 1}`
}

export function ReportDocumentsPage() {
  const selectedClient = useCabinetStore((state) => state.selectedClient)
  const discoveryByClientId = useCabinetStore((state) => state.discoveryByClientId)
  const settings = useCabinetSettingsStore((state) => state.settings)
  const addGeneratedReport = useReportArchiveStore((state) => state.addGeneratedReport)
  const history = useReportArchiveStore((state) => state.history)
  const getDeviationByClientId = useDeviationStore((state) => state.getDeviationByClientId)
  const addAudit = useClientAuditStore((state) => state.addAudit)

  const discovery = selectedClient ? discoveryByClientId[selectedClient.id] : null

  const [busyId, setBusyId] = useState<string | null>(null)
  const [pageError, setPageError] = useState<string>('')
  const [generationMode, setGenerationMode] = useState<GenerationMode>('draft')

  const storedScenarioChoice = useMemo(() => {
    if (!selectedClient) return null
    try {
      const raw = localStorage.getItem(`dcp-scenarios-v4-${selectedClient.id}`)
      return raw ? JSON.parse(raw) : null
    } catch {
      return null
    }
  }, [selectedClient])

  const recommendedScenarioLabel = storedScenarioChoice?.recommendedKey
    ? ({
        secure: 'Sécurisation',
        balanced: 'Équilibre patrimonial',
        growth: 'Retraite & Optimisation',
      } as const)[storedScenarioChoice.recommendedKey as ScenarioKey] ?? null
    : null

  const selectedScenarioLabel = storedScenarioChoice?.selectedKey
    ? ({
        secure: 'Sécurisation',
        balanced: 'Équilibre patrimonial',
        growth: 'Retraite & Optimisation',
      } as const)[storedScenarioChoice.selectedKey as ScenarioKey] ?? null
    : null

  const deviation = selectedClient ? getDeviationByClientId(selectedClient.id) : null

  const compliance = useMemo(
    () =>
      buildComplianceChecks({
        documents: settings.documents,
        discovery: discovery ?? null,
        hasScenario: Boolean(storedScenarioChoice?.selectedKey),
        recommendedScenarioLabel,
        selectedScenarioLabel,
        deviation,
      }),
    [settings.documents, discovery, storedScenarioChoice, recommendedScenarioLabel, selectedScenarioLabel, deviation],
  )

  const freshnessChecks = useMemo(
    () =>
      buildClientFreshnessChecks({
        selectedClient: selectedClient ?? null,
        discovery: discovery ?? null,
      }),
    [selectedClient, discovery],
  )

  const hasFreshnessWarning = freshnessChecks.some((item) => item.level === 'warning')

  const reportData = useMemo(() => {
    if (!selectedClient || !discovery) return null
    try {
      return buildReportData({
        client: selectedClient,
        discovery,
        storedScenarioChoice,
        cabinetSettings: settings.documents,
      })
    } catch {
      return null
    }
  }, [selectedClient, discovery, storedScenarioChoice, settings.documents])

  const documents = useMemo<DocTile[]>(() => {
    if (!reportData) return []

    const onePageTemplate = buildOnePageSummaryTemplate(reportData)
    const strategyTemplate = buildStrategyReportTemplate(reportData)
    const fullTemplate = buildFullReportTemplate(reportData)
    const adequacyTemplate = buildAdequacyReportTemplate(reportData)
    const derTemplate = buildDerTemplate(reportData)
    const engagementTemplate = buildEngagementLetterTemplate(reportData)
    const actionTemplate = buildActionPlanTemplate(reportData)

    return [
      {
        id: 'one-page',
        title: 'Synthèse patrimoniale',
        family: 'Client',
        description: 'Vue courte des chiffres clés, de la logique retenue et des messages du cabinet.',
        status: 'Prêt à générer',
        fileName: onePageTemplate.fileName,
        run: async () => generatePdfFromOnePageSummaryTemplate(onePageTemplate),
      },
      {
        id: 'strategy',
        title: 'Rapport de stratégie',
        family: 'Client',
        description: 'Lecture structurée de la stratégie retenue, des enveloppes et de la mise en place.',
        status: 'Prêt à générer',
        fileName: strategyTemplate.fileName,
        run: async () => generatePdfFromStrategyReportTemplate(strategyTemplate),
      },
      {
        id: 'full',
        title: 'Rapport complet',
        family: 'Client',
        description: 'Restitution patrimoniale détaillée avec chiffres, commentaires et tableaux.',
        status: 'Prêt à générer',
        fileName: fullTemplate.fileName,
        run: async () => generatePdfFromFullReportTemplate(fullTemplate),
      },
      {
        id: 'adequacy',
        title: 'Rapport d’adéquation',
        family: 'Conformité',
        description: 'Justification de l’adéquation entre le dossier, la stratégie et les solutions retenues.',
        status: 'Prêt à générer',
        fileName: adequacyTemplate.fileName,
        run: async () => generatePdfFromAdequacyReportTemplate(adequacyTemplate),
      },
      {
        id: 'der',
        title: 'DER',
        family: 'Conformité',
        description: 'Document d’entrée en relation enrichi avec les données cabinet.',
        status: 'Prêt à générer',
        fileName: derTemplate.fileName,
        run: async () => generatePdfFromDerTemplate(derTemplate),
      },
      {
        id: 'engagement',
        title: 'Lettre de mission',
        family: 'Mission',
        description: 'Cadre de mission, rémunération et validation.',
        status: 'Prêt à générer',
        fileName: engagementTemplate.fileName,
        run: async () => generatePdfFromEngagementLetterTemplate(engagementTemplate),
      },
      {
        id: 'action-plan',
        title: 'Plan d’action',
        family: 'Mission',
        description: 'Feuille de route de mise en œuvre et prochaines étapes.',
        status: 'Prêt à générer',
        fileName: actionTemplate.fileName,
        run: async () => generatePdfFromActionPlanTemplate(actionTemplate),
      },
    ]
  }, [reportData])

  const clientHistory = useMemo(
    () => history.filter((item) => item.clientId === selectedClient?.id).slice(0, 10),
    [history, selectedClient],
  )

  const finalGenerationAllowed = compliance.isFinalizable && !hasFreshnessWarning

  function handleModeChange(mode: GenerationMode) {
    setGenerationMode(mode)
    if (selectedClient) {
      addAudit({
        clientId: selectedClient.id,
        clientName: selectedClient.fullName,
        eventType: 'report_mode_changed',
        label: `Mode de génération ${mode === 'draft' ? 'brouillon' : 'final'} sélectionné`,
        details: mode === 'draft'
          ? 'Le mode brouillon autorise la génération de travail.'
          : 'Le mode final exige conformité et dossier à jour.',
      })
    }
  }

  async function registerGeneration(doc: DocTile, generationModeType: 'single' | 'batch') {
    if (!selectedClient || !reportData) return

    const currentCount = clientHistory.filter((item) => item.documentKey === doc.id).length
    const versionLabel = nextVersionLabel(currentCount)
    const finalFileName = `${doc.fileName.replace('.pdf', '')}_${versionLabel}.pdf`

    addGeneratedReport({
      clientId: selectedClient.id,
      clientName: selectedClient.fullName,
      documentKey: doc.id,
      documentTitle: doc.title,
      generatedAt: new Date().toISOString(),
      fileName: finalFileName,
      generationMode: generationModeType,
      reportDate: reportData.client.reportDate,
      documentStatus: generationMode,
      versionLabel,
    })

    addAudit({
      clientId: selectedClient.id,
      clientName: selectedClient.fullName,
      eventType: 'document_generated',
      label: `${doc.title} généré`,
      details: `${generationMode === 'draft' ? 'Brouillon' : 'Final'} • ${versionLabel}`,
    })
  }

  async function handleSingleDownload(doc: DocTile) {
    setPageError('')

    if (generationMode === 'final' && !finalGenerationAllowed) {
      setPageError('La génération finale est verrouillée tant que les points conformité bloquants ne sont pas levés et que le dossier n’est pas suffisamment à jour.')
      return
    }

    setBusyId(doc.id)
    try {
      await doc.run()
      await registerGeneration(doc, 'single')
    } catch {
      setPageError(`Le document « ${doc.title} » n’a pas pu être généré.`)
    } finally {
      setBusyId(null)
    }
  }

  async function handleDownloadAll() {
    setPageError('')

    if (generationMode === 'final' && !finalGenerationAllowed) {
      setPageError('Le téléchargement global en version finale est verrouillé tant que les conditions de conformité finale ne sont pas réunies.')
      return
    }

    setBusyId('all')
    try {
      for (const doc of documents) {
        await doc.run()
        await registerGeneration(doc, 'batch')
        await wait(180)
      }
    } catch {
      setPageError('Tous les PDF n’ont pas pu être générés. Vérifie les données du dossier puis réessaie.')
    } finally {
      setBusyId(null)
    }
  }

  if (!selectedClient) {
    return (
      <>
        <PageHero title="Documents PDF" description="Aucun client sélectionné." />
        <section className="card">
          <h2>Dossier non sélectionné</h2>
          <p>Ouvre d’abord un dossier client pour gérer les livrables PDF.</p>
        </section>
      </>
    )
  }

  if (!discovery || !reportData) {
    return (
      <>
        <PageHero
          title="Documents PDF"
          description="Page dédiée à la génération et au téléchargement des livrables, avec visibilité conformité et verrouillage final."
        />
        <section className="card">
          <h2>Données insuffisantes</h2>
          <p>Complète la découverte, les scénarios et la stratégie avant de générer les PDF.</p>
        </section>
      </>
    )
  }

  const grouped = {
    Client: documents.filter((item) => item.family === 'Client'),
    Conformité: documents.filter((item) => item.family === 'Conformité'),
    Mission: documents.filter((item) => item.family === 'Mission'),
  }

  return (
    <>
      <PageHero
        title="Documents PDF"
        description="Page dédiée à la génération et au téléchargement des livrables, avec visibilité conformité, fraîcheur du dossier, historique des éditions et verrouillage final."
      />

      <section className="card report-documents-toolbar">
        <div>
          <div className="brand-kicker">Production des livrables</div>
          <h2>{selectedClient.fullName}</h2>
          <p className="section-subtitle">
            Le mode brouillon reste souple pour travailler. Le mode final verrouille les éditions tant que le dossier n’est pas conforme et suffisamment à jour.
          </p>
        </div>

        <div className="report-documents-toolbar-actions report-documents-toolbar-stack">
          <div className="report-mode-switch">
            <button
              type="button"
              className={`ghost-cta${generationMode === 'draft' ? ' active' : ''}`}
              onClick={() => handleModeChange('draft')}
              disabled={busyId !== null}
            >
              Brouillon
            </button>
            <button
              type="button"
              className={`ghost-cta${generationMode === 'final' ? ' active' : ''}`}
              onClick={() => handleModeChange('final')}
              disabled={busyId !== null}
            >
              Final
            </button>
          </div>

          <button
            type="button"
            className="primary-cta"
            onClick={handleDownloadAll}
            disabled={busyId !== null || (generationMode === 'final' && !finalGenerationAllowed)}
          >
            {busyId === 'all'
              ? 'Téléchargement en cours…'
              : generationMode === 'final'
                ? 'Télécharger tous les PDF finaux'
                : 'Télécharger tous les PDF brouillons'}
          </button>
        </div>
      </section>

      <section className={`card report-lock-card${finalGenerationAllowed ? ' ok' : ' blocked'}`}>
        <div className="section-title">
          <h2>Verrouillage final</h2>
          <Badge>{generationMode === 'final' ? 'Mode final actif' : 'Mode brouillon actif'}</Badge>
        </div>

        <div className="report-compliance-list">
          <div className="report-compliance-item">
            <strong>Conformité</strong>
            <span>{compliance.isFinalizable ? 'Socle conformité principal validé' : 'Des points bloquants restent à compléter'}</span>
          </div>
          <div className="report-compliance-item">
            <strong>Fraîcheur du dossier</strong>
            <span>{hasFreshnessWarning ? 'Le dossier doit être réactualisé avant génération finale' : 'Aucune alerte bloquante sur la fraîcheur du dossier'}</span>
          </div>
          <div className="report-compliance-item">
            <strong>Génération finale</strong>
            <span>{finalGenerationAllowed ? 'Autorisée' : 'Verrouillée tant que les conditions ne sont pas réunies'}</span>
          </div>
        </div>
      </section>

      <section className={`card report-compliance-card${compliance.isFinalizable ? ' ok' : ' blocked'}`}>
        <div className="section-title">
          <h2>Contrôle conformité</h2>
          <Badge>{compliance.isFinalizable ? 'Socle principal OK' : 'Points à compléter'}</Badge>
        </div>

        {compliance.blockingChecks.length ? (
          <div className="report-compliance-list">
            {compliance.blockingChecks.map((item) => (
              <div key={item.id} className="report-compliance-item">
                <strong>Bloquant</strong>
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="section-subtitle">Les points bloquants principaux sont levés.</p>
        )}

        {compliance.warningChecks.length ? (
          <>
            <div className="report-compliance-subtitle">Points d’attention</div>
            <div className="report-compliance-list">
              {compliance.warningChecks.map((item) => (
                <div key={item.id} className="report-compliance-item attention">
                  <strong>Attention</strong>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </>
        ) : null}
      </section>

      <section className="card report-freshness-card">
        <div className="section-title">
          <h2>Fraîcheur du dossier</h2>
          <Badge>{`${freshnessChecks.length} contrôle${freshnessChecks.length > 1 ? 's' : ''}`}</Badge>
        </div>

        <div className="report-compliance-list">
          {freshnessChecks.map((item, index) => (
            <div key={`${item.label}-${index}`} className={`report-compliance-item freshness-${item.level}`}>
              <strong>{item.level === 'ok' ? 'OK' : item.level === 'attention' ? 'Attention' : 'Alerte'}</strong>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </section>

      {pageError ? (
        <section className="card report-documents-error">
          <p>{pageError}</p>
        </section>
      ) : null}

      {Object.entries(grouped).map(([family, items]) => (
        <section key={family} className="card report-documents-section">
          <div className="section-title">
            <h2>{family}</h2>
            <Badge>{`${items.length} document${items.length > 1 ? 's' : ''}`}</Badge>
          </div>

          <div className="report-documents-grid">
            {items.map((item) => (
              <article key={item.id} className="report-document-card">
                <div className="report-document-main">
                  <div className="document-title">{item.title}</div>
                  <div className="document-helper">{item.description}</div>
                  <div className="report-document-file">{item.fileName}</div>
                </div>

                <div className="report-document-actions">
                  <span className="pill">{item.status}</span>
                  <button
                    type="button"
                    className="primary-cta secondary"
                    onClick={() => handleSingleDownload(item)}
                    disabled={busyId !== null || (generationMode === 'final' && !finalGenerationAllowed)}
                  >
                    {busyId === item.id
                      ? 'Génération…'
                      : generationMode === 'final'
                        ? 'Télécharger final'
                        : 'Télécharger brouillon'}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}

      <section className="card report-history-card">
        <div className="section-title">
          <h2>Historique versionné des générations</h2>
          <Badge>{`${clientHistory.length} entrée${clientHistory.length > 1 ? 's' : ''}`}</Badge>
        </div>

        {clientHistory.length ? (
          <div className="report-history-list">
            {clientHistory.map((item) => (
              <article key={item.id} className="report-history-item">
                <div>
                  <div className="document-title">{item.documentTitle}</div>
                  <div className="document-helper">{item.fileName}</div>
                </div>
                <div className="report-history-meta">
                  <span className="pill">{item.documentStatus === 'final' ? 'Final' : 'Brouillon'}</span>
                  <span className="pill">{item.versionLabel}</span>
                  <span className="pill">{item.generationMode === 'batch' ? 'Lot' : 'Unitaire'}</span>
                  <span className="pill">{new Date(item.generatedAt).toLocaleString('fr-FR')}</span>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="section-subtitle">Aucune génération enregistrée pour ce dossier.</p>
        )}
      </section>
    </>
  )
}

export default ReportDocumentsPage
