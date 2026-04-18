import type { ReactNode } from 'react'

export function MetricStrip({ items }: { items: Array<{ label: string; value: ReactNode }> }) {
  return (
    <div className="metric-strip premium-metric-strip">
      {items.map((item) => (
        <div key={item.label} className="metric-strip-item premium-metric-strip-item">
          <div className="metric-strip-label">{item.label}</div>
          <div className="metric-strip-value">{item.value}</div>
        </div>
      ))}
    </div>
  )
}
