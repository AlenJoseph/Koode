const appOrigin = process.env.NEXT_PUBLIC_APP_ORIGIN ?? 'http://localhost:3000';

/** Student-facing pathway names. Research map lives in docs/pathways-v1.md (not on this page). */
const pathways = [
  {
    badge: 'Self',
    title: 'Know yourself',
    blurb: 'Notice feelings, strengths, and stress. Practise calmer choices when life gets loud.',
  },
  {
    badge: 'Mind',
    title: 'Think it through',
    blurb: 'Critical thinking, creative ideas, decisions, and problem-solving on unfamiliar tasks.',
  },
  {
    badge: 'People',
    title: 'Speak & listen',
    blurb: 'Explain clearly, listen with care, and handle disagreement without shutting down.',
  },
  {
    badge: 'Health',
    title: 'Body & care',
    blurb: 'Food sense, everyday wellbeing, and first aid: check, call, care before panic wins.',
  },
  {
    badge: 'Money',
    title: 'Money sense',
    blurb: 'Budgets, fair deals, saving, and spotting traps. Judgement with money, not greed.',
  },
  {
    badge: 'Civic',
    title: 'Civic life',
    blurb: 'Clean shared spaces, neighbour care, and local voice on the street you live on.',
  },
  {
    badge: 'Nature',
    title: 'Living world',
    blurb: 'Wildlife, habitats, and climate-aware local action you can walk to.',
  },
  {
    badge: 'Make',
    title: 'Make & serve',
    blurb: 'Tiny enterprise, teach a peer, or build a useful tool. Software only when it helps.',
  },
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
            <a href="#product">Product</a>
            <a href="#worlds">Pathways</a>
            <a href="#how">How it works</a>
            <a href="#honest">About</a>
          </nav>
        </header>

        <div className="hero-main">
          <div>
            <p className="brand-hero">Koode</p>
            <h1 className="headline">Learn life skills. Keep the thinking.</h1>
            <p className="support">
              Koode is an open classroom and independent-learning app. Students follow pathways
              (money, health, civic life, nature, and more), take challenges, build projects, and get
              a tutor that asks good questions instead of handing over answers. Teachers run classes
              with a join code. No email required for kids in a section.
            </p>
            <div className="ctas">
              <a className="btn btn-primary" href={`${appOrigin}/en/sign-in`}>
                I’m a teacher
              </a>
              <a className="btn btn-secondary" href={`${appOrigin}/en/sign-up`}>
                I’m a student
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
                    <strong>Plan</strong>
                    <span>Pick a mission</span>
                  </div>
                </div>
                <div className="node active">
                  <div className="dot" />
                  <div>
                    <strong>Practise</strong>
                    <span>Challenge + build</span>
                  </div>
                </div>
                <div className="node">
                  <div className="dot" />
                  <div>
                    <strong>Reflect</strong>
                    <span>What next</span>
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

      <section className="section" id="product">
        <h2>What you get</h2>
        <p>Plain product. Nothing more fancy than this.</p>
        <div className="product-grid">
          <article className="path-card">
            <div className="badge">Students</div>
            <h3>Pathways, challenges, projects</h3>
            <p>
              Choose a world that matters outside the screen. Complete challenges, make something
              you can explain, keep a streak. The tutor scaffolds. You still do the work.
            </p>
          </article>
          <article className="path-card">
            <div className="badge teacher">Teachers</div>
            <h3>Sections, roster, progress signals</h3>
            <p>
              Create a class, share a code, add students with secret words, suggest a pathway
              direction, and see who needs help from real attempts, not empty dashboards.
            </p>
          </article>
          <article className="path-card">
            <div className="badge join">Design rules</div>
            <h3>Open, private, local-first</h3>
            <p>
              Source is public. Learner data stays minimised. You can run the stack on your own
              machine like production. Built for school pilots that need inspectable software.
            </p>
          </article>
        </div>
      </section>

      <section className="section" id="worlds">
        <h2>Pathways</h2>
        <p>
          Eight starting worlds. Coding is optional, inside Make & serve, only when a problem needs
          a tool.
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
        <h2>How to start</h2>
        <p>Three doors. Same product behind them.</p>
        <div className="paths">
          <article className="path-card">
            <div className="badge teacher">Teachers</div>
            <h3>Run a section</h3>
            <p>Sign in, create a class, share the code, add students, point them at a pathway.</p>
            <p className="card-link">
              <a href={`${appOrigin}/en/sign-in`}>Teacher sign in →</a>
            </p>
          </article>
          <article className="path-card">
            <div className="badge">Solo learners</div>
            <h3>Learn on your own</h3>
            <p>Sign up with email, pick a pathway, and practise at your pace.</p>
            <p className="card-link">
              <a href={`${appOrigin}/en/sign-up`}>Student sign up →</a>
            </p>
          </article>
          <article className="path-card">
            <div className="badge join">In a class</div>
            <h3>Join with a code</h3>
            <p>No email. Section code plus secret words from your teacher.</p>
            <p className="card-link">
              <a href={`${appOrigin}/en/join`}>Join class →</a>
            </p>
          </article>
        </div>
      </section>

      <section className="section section-ink" id="honest">
        <h2>Where we are (honest)</h2>
        <p>
          Koode is early, but you can run it today. Teachers create classes, students join and
          practise real pathways, and a tutor guides without giving away the answers. We are
          preparing school pilots with privacy first.
        </p>
        <div className="product-grid">
          <article className="sdg-card">
            <h3>Who it is for</h3>
            <p>
              Teachers, students 13–18, and partners who care about life skills and independent
              learning, not chat toys.
            </p>
          </article>
          <article className="sdg-card">
            <h3>What we need next</h3>
            <p>
              Classroom pilots, curriculum partners, and sponsors who fund learning resources and
              safe hosting, not hype.
            </p>
          </article>
          <article className="sdg-card">
            <h3>How to look closer</h3>
            <p>
              Try the app, read the docs, or open the code on GitHub. We would rather show the work
              than decorate the page with logos we have not earned.
            </p>
          </article>
        </div>
        <div className="ctas invest-ctas">
          <a className="btn btn-primary" href={`${appOrigin}/en/sign-up`}>
            Try the app
          </a>
          <a
            className="btn btn-secondary"
            href={process.env.NEXT_PUBLIC_DOCS_ORIGIN ?? 'http://localhost:3003'}
          >
            Read docs
          </a>
          <a className="btn btn-accent" href="https://github.com/AlenJoseph/Koode">
            View source
          </a>
        </div>
      </section>
    </>
  );
}
