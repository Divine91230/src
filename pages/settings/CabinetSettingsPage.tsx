import { PageHero } from '../../components/ui/PageHero'
import { useCabinetSettingsStore } from '../../store/useCabinetSettingsStore'

function LabeledInput({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <label className="settings-field">
      <span className="settings-label">{label}</span>
      <input
        className="settings-input"
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}

function LabeledTextarea({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  return (
    <label className="settings-field settings-field-wide">
      <span className="settings-label">{label}</span>
      <textarea
        className="settings-textarea"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}

export function CabinetSettingsPage() {
  const settings = useCabinetSettingsStore((state) => state.settings)
  const updateDocuments = useCabinetSettingsStore((state) => state.updateDocuments)
  const updateUi = useCabinetSettingsStore((state) => state.updateUi)

  return (
    <>
      <PageHero
        title="Paramètres cabinet"
        description="Réglages cabinet, conformité documentaire et préférences d’affichage."
      />

      <section className="card">
        <div className="section-title">
          <h2>Identité cabinet</h2>
        </div>

        <div className="settings-form-grid">
          <LabeledInput
            label="Nom du cabinet"
            value={settings.documents.cabinetName ?? ''}
            onChange={(value) => updateDocuments({ cabinetName: value })}
          />

          <LabeledInput
            label="Conseiller"
            value={settings.documents.advisorName ?? ''}
            onChange={(value) => updateDocuments({ advisorName: value })}
          />

          <LabeledInput
            label="Email"
            value={settings.documents.email ?? ''}
            onChange={(value) => updateDocuments({ email: value })}
          />

          <LabeledInput
            label="Téléphone"
            value={settings.documents.phone ?? ''}
            onChange={(value) => updateDocuments({ phone: value })}
          />

          <LabeledInput
            label="Site web"
            value={settings.documents.website ?? ''}
            onChange={(value) => updateDocuments({ website: value })}
          />

          <LabeledInput
            label="Adresse du cabinet"
            value={settings.documents.headOfficeAddress ?? ''}
            onChange={(value) => updateDocuments({ headOfficeAddress: value })}
          />

          <LabeledTextarea
            label="Signature / tagline"
            value={settings.documents.tagline ?? ''}
            onChange={(value) => updateDocuments({ tagline: value })}
            placeholder="Structurer. Protéger. Élever votre patrimoine"
          />
        </div>
      </section>

      <section className="card">
        <div className="section-title">
          <h2>Conformité documentaire</h2>
        </div>

        <div className="settings-form-grid">
          <LabeledInput
            label="ORIAS"
            value={settings.documents.orias ?? ''}
            onChange={(value) => updateDocuments({ orias: value })}
            placeholder="N° ORIAS"
          />

          <LabeledInput
            label="Statut légal"
            value={settings.documents.legalStatus ?? ''}
            onChange={(value) => updateDocuments({ legalStatus: value })}
            placeholder="Cabinet de conseil patrimonial"
          />

          <LabeledInput
            label="Statut CIF"
            value={settings.documents.cifStatus ?? ''}
            onChange={(value) => updateDocuments({ cifStatus: value })}
            placeholder="Conseiller en investissements financiers"
          />

          <LabeledInput
            label="Statut courtage / intermédiaire"
            value={settings.documents.intermediaryStatus ?? ''}
            onChange={(value) => updateDocuments({ intermediaryStatus: value })}
            placeholder="Courtier en assurance"
          />

          <LabeledInput
            label="Association professionnelle"
            value={settings.documents.professionalAssociation ?? ''}
            onChange={(value) => updateDocuments({ professionalAssociation: value })}
            placeholder="CNCEF Patrimoine"
          />

          <LabeledInput
            label="RC Pro"
            value={settings.documents.rcPro ?? ''}
            onChange={(value) => updateDocuments({ rcPro: value })}
            placeholder="RC Pro - police en vigueur"
          />

          <LabeledInput
            label="Médiateur"
            value={settings.documents.mediator ?? ''}
            onChange={(value) => updateDocuments({ mediator: value })}
          />

          <LabeledInput
            label="Email réclamations"
            value={settings.documents.complaintsEmail ?? ''}
            onChange={(value) => updateDocuments({ complaintsEmail: value })}
          />

          <LabeledInput
            label="Délai de traitement des réclamations"
            value={settings.documents.complaintsHandlingDelay ?? ''}
            onChange={(value) => updateDocuments({ complaintsHandlingDelay: value })}
            placeholder="Deux mois maximum"
          />

          <LabeledTextarea
            label="Politique de rémunération"
            value={settings.documents.remunerationDisclosure ?? ''}
            onChange={(value) => updateDocuments({ remunerationDisclosure: value })}
            placeholder="Le cabinet peut être rémunéré sous forme d’honoraires, de commissions ou d’une combinaison des deux selon la mission et les solutions retenues."
          />
        </div>
      </section>

      <section className="card">
        <div className="section-title">
          <h2>Préférences d’affichage</h2>
        </div>

        <div className="settings-form-grid">
          <label className="settings-field">
            <span className="settings-label">Vue rapports par défaut</span>
            <select
              className="settings-select"
              value={settings.ui.defaultReportViewMode}
              onChange={(e) =>
                updateUi({
                  defaultReportViewMode: e.target.value as 'client' | 'cabinet',
                })
              }
            >
              <option value="client">Vue client</option>
              <option value="cabinet">Vue cabinet</option>
            </select>
          </label>

          <label className="settings-field">
            <span className="settings-label">Notes internes visibles par défaut</span>
            <select
              className="settings-select"
              value={settings.ui.showInternalNotesByDefault ? 'yes' : 'no'}
              onChange={(e) =>
                updateUi({
                  showInternalNotesByDefault: e.target.value === 'yes',
                })
              }
            >
              <option value="no">Non</option>
              <option value="yes">Oui</option>
            </select>
          </label>
        </div>
      </section>
    </>
  )
}

export default CabinetSettingsPage
