const appOrigin = process.env.NEXT_PUBLIC_APP_ORIGIN ?? 'http://localhost:3000';

const pathways = [
  { badge: 'Money', title: 'Trade & money sense', blurb: 'Budgets, fair deals, and why prices move — practise with real mini-missions.' },
  { badge: 'Nature', title: 'Wildlife & habitats', blurb: 'Protect local species, map habitats, and argue for what a place needs to thrive.' },
  { badge: 'Civic', title: 'Clean streets, civic sense', blurb: 'Shared spaces, waste, and neighbour care — small acts that scale into citizenship.' },
  { badge: 'Biz', title: 'Start a tiny business', blurb: 'Spot a need, price a service, serve a customer, and keep honest books.' },
  { badge: 'Care', title: 'First aid & calm under pressure', blurb: 'Check, call, care — practise safe responses before an emergency is real.' },
  { badge: 'Food', title: 'Cook with judgement', blurb: 'Plan a meal, waste less, feed people well — food & health as everyday competence.' },
  { badge: 'Teach', title: 'Teach what you know', blurb: 'Explain a skill to a peer, design a mini-lesson, and learn by teaching.' },
  { badge: 'Make', title: 'Software when it helps', blurb: 'Build a tool only when a real problem needs one — code is a craft, not the product pitch.' },
] as const;

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
            <a href="#worlds">Pathways</a>
            <a href="#how">How it works</a>
            <a href="#start">Get started</a>
          </nav>
        </header>

        <div className="hero-main">
          <div>
            <p className="brand-hero">Koode</p>
            <h1 className="headline">Learn life. Practise judgement. Grow capable.</h1>
            <p className="support">
              Personal intelligence for human growth — money sense, wildlife care, civic duty,
              cooking, first aid, business, teaching, and making tools when they serve a real need.
              Inspired by how strong school systems teach health, citizenship, and sustainability
              together — not as a coding course with a mascot.
            </p>
            <div className="ctas" id="start">
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
                    <strong>First aid drill</strong>
                    <span>Challenge cleared</span>
                  </div>
                </div>
                <div className="node active">
                  <div className="dot" />
                  <div>
                    <strong>Wildlife walk map</strong>
                    <span>Your turn</span>
                  </div>
                </div>
                <div className="node">
                  <div className="dot" />
                  <div>
                    <strong>Street clean plan</strong>
                    <span>Up next</span>
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

      <section className="section" id="worlds">
        <h2>Worlds you can chase</h2>
        <p>
          Pick a real-world lane. Koode gives pathways, challenges, and a gentle tutor — you keep
          the thinking, the making, and the responsibility.
        </p>
        <div className="worlds">
          {pathways.map((item) => (
            <article key={item.title} className="path-card">
              <div className="badge">{item.badge}</div>
              <h3>{item.title}</h3>
              <p>{item.blurb}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="section" id="how">
        <h2>Three ways in</h2>
        <p>Classroom energy + learning momentum — for people who want to become more capable in life.</p>
        <div className="paths">
          <article className="path-card">
            <div className="badge teacher">Teachers</div>
            <h3>Run a section</h3>
            <p>
              Create a class, share a code, watch learning-support signals across any pathway —
              evidence of growth, not vanity dashboards.
            </p>
          </article>
          <article className="path-card">
            <div className="badge">Learners</div>
            <h3>Chase a pathway</h3>
            <p>
              Discover an interest that matters outside the screen, build something you can explain,
              and keep a streak with a tutor that scaffolds — it doesn’t steal the thinking.
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
