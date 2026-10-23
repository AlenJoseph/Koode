const appOrigin = process.env.NEXT_PUBLIC_APP_ORIGIN ?? 'http://localhost:3000';

/** Grounded in WHO life skills, UNICEF transferable skills, OECD Learning Compass, UNESCO literacies. See docs/pathways-v1.md */
const pathways = [
  {
    badge: 'WHO · SDG 3',
    title: 'Know yourself',
    blurb: 'Notice feelings, strengths, and stress. Practise calmer choices when life gets loud.',
  },
  {
    badge: 'WHO · SDG 4',
    title: 'Think it through',
    blurb: 'Critical thinking, creative ideas, decisions, and problem-solving on unfamiliar tasks.',
  },
  {
    badge: 'WHO · SDG 16',
    title: 'Speak & listen',
    blurb: 'Explain clearly, listen with empathy, and handle disagreement without shutting down.',
  },
  {
    badge: 'Health literacy · SDG 3',
    title: 'Body & care',
    blurb: 'Food sense, everyday wellbeing, and first aid: check, call, care before panic wins.',
  },
  {
    badge: 'Financial literacy · SDG 8',
    title: 'Money sense',
    blurb: 'Budgets, fair deals, saving, and spotting traps. Money as judgement, not greed.',
  },
  {
    badge: 'Citizenship · SDG 11',
    title: 'Civic life',
    blurb: 'Clean shared spaces, neighbour care, and local voice. Citizenship practised in the street you live on.',
  },
  {
    badge: 'Planet · SDG 15',
    title: 'Living world',
    blurb: 'Wildlife, habitats, and climate-aware local action. Care for land you can actually walk.',
  },
  {
    badge: 'OECD · SDG 8',
    title: 'Make & serve',
    blurb: 'Tiny enterprise, teach a peer, or build a useful tool. Software only when a real problem needs one.',
  },
] as const;

const sdgs = [
  { id: '4', name: 'Quality Education', why: 'Pathways, challenges, and evidence of real learning.' },
  { id: '3', name: 'Good Health', why: 'Self-care, food sense, first aid, and emotional coping.' },
  { id: '8', name: 'Decent Work & Growth', why: 'Money sense and making useful things people need.' },
  { id: '10', name: 'Reduced Inequalities', why: 'Classroom and solo learners get the same quality of guidance.' },
  { id: '11', name: 'Sustainable Cities', why: 'Civic life and shared spaces where students live.' },
  { id: '12', name: 'Responsible Consumption', why: 'Waste less and understand what we use.' },
  { id: '13', name: 'Climate Action', why: 'Local choices connected to a changing climate.' },
  { id: '15', name: 'Life on Land', why: 'Wildlife, habitats, and living-world care.' },
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
            <a href="#sdgs">UN SDGs</a>
            <a href="#how">Start</a>
          </nav>
        </header>

        <div className="hero-main">
          <div>
            <p className="brand-hero">Koode</p>
            <h1 className="headline">Personal intelligence for human growth.</h1>
            <p className="support">
              An open learning platform where students practise life skills that research actually
              names: knowing yourself, thinking clearly, relating to others, money sense, civic life,
              health, and care for the living world. Pathways, challenges, and a gentle AI tutor.
              Teachers run classrooms. Learners keep the thinking.
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
                    <strong>Anticipate</strong>
                    <span>Pick a mission</span>
                  </div>
                </div>
                <div className="node active">
                  <div className="dot" />
                  <div>
                    <strong>Act</strong>
                    <span>Challenge + build</span>
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

      <section className="section" id="product">
        <h2>What Koode is</h2>
        <p>One product. Three clear pieces.</p>
        <div className="product-grid">
          <article className="path-card">
            <div className="badge">For students</div>
            <h3>Practise skills that transfer</h3>
            <p>
              Pick a pathway, take challenges, build something you can explain, then reflect. The
              tutor asks guiding questions. It does not do the thinking for you.
            </p>
          </article>
          <article className="path-card">
            <div className="badge teacher">For teachers</div>
            <h3>Run a class without email friction</h3>
            <p>
              Create a section, share a join code, add students with secret words, point them at a
              pathway, and see learning-support signals grounded in attempts and projects.
            </p>
          </article>
          <article className="path-card">
            <div className="badge join">How learning moves</div>
            <h3>Anticipate → Act → Reflect</h3>
            <p>
              Same cycle as the OECD Learning Compass: plan a mission, practise and build, then
              reflect with evidence. Privacy and safeguarding stay built in.
            </p>
          </article>
        </div>
      </section>

      <section className="section" id="worlds">
        <h2>Pathways students can chase</h2>
        <p>
          Drawn from WHO life skills, UNICEF transferable skills, OECD transformative competencies,
          and UNESCO health/financial literacies. Concrete worlds, not buzzwords.
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
        <p className="source-note">
          Full map and sources:{' '}
          <a href="https://github.com/AlenJoseph/Koode/blob/main/docs/pathways-v1.md">
            docs/pathways-v1.md
          </a>
        </p>
      </section>

      <section className="section section-ink" id="sdgs">
        <h2>Connected to the UN Sustainable Development Goals</h2>
        <p>
          Quality education (SDG 4) sits at the centre. Pathways also practise health, work, civic
          life, and care for land and climate through local missions.
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
          . Koode is not a UN programme. The goals are a shared language for what learning is for.
        </p>
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
    </>
  );
}
