const appOrigin = process.env.NEXT_PUBLIC_APP_ORIGIN ?? 'http://localhost:3000';

export default function LandingPage() {
  return (
    <>
      <section className="hero" aria-label="Koode landing hero">
        <div className="blob a" aria-hidden="true" />
        <div className="blob b" aria-hidden="true" />
        <div className="blob c" aria-hidden="true" />

        <header className="topbar">
          <div className="wordmark">Koode</div>
          <nav aria-label="Landing">
            <a href="#how">How it works</a>
            <a href="#paths">Get started</a>
          </nav>
        </header>

        <div className="hero-main">
          <div>
            <p className="brand-hero">Koode</p>
            <h1 className="headline">Learn your way. Grow with Koode.</h1>
            <p className="support">
              Personal intelligence for human growth — pathways, challenges, projects, and a gentle
              tutor that helps you think, make, and choose for yourself. Coding is one path; curiosity
              is the point.
            </p>
            <div className="ctas" id="paths">
              <a className="btn btn-primary" href={`${appOrigin}/en/sign-in`}>
                I’m a teacher
              </a>
              <a className="btn btn-secondary" href={`${appOrigin}/en/sign-up`}>
                I’m learning alone
              </a>
              <a className="btn btn-accent" href={`${appOrigin}/en/join`}>
                Join my class
              </a>
            </div>
          </div>

          <div className="stage" aria-hidden="true">
            <div className="board">
              <div className="streak">🔥 5-day streak</div>
              <div className="path-row">
                <div className="node done">
                  <div className="dot" />
                  <div>
                    <strong>Discover</strong>
                    <span>Interest unlocked</span>
                  </div>
                </div>
                <div className="node active">
                  <div className="dot" />
                  <div>
                    <strong>Build & explain</strong>
                    <span>Your turn</span>
                  </div>
                </div>
                <div className="node">
                  <div className="dot" />
                  <div>
                    <strong>Reflect</strong>
                    <span>Grow next</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="mascot">
              <div className="beak" />
            </div>
          </div>
        </div>
      </section>

      <section className="section" id="how">
        <h2>Three ways in</h2>
        <p>
          Classroom energy + learning momentum — for independent thinkers, not just homework
          helpers.
        </p>
        <div className="paths">
          <article className="path-card">
            <div className="badge teacher">Teachers</div>
            <h3>Run a section</h3>
            <p>
              Create a class, share a code, watch learning-support signals — evidence of growth, not
              vanity dashboards.
            </p>
          </article>
          <article className="path-card">
            <div className="badge">Learners</div>
            <h3>Chase a pathway</h3>
            <p>
              Discover interests, take on challenges, build projects you understand, and keep a streak
              with a tutor that scaffolds — it doesn’t steal the thinking.
            </p>
          </article>
          <article className="path-card">
            <div className="badge join">Classmates</div>
            <h3>Join with a code</h3>
            <p>No email needed for classroom kids — secret words + section code, Code.org-style.</p>
          </article>
        </div>
      </section>
    </>
  );
}
