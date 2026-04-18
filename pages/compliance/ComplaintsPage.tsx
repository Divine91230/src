import { useMemo, useState } from 'react'
import { PageHero } from '../../components/ui/PageHero'
import { Badge } from '../../components/ui/Badge'
import { useCabinetStore } from '../../store/useCabinetStore'
import { useComplaintsStore } from '../../store/useComplaintsStore'
import './ComplaintsPage.css'

export function ComplaintsPage() {
  const selectedClient = useCabinetStore((state) => state.selectedClient)
  const complaints = useComplaintsStore((state) => state.complaints)
  const createComplaint = useComplaintsStore((state) => state.createComplaint)
  const setComplaintStatus = useComplaintsStore((state) => state.setComplaintStatus)

  const [channel, setChannel] = useState('Email')
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [owner, setOwner] = useState('Cabinet')
  const [responseDueDate, setResponseDueDate] = useState('')

  const filteredComplaints = useMemo(
    () =>
      selectedClient
        ? complaints.filter((item) => item.clientId === selectedClient.id)
        : complaints,
    [complaints, selectedClient],
  )

  function handleCreateComplaint() {
    if (!selectedClient || !subject.trim() || !description.trim()) return
    createComplaint({
      clientId: selectedClient.id,
      clientName: selectedClient.fullName,
      receivedAt: new Date().toISOString(),
      channel,
      subject,
      description,
      owner,
      responseDueDate: responseDueDate || undefined,
    })
    setSubject('')
    setDescription('')
    setResponseDueDate('')
  }

  return (
    <>
      <PageHero
        title="Réclamations"
        description="Suivi des réclamations client, avec date de réception, statut, responsable et échéance de réponse."
      />

      <section className="card complaints-create-card">
        <div className="section-title">
          <h2>Nouvelle réclamation</h2>
          <Badge>{selectedClient ? selectedClient.fullName : 'Aucun client sélectionné'}</Badge>
        </div>

        {!selectedClient ? (
          <p className="section-subtitle">Sélectionne un client pour enregistrer une réclamation dans son dossier.</p>
        ) : (
          <div className="settings-form-grid">
            <label className="settings-field">
              <span className="settings-label">Canal</span>
              <select className="settings-select" value={channel} onChange={(e) => setChannel(e.target.value)}>
                <option>Email</option>
                <option>Téléphone</option>
                <option>Courrier</option>
                <option>Entretien</option>
              </select>
            </label>

            <label className="settings-field">
              <span className="settings-label">Responsable</span>
              <input className="settings-input" value={owner} onChange={(e) => setOwner(e.target.value)} />
            </label>

            <label className="settings-field settings-field-wide">
              <span className="settings-label">Objet</span>
              <input className="settings-input" value={subject} onChange={(e) => setSubject(e.target.value)} />
            </label>

            <label className="settings-field settings-field-wide">
              <span className="settings-label">Description</span>
              <textarea className="settings-textarea" value={description} onChange={(e) => setDescription(e.target.value)} />
            </label>

            <label className="settings-field">
              <span className="settings-label">Échéance de réponse</span>
              <input className="settings-input" type="date" value={responseDueDate} onChange={(e) => setResponseDueDate(e.target.value)} />
            </label>
          </div>
        )}

        <div className="complaints-actions">
          <button type="button" className="primary-cta" disabled={!selectedClient} onClick={handleCreateComplaint}>
            Enregistrer la réclamation
          </button>
        </div>
      </section>

      <section className="card complaints-list-card">
        <div className="section-title">
          <h2>Suivi</h2>
          <Badge>{`${filteredComplaints.length} réclamation${filteredComplaints.length > 1 ? 's' : ''}`}</Badge>
        </div>

        {filteredComplaints.length ? (
          <div className="complaints-list">
            {filteredComplaints.map((item) => (
              <article key={item.id} className="complaint-item">
                <div className="complaint-main">
                  <div className="document-title">{item.subject}</div>
                  <div className="document-helper">{item.description}</div>
                  <div className="complaint-meta">
                    <span className="pill">{item.channel}</span>
                    <span className="pill">{new Date(item.receivedAt).toLocaleDateString('fr-FR')}</span>
                    <span className="pill">{item.owner}</span>
                  </div>
                </div>

                <div className="complaint-actions">
                  <select
                    className="settings-select"
                    value={item.status}
                    onChange={(e) =>
                      setComplaintStatus(item.id, e.target.value as 'ouverte' | 'en_cours' | 'cloturee')
                    }
                  >
                    <option value="ouverte">Ouverte</option>
                    <option value="en_cours">En cours</option>
                    <option value="cloturee">Clôturée</option>
                  </select>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="section-subtitle">Aucune réclamation enregistrée pour ce périmètre.</p>
        )}
      </section>
    </>
  )
}

export default ComplaintsPage
