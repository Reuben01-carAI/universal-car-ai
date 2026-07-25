export default function Home({ profile, onNavigate, question, setQuestion, onAsk, loading }) {
  const vehicleName = [profile?.year, profile?.make, profile?.model].filter(Boolean).join(" ") || "Add your vehicle";
  const actions = [
    ["chat", "AI Assistant", "Ask about faults, servicing or buying advice"],
    ["vehicle-health", "Vehicle Health", "Review systems, scores and maintenance priorities"],
    ["workshops", "Workshop Finder", "Search live car repair and service businesses on Google Maps"],
    ["history", "Maintenance History", "Record completed work and future servicing"],
    ["diagnosis", "Image Diagnosis", "Upload dashboard, tyre or damage photos"],
    ["sgcarmart", "Car Marketplace", "Open a used-car search"],
  ];

  return (
    <main className="page-shell">
      <section className="hero-panel">
        <div>
          <span className="eyebrow">UNIVERSAL CAR AI</span>
          <h1>Your complete automotive assistant.</h1>
          <p>One place for AI advice, vehicle records, health monitoring, workshops and maintenance planning.</p>
          <div className="hero-actions">
            <button className="gold-button" onClick={() => onNavigate("chat")}>Ask Universal Car AI</button>
            <button className="secondary-button" onClick={() => onNavigate("garage")}>Open My Garage</button>
          </div>
        </div>
        <article className="vehicle-mini-card">
          <span>Current vehicle</span>
          <h2>{vehicleName}</h2>
          <p>{profile?.mileage ? `${Number(profile.mileage).toLocaleString()} km` : "Mileage not added"}</p>
          <button onClick={() => onNavigate("garage")}>Manage profile →</button>
        </article>
      </section>

      <section className="home-grid">
        <article className="panel ask-panel">
          <span className="eyebrow">QUICK AI QUESTION</span>
          <h2>What can I help with?</h2>
          <textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows="5" placeholder="Example: Why does my steering wheel shake above 90 km/h?" />
          <button className="gold-button full-button" onClick={() => onAsk()} disabled={loading}>{loading ? "Thinking..." : "Ask AI"}</button>
        </article>
        <article className="panel overview-panel">
          <span className="eyebrow">PROJECT STATUS</span>
          <h2>Core systems connected</h2>
          <div className="status-list">
            <div><span>Vehicle profile</span><strong>{profile?.make ? "Ready" : "Add details"}</strong></div>
            <div><span>AI assistant</span><strong>Ready</strong></div>
            <div><span>Vehicle health</span><strong>Ready</strong></div>
            <div><span>Maintenance records</span><strong>Ready</strong></div>
          </div>
        </article>
      </section>

      <section className="section-block">
        <div className="section-heading"><div><span className="eyebrow">TOOLS</span><h2>Everything in one app</h2></div></div>
        <div className="action-grid">
          {actions.map(([page, title, description]) => (
            <button className="action-card" key={page} onClick={() => onNavigate(page)}>
              <span>{title.slice(0, 2).toUpperCase()}</span><h3>{title}</h3><p>{description}</p><small>Open →</small>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
