import type { Dispatch, SetStateAction } from 'react'
import { Field, buttonStyle, formGridStyle, inputStyle, subtleButtonStyle } from '../components/Field'
import { generateId, getTotalAssets, getLiquidAssetsTotal } from '../discovery.helpers'
import type { AssetCategory, AssetLine, ContractQuality, AssetHolder, DiscoveryFormState, EnvelopeType } from '../discovery.types'
import { buildEmptyAssetLine } from '../discovery.initial'

// ─── Constantes ───────────────────────────────────────────────────────────────
const envelopeOptions: EnvelopeType[] = [
  'Compte courant', 'Livret A', 'LDDS', 'LEP', 'PEL', 'Compte à terme',
  'Assurance-vie', 'PER', 'PEA', 'CTO', 'Épargne salariale', 'SCPI', 'Autre',
]

const categoryOptions: AssetCategory[] = [
  'Liquidités', 'Financier', 'Immobilier', 'Professionnel', 'Autre',
]

const holderOptions: AssetHolder[] = [
  'Souscripteur principal', 'Conjoint', 'Co-souscription', 'Autre',
]

const contractQualityOptions: ContractQuality[] = [
  'Non évalué', 'Bon', 'Moyen', 'À revoir',
]

// Plafond légaux 2026
const PLAFONDS: Partial<Record<EnvelopeType, number>> = {
  'PEA': 150000,
  'Livret A': 22950,
  'LDDS': 12000,
  'LEP': 10000,
  'PEL': 61200,
}

// Enveloppes qui sont des liquidités réglementées
const LIQUIDITY_TYPES: EnvelopeType[] = [
  'Compte courant', 'Livret A', 'LDDS', 'LEP', 'PEL', 'Compte à terme',
]

// Enveloppes financières qui ont une fiscalité à la sortie
const FINANCIAL_TYPES: EnvelopeType[] = [
  'Assurance-vie', 'PER', 'PEA', 'CTO', 'Épargne salariale', 'SCPI',
]

// Enveloppes avec assureur (AV, PER)
const INSURER_TYPES: EnvelopeType[] = ['Assurance-vie', 'PER']

// Enveloppes avec fonds euros / UC
const AV_PER_TYPES: EnvelopeType[] = ['Assurance-vie', 'PER']

// ─── Helpers ──────────────────────────────────────────────────────────────────
function calculateAnteriority(openingDate: string): string {
  if (!openingDate) return ''
  const opening = new Date(openingDate)
  if (isNaN(opening.getTime())) return ''
  const now = new Date()
  const years = now.getFullYear() - opening.getFullYear()
  const months = now.getMonth() - opening.getMonth()
  const totalMonths = years * 12 + months
  const y = Math.floor(totalMonths / 12)
  const m = totalMonths % 12
  if (y === 0) return `${m} mois`
  if (m === 0) return `${y} an${y > 1 ? 's' : ''}`
  return `${y} an${y > 1 ? 's' : ''} et ${m} mois`
}

function getAVFiscalStatus(openingDate: string): { label: string; color: string } {
  if (!openingDate) return { label: '', color: '' }
  const opening = new Date(openingDate)
  if (isNaN(opening.getTime())) return { label: '', color: '' }
  const years = (Date.now() - opening.getTime()) / (1000 * 60 * 60 * 24 * 365)
  if (years >= 8) return { label: '✓ > 8 ans — Abattement fiscal acquis', color: 'var(--sage-500)' }
  if (years >= 5) return { label: '~ 5-8 ans — Pas encore d\'abattement', color: 'var(--amber-500)' }
  return { label: '< 5 ans — Fiscalité pleine', color: 'var(--rose-500)' }
}

function getPEAStatus(openingDate: string, contributions: number): { fiscal: string; plafond: string; fiscalColor: string } {
  const plafond = PLAFONDS['PEA'] ?? 150000
  const restant = Math.max(0, plafond - contributions)
  let fiscal = ''
  let fiscalColor = ''
  if (openingDate) {
    const years = (Date.now() - new Date(openingDate).getTime()) / (1000 * 60 * 60 * 24 * 365)
    if (years >= 5) { fiscal = '✓ > 5 ans — Exonération IR acquise'; fiscalColor = 'var(--sage-500)' }
    else { fiscal = `~ ${years.toFixed(1)} ans — Exonération IR après 5 ans`; fiscalColor = 'var(--amber-500)' }
  }
  const plafondLabel = restant <= 0
    ? '🔴 Plafond atteint — envisager CTO'
    : restant < 10000
    ? `⚠️ Capacité restante : ${restant.toLocaleString('fr-FR')} €`
    : `Capacité restante : ${restant.toLocaleString('fr-FR')} €`
  return { fiscal, plafond: plafondLabel, fiscalColor }
}

function isHighFees(entryFees: number, managementFees: number, envelopeType: EnvelopeType): string | null {
  if (envelopeType === 'Assurance-vie' || envelopeType === 'PER') {
    if (entryFees > 2) return `⚠️ Frais sur versements élevés (${entryFees}% > 2%) — envisager un nouveau contrat`
    if (managementFees > 1) return `⚠️ Frais de gestion élevés (${managementFees}% > 1%) — vérifier la compétitivité`
  }
  if (envelopeType === 'SCPI') {
    if (entryFees > 10) return `⚠️ Frais de souscription SCPI élevés (${entryFees}%)`
  }
  return null
}

function getInsuranceAlert(amount: number, insurerName: string, allAssets: AssetLine[]): string | null {
  if (!insurerName) return null
  const totalWithInsurer = allAssets
    .filter((a) => (a.envelopeType === 'Assurance-vie' || a.envelopeType === 'PER') &&
      a.insurerName?.toLowerCase() === insurerName.toLowerCase())
    .reduce((s, a) => s + Number(a.amount || 0), 0)
  if (totalWithInsurer > 70000) {
    return `⚠️ ${totalWithInsurer.toLocaleString('fr-FR')} € chez ${insurerName} (> 70 000 € garantis) — envisager une diversification d'assureur`
  }
  return null
}

// ─── Composant patch local ────────────────────────────────────────────────────
function patchAsset(
  id: string,
  patch: Partial<AssetLine>,
  setState: Dispatch<SetStateAction<DiscoveryFormState>>,
) {
  setState((current) => ({
    ...current,
    assets: current.assets.map((a) => a.id === id ? { ...a, ...patch } : a),
  }))
}

// ─── Section principale ───────────────────────────────────────────────────────
export function AssetsEnvelopesSection({
  state,
  setState,
}: {
  state: DiscoveryFormState
  setState: Dispatch<SetStateAction<DiscoveryFormState>>
}) {
  const totalAssets = getTotalAssets(state.assets)
  const totalLiquid = getLiquidAssetsTotal(state.assets)

  // Surplus liquidités mobilisable (après réserve 6 mois)
  const monthlyCharges = (state.charges ?? [])
    .filter((c) => c.includedInBudget)
    .reduce((s, c) => s + Number(c.monthlyAmount || 0), 0)
  const reserveCible = monthlyCharges * 6
  const surplusLiquidites = Math.max(0, totalLiquid - reserveCible)

  function addAsset() {
    setState((current) => ({
      ...current,
      assets: [
        ...current.assets,
        buildEmptyAssetLine({ id: generateId('ast') }),
      ],
    }))
  }

  function removeAsset(id: string) {
    setState((current) => ({
      ...current,
      assets: current.assets.filter((a) => a.id !== id),
    }))
  }

  return (
    <>
      {/* ── Métriques synthèse ──────────────────────────────────────────────── */}
      <section className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Total des actifs</div>
          <div className="metric-value">{totalAssets.toLocaleString('fr-FR')} €</div>
          <div className="metric-help">Base patrimoniale déclarée</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Liquidités totales</div>
          <div className="metric-value">{totalLiquid.toLocaleString('fr-FR')} €</div>
          <div className="metric-help">Épargne de précaution et disponible</div>
        </div>
        {monthlyCharges > 0 && (
          <div className="metric-card">
            <div className="metric-label">Réserve cible (6 mois)</div>
            <div className="metric-value">{reserveCible.toLocaleString('fr-FR')} €</div>
            <div className="metric-help">Intouchable — socle de sécurité</div>
          </div>
        )}
        {monthlyCharges > 0 && surplusLiquidites > 0 && (
          <div className="metric-card" style={{ border: '1px solid var(--gold-200)', background: 'var(--gold-50)' }}>
            <div className="metric-label" style={{ color: 'var(--gold-600)' }}>Surplus mobilisable</div>
            <div className="metric-value">{surplusLiquidites.toLocaleString('fr-FR')} €</div>
            <div className="metric-help">Liquidités au-delà de la réserve cible — à utiliser en priorité</div>
          </div>
        )}
      </section>

      {/* ── Liste des actifs ────────────────────────────────────────────────── */}
      <section className="card">
        <div className="section-title">
          <h2>Actifs et enveloppes</h2>
          <button type="button" style={buttonStyle} onClick={addAsset}>+ Ajouter une ligne</button>
        </div>
        <p style={{ fontSize: 13.5, color: 'var(--muted)', marginBottom: 16 }}>
          Renseigne le type d'enveloppe, le montant et les informations financières. Les champs avancés (antériorité, frais, assureur) permettront au logiciel de préconiser arbitrage, rachat ou ouverture d'un nouveau contrat.
        </p>

        <ul className="list" style={{ gap: 24, display: 'grid' }}>
          {state.assets.map((line, index) => {
            const isFinancial = FINANCIAL_TYPES.includes(line.envelopeType)
            const isLiquidity = LIQUIDITY_TYPES.includes(line.envelopeType)
            const isAVOrPER = AV_PER_TYPES.includes(line.envelopeType)
            const isAV = line.envelopeType === 'Assurance-vie'
            const isPEA = line.envelopeType === 'PEA'
            const isImmobilier = line.category === 'Immobilier'
            const anteriorite = calculateAnteriority(line.openingDate)
            const avFiscal = isAV ? getAVFiscalStatus(line.openingDate) : null
            const peaStatus = isPEA ? getPEAStatus(line.openingDate, line.totalContributions) : null
            const feesAlert = isFinancial ? isHighFees(line.entryFees, line.managementFees, line.envelopeType) : null
            const insurerAlert = isAVOrPER ? getInsuranceAlert(line.amount, line.insurerName, state.assets) : null

            return (
              <li key={line.id} style={{ border: '1px solid var(--line)', borderRadius: 'var(--r-xl)', padding: 'var(--space-5)', background: 'var(--surface)' }}>
                {/* En-tête */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                  <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: 'var(--ink-800)' }}>
                    {line.label || `Actif ${index + 1}`}
                    {line.envelopeType && (
                      <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--muted)', marginLeft: 8 }}>
                        — {line.envelopeType}
                      </span>
                    )}
                  </h3>
                  <button type="button" style={subtleButtonStyle} onClick={() => removeAsset(line.id)}>Supprimer</button>
                </div>

                {/* ── Champs de base ────────────────────────────────────── */}
                <div style={{ ...formGridStyle, marginBottom: 'var(--space-4)' }}>
                  <Field label="Libellé">
                    <input value={line.label} onChange={(e) => patchAsset(line.id, { label: e.target.value }, setState)} style={inputStyle} placeholder="Ex: AV Sogécap, PEA BNP..." />
                  </Field>
                  <Field label="Catégorie">
                    <select value={line.category} onChange={(e) => patchAsset(line.id, { category: e.target.value as AssetCategory }, setState)} style={inputStyle}>
                      {categoryOptions.map((opt) => <option key={opt}>{opt}</option>)}
                    </select>
                  </Field>
                  <Field label="Type d'enveloppe">
                    <select value={line.envelopeType} onChange={(e) => patchAsset(line.id, { envelopeType: e.target.value as EnvelopeType }, setState)} style={inputStyle}>
                      {envelopeOptions.map((opt) => <option key={opt}>{opt}</option>)}
                    </select>
                  </Field>
                  <Field label="Montant (€)">
                    <input type="number" value={line.amount || ''} onChange={(e) => patchAsset(line.id, { amount: Number(e.target.value) }, setState)} style={inputStyle} placeholder="0" />
                  </Field>
                  <Field label="Établissement">
                    <input value={line.institution} onChange={(e) => patchAsset(line.id, { institution: e.target.value }, setState)} style={inputStyle} placeholder="Ex: BNP, Crédit Agricole..." />
                  </Field>
                  <Field label="Titulaire">
                    <select value={line.holder} onChange={(e) => patchAsset(line.id, { holder: e.target.value as any }, setState)} style={inputStyle}>
                      {holderOptions.map((opt) => <option key={opt}>{opt}</option>)}
                    </select>
                  </Field>
                  {!isImmobilier && (
                    <Field label="Disponible ?">
                      <select value={line.available ? 'Oui' : 'Non'} onChange={(e) => patchAsset(line.id, { available: e.target.value === 'Oui' }, setState)} style={inputStyle}>
                        <option>Oui</option><option>Non</option>
                      </select>
                    </Field>
                  )}
                </div>

                {/* ── Champs financiers avancés (Financier + Liquidités) ── */}
                {(isFinancial || isLiquidity) && !isImmobilier && (
                  <div style={{ borderTop: '1px solid var(--line)', paddingTop: 'var(--space-4)', marginTop: 'var(--space-2)' }}>
                    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--gold-600)', marginBottom: 'var(--space-3)' }}>
                      Informations financières
                    </div>

                    <div style={{ ...formGridStyle, marginBottom: 'var(--space-3)' }}>
                      {/* Date d'ouverture — tous sauf compte courant */}
                      {line.envelopeType !== 'Compte courant' && (
                        <Field
                          label="Date d'ouverture"
                          hint={anteriorite ? `Antériorité : ${anteriorite}` : 'Permet de calculer l\'antériorité fiscale'}
                        >
                          <input
                            type="date"
                            value={line.openingDate}
                            onChange={(e) => patchAsset(line.id, { openingDate: e.target.value }, setState)}
                            style={inputStyle}
                          />
                        </Field>
                      )}

                      {/* Versements totaux — pour les enveloppes avec fiscalité rachat */}
                      {isFinancial && (
                        <Field
                          label="Versements totaux (€)"
                          hint="Permet de calculer la quote-part de gains pour la fiscalité des rachats"
                        >
                          <input
                            type="number"
                            value={line.totalContributions || ''}
                            onChange={(e) => patchAsset(line.id, { totalContributions: Number(e.target.value) }, setState)}
                            style={inputStyle}
                            placeholder="0"
                          />
                        </Field>
                      )}

                      {/* Frais sur versements — AV, PER, SCPI */}
                      {(isAVOrPER || line.envelopeType === 'SCPI') && (
                        <Field
                          label="Frais sur versements (%)"
                          hint="Seuil de vigilance : > 2 % pour AV/PER"
                        >
                          <input
                            type="number"
                            step="0.1"
                            value={line.entryFees || ''}
                            onChange={(e) => patchAsset(line.id, { entryFees: Number(e.target.value) }, setState)}
                            style={inputStyle}
                            placeholder="Ex: 1.5"
                          />
                        </Field>
                      )}

                      {/* Frais de gestion — AV, PER */}
                      {isAVOrPER && (
                        <Field
                          label="Frais de gestion annuels (%)"
                          hint="Seuil de vigilance : > 1 % par an"
                        >
                          <input
                            type="number"
                            step="0.1"
                            value={line.managementFees || ''}
                            onChange={(e) => patchAsset(line.id, { managementFees: Number(e.target.value) }, setState)}
                            style={inputStyle}
                            placeholder="Ex: 0.8"
                          />
                        </Field>
                      )}

                      {/* Assureur — AV, PER */}
                      {isAVOrPER && (
                        <Field
                          label="Nom de l'assureur"
                          hint="Permet de détecter une concentration > 70 000 € chez le même assureur"
                        >
                          <input
                            value={line.insurerName}
                            onChange={(e) => patchAsset(line.id, { insurerName: e.target.value }, setState)}
                            style={inputStyle}
                            placeholder="Ex: Sogécap, Cardif, Generali..."
                          />
                        </Field>
                      )}

                      {/* Qualité du contrat — AV, PER */}
                      {isAVOrPER && (
                        <Field
                          label="Qualité du contrat"
                          hint="Bon → arbitrage interne préféré / À revoir → envisager nouveau contrat"
                        >
                          <select
                            value={line.contractQuality}
                            onChange={(e) => patchAsset(line.id, { contractQuality: e.target.value as ContractQuality }, setState)}
                            style={inputStyle}
                          >
                            {contractQualityOptions.map((opt) => <option key={opt}>{opt}</option>)}
                          </select>
                        </Field>
                      )}
                    </div>

                    {/* Fonds euros / UC — AV (pleine largeur, hors grille) */}
                    {isAV && (
                      <div style={{
                        gridColumn: '1 / -1',
                        display: 'flex',
                        gap: 'var(--space-6)',
                        flexWrap: 'wrap',
                        marginBottom: 'var(--space-3)',
                        padding: 'var(--space-3) var(--space-4)',
                        background: 'var(--cream-100)',
                        borderRadius: 'var(--r-md)',
                        border: '1px solid var(--line)',
                      }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                          <input
                            type="checkbox"
                            checked={line.hasEuroFund}
                            onChange={(e) => patchAsset(line.id, { hasEuroFund: e.target.checked }, setState)}
                            style={{ width: 16, height: 16, flexShrink: 0 }}
                          />
                          <span>Fonds euros disponible</span>
                        </label>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13.5, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                          <input
                            type="checkbox"
                            checked={line.hasUC}
                            onChange={(e) => patchAsset(line.id, { hasUC: e.target.checked }, setState)}
                            style={{ width: 16, height: 16, flexShrink: 0 }}
                          />
                          <span>Unités de compte disponibles</span>
                        </label>
                      </div>
                    )}

                    {/* Réserve de sécurité — Liquidités (pleine largeur, hors grille) */}
                    {isLiquidity && (
                      <div style={{
                        gridColumn: '1 / -1',
                        marginBottom: 'var(--space-3)',
                        padding: 'var(--space-3) var(--space-4)',
                        background: 'var(--sage-100)',
                        borderRadius: 'var(--r-md)',
                        border: '1px solid rgba(107,143,113,0.22)',
                      }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13.5, cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={line.isEmergencyFund}
                            onChange={(e) => patchAsset(line.id, { isEmergencyFund: e.target.checked }, setState)}
                            style={{ width: 16, height: 16, flexShrink: 0 }}
                          />
                          <span style={{ color: 'var(--ink-700)' }}>
                            Réserve de sécurité dédiée — à ne pas mobiliser dans le projet
                          </span>
                        </label>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Alertes automatiques ──────────────────────────────── */}
                {(avFiscal?.label || peaStatus || feesAlert || insurerAlert) && (
                  <div style={{ borderTop: '1px solid var(--line)', paddingTop: 'var(--space-4)', marginTop: 'var(--space-2)', display: 'grid', gap: 'var(--space-2)' }}>

                    {/* Statut fiscal AV */}
                    {avFiscal?.label && (
                      <div style={{ fontSize: 12.5, color: avFiscal.color, fontWeight: 600, padding: '6px 10px', background: 'var(--cream-100)', borderRadius: 'var(--r-md)' }}>
                        {avFiscal.label}
                      </div>
                    )}

                    {/* Statut PEA */}
                    {peaStatus?.fiscal && (
                      <div style={{ fontSize: 12.5, color: peaStatus.fiscalColor, fontWeight: 600, padding: '6px 10px', background: 'var(--cream-100)', borderRadius: 'var(--r-md)' }}>
                        {peaStatus.fiscal}
                      </div>
                    )}
                    {peaStatus?.plafond && (
                      <div style={{ fontSize: 12.5, color: 'var(--ink-600)', padding: '6px 10px', background: 'var(--cream-100)', borderRadius: 'var(--r-md)' }}>
                        {peaStatus.plafond}
                      </div>
                    )}

                    {/* Alerte frais */}
                    {feesAlert && (
                      <div style={{ fontSize: 12.5, color: 'var(--amber-500)', fontWeight: 600, padding: '6px 10px', background: 'var(--amber-100)', borderRadius: 'var(--r-md)' }}>
                        {feesAlert}
                      </div>
                    )}

                    {/* Alerte diversification assureurs */}
                    {insurerAlert && (
                      <div style={{ fontSize: 12.5, color: 'var(--amber-500)', fontWeight: 600, padding: '6px 10px', background: 'var(--amber-100)', borderRadius: 'var(--r-md)' }}>
                        {insurerAlert}
                      </div>
                    )}

                    {/* Alerte contrat à revoir */}
                    {isAVOrPER && line.contractQuality === 'À revoir' && (
                      <div style={{ fontSize: 12.5, color: 'var(--rose-500)', fontWeight: 600, padding: '6px 10px', background: 'var(--rose-100)', borderRadius: 'var(--r-md)' }}>
                        🔴 Contrat marqué "À revoir" — la stratégie préconisera un rachat et l'ouverture d'un nouveau contrat plutôt qu'un renforcement.
                      </div>
                    )}

                    {/* Info arbitrage interne possible */}
                    {isAV && line.contractQuality === 'Bon' && line.openingDate && (
                      <div style={{ fontSize: 12.5, color: 'var(--sage-500)', fontWeight: 500, padding: '6px 10px', background: 'var(--sage-100)', borderRadius: 'var(--r-md)' }}>
                        ✓ Bon contrat — la stratégie préconisera un arbitrage interne plutôt qu'un rachat.
                      </div>
                    )}
                  </div>
                )}

                {/* Commentaire */}
                <div style={{ marginTop: 'var(--space-3)' }}>
                  <Field label="Commentaire">
                    <input
                      value={line.comment}
                      onChange={(e) => patchAsset(line.id, { comment: e.target.value }, setState)}
                      style={inputStyle}
                      placeholder="Notes libres..."
                    />
                  </Field>
                </div>
              </li>
            )
          })}
        </ul>

        {state.assets.length === 0 && (
          <div style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--muted)' }}>
            <div style={{ fontSize: 28, marginBottom: 'var(--space-3)', opacity: 0.4 }}>◎</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--ink-700)', marginBottom: 'var(--space-2)' }}>Aucun actif renseigné</div>
            <p style={{ fontSize: 13.5 }}>Ajoute les actifs et enveloppes du client pour alimenter l'analyse patrimoniale.</p>
          </div>
        )}
      </section>
    </>
  )
}
