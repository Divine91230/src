import type { ReactNode } from 'react'

/* ─── MetricCard ─────────────────────────────────────────────── */
export function MetricCard({
  label,
  value,
  help,
  gold = false,
}: {
  label: string
  value: ReactNode
  help?: string
  gold?: boolean
}) {
  return (
    <div className={`metric-card${gold ? ' card-gold' : ''}`}>
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      {help ? <div className="metric-help">{help}</div> : null}
    </div>
  )
}

/* ─── MetricStrip ────────────────────────────────────────────── */
export function MetricStrip({
  items,
}: {
  items: Array<{ label: string; value: ReactNode }>
}) {
  return (
    <div className="metric-strip">
      {items.map((item) => (
        <div key={item.label} className="metric-strip-item">
          <div className="metric-strip-label">{item.label}</div>
          <div className="metric-strip-value">{item.value}</div>
        </div>
      ))}
    </div>
  )
}

/* ─── Badge ──────────────────────────────────────────────────── */
export function Badge({
  children,
  variant = 'default',
}: {
  children: React.ReactNode
  variant?: 'default' | 'gold' | 'client' | 'prospect' | 'danger'
}) {
  return (
    <span className={`badge badge-${variant}`}>{children}</span>
  )
}

/* ─── PageHero ───────────────────────────────────────────────── */
export function PageHero({
  title,
  description,
  kicker,
  actions,
}: {
  title: string
  description: string
  kicker?: string
  actions?: ReactNode
}) {
  return (
    <section className="hero">
      <div className="hero-kicker">{kicker ?? 'DCP Patrimoine'}</div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '24px' }}>
        <div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {actions && (
          <div style={{ flexShrink: 0 }}>{actions}</div>
        )}
      </div>
    </section>
  )
}

/* ─── FieldStateBadge ────────────────────────────────────────── */
export function FieldStateBadge({
  state,
}: {
  state: 'auto' | 'manual' | 'incomplete' | 'warning'
}) {
  const label =
    state === 'auto'       ? 'Auto'
    : state === 'manual'   ? 'Manuel'
    : state === 'warning'  ? 'À vérifier'
    : 'Incomplet'

  return (
    <span className={`field-state-badge ${state}`}>{label}</span>
  )
}

/* ─── SectionStatus ──────────────────────────────────────────── */
export function SectionStatus({
  title,
  value,
  tone = 'default',
}: {
  title: string
  value: string
  tone?: 'default' | 'success' | 'warning'
}) {
  return (
    <div className={`section-status ${tone}`}>
      <div className="section-status-label">{title}</div>
      <div className="section-status-value">{value}</div>
    </div>
  )
}

/* ─── InternalNoteBox ────────────────────────────────────────── */
export function InternalNoteBox({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div className="internal-note-box">
      <div className="internal-note-title">{title}</div>
      <div className="internal-note-content">{children}</div>
    </div>
  )
}

/* ─── SectionHeader ──────────────────────────────────────────── */
export function SectionHeader({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
}) {
  return (
    <div className="section-head">
      <div>
        <div className="section-title">{title}</div>
        {subtitle && <div className="section-subtitle">{subtitle}</div>}
      </div>
      {actions && <div>{actions}</div>}
    </div>
  )
}

/* ─── Card ───────────────────────────────────────────────────── */
export function Card({
  children,
  gold = false,
  style,
}: {
  children: ReactNode
  gold?: boolean
  style?: React.CSSProperties
}) {
  return (
    <div className={`card${gold ? ' card-gold' : ''}`} style={style}>
      {children}
    </div>
  )
}
