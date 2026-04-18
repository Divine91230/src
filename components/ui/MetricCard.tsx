import type { ReactNode } from 'react'

export function MetricCard({ label, value, help }: { label: string; value: ReactNode; help?: string }) {
  return (
    <div className="metric-card premium-metric-card">
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      {help ? <div className="metric-help">{help}</div> : null}
    </div>
  )
}
