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
    <div className={`section-status premium-section-status ${tone}`}>
      <div className="section-status-label">{title}</div>
      <div className="section-status-value">{value}</div>
    </div>
  )
}
