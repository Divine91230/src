import type { CSSProperties, ReactNode } from 'react'

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <div className="metric-label" style={{ marginBottom: 8 }}>
        {label}
      </div>
      {children}
      {hint ? <div className="metric-help">{hint}</div> : null}
    </div>
  )
}

export const inputStyle: CSSProperties = {
  width: '100%',
  padding: '12px 14px',
  borderRadius: 14,
  border: '1px solid rgba(127,114,95,0.22)',
  background: 'rgba(255,255,255,0.82)',
  color: 'inherit',
  outline: 'none',
}

export const areaStyle: CSSProperties = {
  ...inputStyle,
  minHeight: 120,
  resize: 'vertical',
}

export const formGridStyle: CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 14,
}

export const buttonStyle: CSSProperties = {
  padding: '10px 14px',
  borderRadius: 12,
  border: '1px solid rgba(178,135,71,0.28)',
  background: 'rgba(178,135,71,0.14)',
  color: 'inherit',
  cursor: 'pointer',
  fontWeight: 600,
}

export const subtleButtonStyle: CSSProperties = {
  padding: '10px 14px',
  borderRadius: 12,
  border: '1px solid rgba(127,114,95,0.18)',
  background: 'rgba(255,255,255,0.72)',
  color: 'inherit',
  cursor: 'pointer',
}
