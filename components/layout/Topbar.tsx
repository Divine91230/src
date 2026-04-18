export function Topbar() {
  return (
    <header className="topbar">
      <div className="topbar-title">DCP Patrimoine</div>
      <div className="topbar-actions">
        <button className="topbar-icon-btn" title="Notifications" aria-label="Notifications">
          🔔
        </button>
        <button className="topbar-icon-btn" title="Recherche" aria-label="Recherche">
          🔍
        </button>
        <div className="topbar-avatar" title="Mon profil" aria-label="Mon profil">
          DC
        </div>
      </div>
    </header>
  )
}
