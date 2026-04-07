function App() {
  return (
    <main className="shell">
      <section className="shell__panel" aria-labelledby="shell-title">
        <p className="shell__eyebrow">Stage 2 / Step 11</p>
        <h1 id="shell-title">FreelyRSS desktop shell is wired.</h1>
        <p className="shell__body">
          The Tauri host, React frontend, TypeScript compile path, and Vite build pipeline are
          connected. This shell is intentionally minimal so the next step can layer shared UI and
          the three-column reader layout on top of a verified desktop entry point.
        </p>
        <dl className="shell__facts">
          <div>
            <dt>Runtime</dt>
            <dd>Tauri v2 + Rust</dd>
          </div>
          <div>
            <dt>Frontend</dt>
            <dd>React 19 + TypeScript + Vite 8</dd>
          </div>
          <div>
            <dt>Mode</dt>
            <dd>Offline-capable app shell</dd>
          </div>
        </dl>
      </section>
    </main>
  )
}

export default App
