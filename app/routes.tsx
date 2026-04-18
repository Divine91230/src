import { Routes, Route, Navigate } from 'react-router-dom'
import { DashboardPage } from '../pages/dashboard/DashboardPage'
import { ClientsPage } from '../pages/clients/ClientsPage'
import { DiscoveryPage } from '../pages/discovery/DiscoveryPage'
import { AnalysisPage } from '../pages/analysis/AnalysisPage'
import { RecommendationsPage } from '../pages/recommendations/RecommendationsPage'
import { ScenariosPage } from '../pages/scenarios/ScenariosPage'
import { StrategyPage } from '../pages/strategy/StrategyPage'
import { ContractsComparisonPage } from '../pages/contracts/ContractsComparisonPage'
import { EnvelopesPage } from '../pages/envelopes/EnvelopesPage'
import { ReportsPage } from '../pages/reports/ReportsPage'
import { ReportDocumentsPage } from '../pages/reports/ReportDocumentsPage'
import { TasksPage } from '../pages/tasks/TasksPage'
import { SettingsPage } from '../pages/settings/SettingsPage'
import { PERSimulatorPage } from '../pages/simulators/PERSimulatorPage'
import { EnvelopeWithdrawalSimulatorPage } from '../pages/simulators/EnvelopeWithdrawalSimulatorPage'
import { FundingSourceComparisonPage } from '../pages/simulators/FundingSourceComparisonPage'
import { FollowUpPage } from '../pages/followup/FollowUpPage'
import { EnvelopeReorganizationPage } from '../pages/envelope-reorganization/EnvelopeReorganizationPage'
import { ComplaintsPage } from '../pages/compliance/ComplaintsPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<DashboardPage />} />
      <Route path="/clients" element={<ClientsPage />} />
      <Route path="/discovery" element={<DiscoveryPage />} />
      <Route path="/analysis" element={<AnalysisPage />} />
      <Route path="/recommendations" element={<RecommendationsPage />} />
      <Route path="/scenarios" element={<ScenariosPage />} />
      <Route path="/strategy" element={<StrategyPage />} />
      <Route path="/contracts-comparison" element={<ContractsComparisonPage />} />
      <Route path="/envelopes" element={<EnvelopesPage />} />
      <Route path="/envelope-reorganization" element={<EnvelopeReorganizationPage />} />
      <Route path="/reports" element={<ReportsPage />} />
      <Route path="/reports/documents" element={<ReportDocumentsPage />} />
      <Route path="/compliance/complaints" element={<ComplaintsPage />} />
      <Route path="/tasks" element={<TasksPage />} />
      <Route path="/simulators/per" element={<PERSimulatorPage />} />
      <Route path="/simulators/withdrawal" element={<EnvelopeWithdrawalSimulatorPage />} />
      <Route path="/simulators/funding-sources" element={<FundingSourceComparisonPage />} />
      <Route path="/followup" element={<FollowUpPage />} />
      <Route path="/settings" element={<SettingsPage />} />
    </Routes>
  )
}
