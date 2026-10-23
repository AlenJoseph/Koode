const appOrigin = process.env.NEXT_PUBLIC_APP_ORIGIN ?? 'http://localhost:3000';

const pathways = [
  {
    badge: 'SDG 8',
    title: 'Money & trade',
    blurb: 'Budgets, fair deals, and why prices move. Practise with real mini-missions.',
  },
  {
    badge: 'SDG 15',
    title: 'Wildlife protection',
    blurb: 'Map habitats, protect local species, and argue for what a place needs to thrive.',
  },
  {
    badge: 'SDG 11',
    title: 'Civic sense & clean shared spaces',
    blurb: 'Waste, neighbour care, and streets we share. Small acts that build citizenship.',
  },
  {
    badge: 'SDG 8',
    title: 'Tiny business',
    blurb: 'Spot a need, price a service, serve a customer, and keep honest books.',
  },
  {
    badge: 'SDG 3',
    title: 'First aid',
    blurb: 'Check, call, care. Practise safe responses before an emergency is real.',
  },
  {
    badge: 'SDG 2',
    title: 'Cooking & food sense',
    blurb: 'Plan a meal, waste less, feed people well. Everyday competence, not a recipe dump.',
  },
  {
    badge: 'SDG 4',
    title: 'Teach what you know',
    blurb: 'Explain a skill to a peer, design a mini-lesson, and learn by teaching.',
  },
  {
    badge: 'SDG 9',
    title: 'Software when it helps',
    blurb: 'Build a tool only when a real problem needs one. Code is a craft inside a bigger life.',
  },
] as const;

const sdgs = [
  { id: '4', name: 'Quality Education', why: 'Pathways, challenges, and evidence of real learning for every learner.' },
  { id: '3', name: 'Good Health', why: 'First aid, food sense, and calm judgement under pressure.' },
  { id: '8', name: 'Decent Work & Growth', why: 'Money sense, trade, and tiny businesses students can actually run.' },
  { id: '10', name: 'Reduced Inequalities', why: 'Classroom and independent learners get the same quality of guidance.' },
  { id: '11', name: 'Sustainable Cities', why: 'Civic sense, clean shared spaces, and local responsibility.' },
  { id: '12', name: 'Responsible Consumption', why: 'Waste less, cook wisely, and understand what we use.' },
  { id: '13', name: 'Climate Action', why: 'Learn how daily choices and local projects connect to a hotter planet.' },
  { id: '15', name: 'Life on Land', why: 'Wildlife, habitats, and caring for the living world near you.' },
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
            <a href="#sdgs">UN SDGs</a>
            <a href="#worlds">Pathways</a>
            <a href="#invest">Why invest</a>
            <a href="#start">Start</a>
          </nav>
        </header>

        <div className="hero-main">
          <div>
            <p className="brand-hero">Koode</p>
            <h1 className="headline">Personal intelligence for human growth.</h1>
            <p className="support">
              An open learning platform where students practise real life skills (money, wildlife,
              civic sense, cooking, first aid, business, teaching) with pathways, challenges, and a
              gentle AI tutor. Teachers run classrooms. Learners keep the thinking.
            </p>
            <div className="ctas" id="start">
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

      <section className="section" id="product">
        <h2>What Koode is</h2>
        <p>Clear product. One sentence, then the pieces.</p>
        <div className="product-grid">
          <article className="path-card">
            <div className="badge">For students</div>
            <h3>Playful practice for serious life skills</h3>
            <p>
              Pick a pathway, take challenges, build something you can explain, and keep a streak.
              The tutor asks guiding questions. It does not do your thinking for you.
            </p>
          </article>
          <article className="path-card">
            <div className="badge teacher">For teachers</div>
            <h3>Classroom control without email friction</h3>
            <p>
              Create a section, share a join code, add students with secret words, assign pathway
              direction, and see learning-support signals (not empty vanity metrics).
            </p>
          </article>
          <article className="path-card">
            <div className="badge join">The product loop</div>
            <h3>Discover → challenge → build → reflect</h3>
            <p>
              Progress across pathways, challenges, and projects. Evidence of growth stays with the
              learner. Privacy and safeguarding are design rules, not marketing stickers.
            </p>
          </article>
        </div>
      </section>

      <section className="section section-ink" id="sdgs">
        <h2>Aligned with the UN Sustainable Development Goals</h2>
        <p>
          Koode is built as quality education (SDG 4) that also trains health, work, civic life, and
          care for land and climate. Students practise local missions that map to global goals.
        </p>
        <div className="sdg-grid">
          {sdgs.map((goal) => (
            <article key={goal.id} className="sdg-card">
              <p className="sdg-id">SDG {goal.id}</p>
              <h3>{goal.name}</h3>
              <p>{goal.why}</p>
            </article>
          ))}
        </div>
        <p className="sdg-note">
          Official goals:{' '}
          <a href="https://sdgs.un.org/goals" rel="noopener noreferrer" target="_blank">
            sdgs.un.org/goals
          </a>
          . Koode is not a UN programme. We use the goals as a shared language for impact.
        </p>
      </section>

      <section className="section" id="worlds">
        <h2>Pathways students can chase</h2>
        <p>
          Not a coding bootcamp. Real-world lanes first. Software shows up when a problem needs a
          tool.
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
        <p>Same product. Different doors for teachers, solo learners, and class students.</p>
        <div className="paths">
          <article className="path-card">
            <div className="badge teacher">Teachers</div>
            <h3>Run a section</h3>
            <p>
              Create a class, share a code, and watch learning-support signals across any pathway.
              Evidence of growth, not empty dashboards.
            </p>
          </article>
          <article className="path-card">
            <div className="badge">Learners</div>
            <h3>Learn on your own</h3>
            <p>
              Sign up with email, start a pathway that matters outside the screen, and keep a streak
              with a tutor that scaffolds.
            </p>
          </article>
          <article className="path-card">
            <div className="badge join">Classmates</div>
            <h3>Join with a code</h3>
            <p>
              No email needed for classroom kids. Section code plus secret words, Code.org-style.
            </p>
          </article>
        </div>
      </section>

      <section className="section section-mint" id="invest">
        <h2>Why this is investable</h2>
        <p>
          Schools and governments need learning that builds agency and real competence, not chat
          toys. Koode’s wedge is clear.
        </p>
        <div className="product-grid">
          <article className="path-card">
            <h3>Dual market, one product</h3>
            <p>
              Classroom teachers and independent learners are equal. That doubles the surface for
              adoption without splitting the core loop.
            </p>
          </article>
          <article className="path-card">
            <h3>Impact with proof language</h3>
            <p>
              Pathways map to UN SDGs. Progress is evidence (attempts, projects, reflections), not
              permanent labels on a child.
            </p>
          </article>
          <article className="path-card">
            <h3>Open source, privacy by design</h3>
            <p>
              Runs fully locally like production. Built for pilots with schools, investors, and
              public partners who need inspectable systems.
            </p>
          </article>
        </div>
        <div className="ctas invest-ctas">
          <a className="btn btn-primary" href={`${appOrigin}/en/sign-up`}>
            Try as a learner
          </a>
          <a className="btn btn-secondary" href={`${appOrigin}/en/sign-in`}>
            Try as a teacher
          </a>
          <a className="btn btn-accent" href="https://github.com/AlenJoseph/Koode">
            View the code
          </a>
        </div>
      </section>
    </>
  );
}
