export function FieldStateBadge({
  state,
}: {
  state: 'auto' | 'manual' | 'incomplete' | 'warning'
}) {
  const label =
    state === 'auto'
      ? 'Auto'
      : state === 'manual'
        ? 'Manuel'
        : state === 'warning'
          ? 'À vérifier'
          : 'Incomplet'

  return <span className={`field-state-badge premium-field-state-badge ${state}`}>{label}</span>
}
