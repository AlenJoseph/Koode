'use client';

import type { Locale, MessageKey } from '@koode/contracts';
import Link from 'next/link';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  createProject,
  fetchMe,
  listLearnerChallenges,
  listLearnerPathways,
  listMyProjects,
  type LearnerChallenge,
  type LearnerPathway,
  type LearnerProject,
} from '@/lib/api';

type Props = {
  locale: Locale;
  dictionary: Record<MessageKey, string>;
};

export function ProjectsPanel({ locale, dictionary }: Props) {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [projects, setProjects] = useState<LearnerProject[]>([]);
  const [pathways, setPathways] = useState<LearnerPathway[]>([]);
  const [challenges, setChallenges] = useState<LearnerChallenge[]>([]);
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [pathwayId, setPathwayId] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    const me = await fetchMe();
    if (!me?.user) {
      setSignedIn(false);
      return;
    }
    setSignedIn(true);
    const [projectResult, pathwayResult, challengeResult] = await Promise.all([
      listMyProjects(),
      listLearnerPathways(),
      listLearnerChallenges(),
    ]);
    setProjects(projectResult.projects);
    setPathways(pathwayResult.pathways);
    setChallenges(challengeResult.challenges);
  }, []);

  useEffect(() => {
    void refresh().catch(() => setSignedIn(false));
  }, [refresh]);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setError(false);
    try {
      const { project } = await createProject({
        title,
        summary,
        pathwayId: pathwayId || null,
        challengeId: challengeId || null,
      });
      setProjects((prev) => [project, ...prev]);
      setTitle('');
      setSummary('');
      setPathwayId('');
      setChallengeId('');
    } catch {
      setError(true);
    }
  }

  if (signedIn === null) {
    return <p className="muted">{dictionary['health.ok']}…</p>;
  }

  if (!signedIn) {
    return (
      <div className="panel stack">
        <h2>{dictionary['projects.title']}</h2>
        <p>{dictionary['projects.needSignIn']}</p>
        <Link className="button" href={`/${locale}/sign-up`}>
          {dictionary['nav.signUp']}
        </Link>
      </div>
    );
  }

  return (
    <div className="panel stack">
      <h2>{dictionary['projects.title']}</h2>
      <p className="muted">{dictionary['projects.hint']}</p>

      <form className="stack" onSubmit={(event) => void onCreate(event)}>
        <label>
          {dictionary['projects.nameLabel']}
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            maxLength={200}
          />
        </label>
        <label>
          {dictionary['projects.summaryLabel']}
          <textarea
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            maxLength={2000}
            rows={3}
          />
        </label>
        <label>
          {dictionary['projects.pathwayLabel']}
          <select value={pathwayId} onChange={(event) => setPathwayId(event.target.value)}>
            <option value="">{dictionary['projects.linkNone']}</option>
            {pathways.map((pathway) => (
              <option key={pathway.id} value={pathway.id}>
                {pathway.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          {dictionary['projects.challengeLabel']}
          <select value={challengeId} onChange={(event) => setChallengeId(event.target.value)}>
            <option value="">{dictionary['projects.linkNone']}</option>
            {challenges.map((challenge) => (
              <option key={challenge.id} value={challenge.id}>
                {challenge.title}
              </option>
            ))}
          </select>
        </label>
        <button type="submit">{dictionary['projects.create']}</button>
      </form>

      {error ? <p role="alert">{dictionary['projects.error']}</p> : null}

      {projects.length === 0 ? (
        <p className="muted">{dictionary['projects.empty']}</p>
      ) : (
        <ul className="stack">
          {projects.map((project) => (
            <li key={project.id} className="stack">
              <strong>{project.title}</strong>
              {project.summary ? <p>{project.summary}</p> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
