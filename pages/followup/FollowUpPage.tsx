import { useMemo, useState } from 'react'
import { PageHero } from '../../components/ui/PageHero'
import { buildFollowUpInsights } from '../../modules/followup/buildFollowUpInsights'

export function FollowUpPage() {
  const [targetMonthlySavings, setTargetMonthlySavings] = useState(1500)
  const [actualMonthlySavings, setActualMonthlySavings] = useState(1300)
  const [targetEmergencyMonths, setTargetEmergencyMonths] = useState(6)
  const [actualEmergencyMonths, setActualEmergencyMonths] = useState(4.5)

  const insights = useMemo(() => buildFollowUpInsights({
    targetMonthlySavings,
    actualMonthlySavings,
    targetEmergencyMonths,
    actualEmergencyMonths,
    targetRiskProfile: 'Équilibré',
    actualRiskProfile: 'Équilibré',
  }), [targetMonthlySavings, actualMonthlySavings, targetEmergencyMonths, actualEmergencyMonths])

  return (
    <>
      <PageHero title="Suivi dans le temps" description="Lecture d’avancement entre la cible patrimoniale et la situation observée." />
      <section className="card">
        <div className="section-title"><h2>Hypothèses de suivi</h2></div>
        <div className="form-grid">
          <label>Épargne cible<input type="number" value={targetMonthlySavings} onChange={(e) => setTargetMonthlySavings(Number(e.target.value) || 0)} /></label>
          <label>Épargne observée<input type="number" value={actualMonthlySavings} onChange={(e) => setActualMonthlySavings(Number(e.target.value) || 0)} /></label>
          <label>Réserve cible<input type="number" step="0.1" value={targetEmergencyMonths} onChange={(e) => setTargetEmergencyMonths(Number(e.target.value) || 0)} /></label>
          <label>Réserve observée<input type="number" step="0.1" value={actualEmergencyMonths} onChange={(e) => setActualEmergencyMonths(Number(e.target.value) || 0)} /></label>
        </div>
      </section>
      <section className="cards-grid">
        {insights.map((insight) => (
          <article key={insight.title} className="card">
            <div className="section-title"><h2>{insight.title}</h2><span className="badge">{insight.status}</span></div>
            <p>{insight.text}</p>
          </article>
        ))}
      </section>
    </>
  )
}
