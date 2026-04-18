import type { ReactNode } from 'react'

export function InternalNoteBox({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <div className="internal-note-box premium-internal-note-box">
      <div className="internal-note-title">{title}</div>
      <div className="internal-note-content">{children}</div>
    </div>
  )
}
