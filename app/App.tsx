import { AppShell } from '../components/layout/AppShell'
import { AppRoutes } from './routes'
import './app.css'

export function App() {  
  return (
    <AppShell>
      <AppRoutes />
    </AppShell>
  )
}
