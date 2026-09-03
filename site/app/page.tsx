export default function Home() {
  return (
    <main aria-label="Bearing rail workspace" className="app-shell">
      <header className="site-header">
        <div>
          <p className="eyebrow">Spatial accessibility bridge</p>
          <h1>Bearing</h1>
        </div>
        <p className="prototype-label">Engineering prototype</p>
      </header>

      <section className="workspace-shell" aria-label="Rail decision workspace">
        <aside className="panel" aria-labelledby="filters-title">
          <h2 id="filters-title">Find a seat</h2>
          <p>Filter by location, direction, comfort, and access needs.</p>
        </aside>
        <section className="panel" aria-labelledby="layout-title">
          <p className="eyebrow">Car 6 · Business Class</p>
          <h2 id="layout-title">Rail seat layout</h2>
          <p>The validated 60-seat spatial model will appear here.</p>
        </section>
        <aside className="panel" aria-labelledby="decision-title">
          <h2 id="decision-title">Your decision</h2>
          <p>Compare seats, review your selection, and confirm it yourself.</p>
        </aside>
      </section>
    </main>
  );
}
