import type { PropsWithChildren } from 'react'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

export function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-shell">
        <Topbar />
        <div className="main-content">{children}</div>
      </main>
    </div>
  )
}
