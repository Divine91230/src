import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PageHero } from '../../components/ui/PageHero'
import { Badge } from '../../components/ui/Badge'
import { MetricCard } from '../../components/ui/MetricCard'
import { useCabinetStore } from '../../store/useCabinetStore'

type ClientFilter = 'all' | 'client' | 'prospect' | 'archived'
type ClientSort = 'recent' | 'priority' | 'progress' | 'name'

function normalize(value: string) {
  return String(value ?? '').trim().toLowerCase()
}

function priorityRank(priority: string) {
  if (priority === 'Haute') return 3
  if (priority === 'Moyenne') return 2
  return 1
}

function getStatusTone(status: string, archived: boolean) {
  if (archived) return 'light'
  if (status === 'Client') return 'client'
  return 'prospect'
}

export function ClientsPage() {
  const navigate = useNavigate()

  const clients = useCabinetStore((state) => state.clients)
  const selectedClient = useCabinetStore((state) => state.selectedClient)
  const setSelectedClientById = useCabinetStore((state) => state.setSelectedClientById)
  const createNewClient = useCabinetStore((state) => state.createNewClient)
  const archiveClient = useCabinetStore((state) => state.archiveClient)
  const restoreClient = useCabinetStore((state) => state.restoreClient)
  const convertProspectToClient = useCabinetStore((state) => state.convertProspectToClient)

  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<ClientFilter>('all')
  const [sortBy, setSortBy] = useState<ClientSort>('recent')

  const visibleClients = useMemo(() => {
    let items = [...clients].filter((item) => !item.isLinkedPerson)

    if (filter === 'client') items = items.filter((item) => item.status === 'Client' && !item.archived)
    if (filter === 'prospect') items = items.filter((item) => item.status === 'Prospect' && !item.archived)
    if (filter === 'archived') items = items.filter((item) => item.archived)

    const search = normalize(query)
    if (search) {
      items = items.filter((item) =>
        [
          item.fullName,
          item.objective,
          item.progress,
          item.nextAction,
          item.status,
        ]
          .map(normalize)
          .some((value) => value.includes(search)),
      )
    }

    items.sort((a, b) => {
      if (sortBy === 'name') return a.fullName.localeCompare(b.fullName)
      if (sortBy === 'priority') return priorityRank(b.priority) - priorityRank(a.priority)
      if (sortBy === 'progress') return a.progress.localeCompare(b.progress)
      return Number(b.id) - Number(a.id)
    })

    return items
  }, [clients, filter, query, sortBy])

  const kpis = useMemo(() => {
    const rootClients = clients.filter((item) => !item.isLinkedPerson)
    return {
      clients: rootClients.filter((item) => item.status === 'Client' && !item.archived).length,
      prospects: rootClients.filter((item) => item.status === 'Prospect' && !item.archived).length,
      incomplete: rootClients.filter((item) => item.completeness === 'Incomplet' && !item.archived).length,
      archived: rootClients.filter((item) => item.archived).length,
    }
  }, [clients])

  return (
    <>
      <PageHero
        title="Clients"
        description="Pilotage des dossiers, suivi des prospects et accès rapide aux fiches actives."
      />

      <section className="clients-refonte-toolbar card">
        <div className="clients-refonte-toolbar-left">
          <label className="clients-refonte-search">
            <span>Recherche</span>
            <input
              type="text"
              placeholder="Nom, objectif, prochaine action..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>

          <label className="clients-refonte-select">
            <span>Filtre</span>
            <select value={filter} onChange={(e) => setFilter(e.target.value as ClientFilter)}>
              <option value="all">Tous</option>
              <option value="client">Clients</option>
              <option value="prospect">Prospects</option>
              <option value="archived">Archivés</option>
            </select>
          </label>

          <label className="clients-refonte-select">
            <span>Trier par</span>
            <select value={sortBy} onChange={(e) => setSortBy(e.target.value as ClientSort)}>
              <option value="recent">Plus récents</option>
              <option value="priority">Priorité</option>
              <option value="progress">Avancement</option>
              <option value="name">Nom</option>
            </select>
          </label>
        </div>

        <div className="clients-refonte-toolbar-right">
          <button
            type="button"
            className="primary-cta"
            onClick={() => {
              createNewClient()
              navigate('/discovery')
            }}
          >
            + Nouveau client
          </button>
        </div>
      </section>

      <section className="metrics-grid">
        <MetricCard label="Clients" value={String(kpis.clients)} help="Dossiers actifs" />
        <MetricCard label="Prospects" value={String(kpis.prospects)} help="À qualifier ou convertir" />
        <MetricCard label="Dossiers incomplets" value={String(kpis.incomplete)} help="À compléter" />
        <MetricCard label="Archivés" value={String(kpis.archived)} help="Historique cabinet" />
      </section>

      <section className="clients-refonte-list">
        {visibleClients.length ? (
          visibleClients.map((client) => {
            const active = selectedClient?.id === client.id

            return (
              <article key={client.id} className={`clients-refonte-card${active ? ' active' : ''}`}>
                <div
                  className="clients-refonte-main"
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedClientById(client.id)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      setSelectedClientById(client.id)
                    }
                  }}
                >
                  <div className="clients-refonte-topline">
                    <h2>{client.fullName}</h2>

                    <div className="clients-refonte-badges">
                      <span className={`clients-status-pill ${getStatusTone(client.status, client.archived)}`}>
                        {client.archived ? 'Archivé' : client.status}
                      </span>
                      <Badge>{client.priority}</Badge>
                    </div>
                  </div>

                  <p className="clients-refonte-objective">
                    {client.objective || 'Objectif à préciser'}
                  </p>

                  <div className="clients-refonte-meta">
                    <div>
                      <span className="clients-refonte-label">Avancement</span>
                      <strong>{client.progress || 'À préciser'}</strong>
                    </div>

                    <div>
                      <span className="clients-refonte-label">Dernier contact</span>
                      <strong>{client.lastContact || '—'}</strong>
                    </div>

                    <div>
                      <span className="clients-refonte-label">Dossier</span>
                      <strong>{client.completeness}</strong>
                    </div>
                  </div>
                </div>

                <div className="clients-refonte-side">
                  <div>
                    <span className="clients-refonte-label">Prochaine action</span>
                    <p>{client.nextAction || 'Aucune action renseignée'}</p>
                  </div>

                  <div className="clients-refonte-side-actions">
                    {client.status === 'Prospect' && !client.archived ? (
                      <button
                        type="button"
                        className="ghost-cta"
                        onClick={() => convertProspectToClient(client.id)}
                      >
                        Passer en client
                      </button>
                    ) : null}

                    {!client.archived ? (
                      <button
                        type="button"
                        className="ghost-cta"
                        onClick={() => archiveClient(client.id)}
                      >
                        Archiver
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="ghost-cta"
                        onClick={() => restoreClient(client.id)}
                      >
                        Restaurer
                      </button>
                    )}

                    <button
                      type="button"
                      className="clients-refonte-open"
                      onClick={() => setSelectedClientById(client.id)}
                    >
                      <span>{active ? 'Dossier actif' : 'Ouvrir le dossier'}</span>
                      <span className="clients-refonte-arrow">›</span>
                    </button>
                  </div>
                </div>
              </article>
            )
          })
        ) : (
          <section className="card clients-refonte-empty">
            <h2>Aucun dossier à afficher</h2>
            <p>Affiner les filtres ou créer un nouveau client pour commencer.</p>
          </section>
        )}
      </section>
    </>
  )
}

export default ClientsPage