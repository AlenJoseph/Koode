'use client';

import type { MessageKey } from '@koode/contracts';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  archiveAdminChallenge,
  createAdminChallenge,
  listAdminChallenges,
  listAdminPathways,
  updateAdminChallenge,
  type AdminChallenge,
  type AdminPathway,
} from '@/lib/api';

type Props = {
  dictionary: Record<MessageKey, string>;
};

export function AdminChallengesPanel({ dictionary }: Props) {
  const [challenges, setChallenges] = useState<AdminChallenge[]>([]);
  const [pathways, setPathways] = useState<AdminPathway[]>([]);
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [pathwayId, setPathwayId] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [challengeResult, pathwayResult] = await Promise.all([
      listAdminChallenges(),
      listAdminPathways(),
    ]);
    setChallenges(challengeResult.challenges);
    setPathways(pathwayResult.pathways);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh().catch(() => {
      setError(true);
      setLoading(false);
    });
  }, [refresh]);

  async function onCreate(event: FormEvent) {
    event.preventDefault();
    setError(false);
    try {
      const { challenge } = await createAdminChallenge({
        title,
        summary,
        pathwayId: pathwayId || null,
      });
      setChallenges((prev) => [challenge, ...prev]);
      setTitle('');
      setSummary('');
      setPathwayId('');
    } catch {
      setError(true);
    }
  }

  async function onPublish(challengeId: string) {
    setError(false);
    try {
      const { challenge } = await updateAdminChallenge(challengeId, { status: 'published' });
      setChallenges((prev) => prev.map((row) => (row.id === challengeId ? challenge : row)));
    } catch {
      setError(true);
    }
  }

  async function onArchive(challengeId: string) {
    setError(false);
    try {
      await archiveAdminChallenge(challengeId);
      setChallenges((prev) => prev.filter((row) => row.id !== challengeId));
    } catch {
      setError(true);
    }
  }

  if (loading) {
    return <p className="muted">{dictionary['health.ok']}…</p>;
  }

  return (
    <div className="panel stack">
      <h3>{dictionary['admin.challengesTitle']}</h3>
      <p className="muted">{dictionary['admin.challengesHint']}</p>

      <form className="stack" onSubmit={(event) => void onCreate(event)}>
        <label>
          {dictionary['admin.challengeTitle']}
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            maxLength={200}
          />
        </label>
        <label>
          {dictionary['admin.challengeSummary']}
          <textarea
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            maxLength={2000}
            rows={3}
          />
        </label>
        <label>
          {dictionary['admin.challengePathway']}
          <select value={pathwayId} onChange={(event) => setPathwayId(event.target.value)}>
            <option value="">{dictionary['admin.challengePathwayNone']}</option>
            {pathways.map((pathway) => (
              <option key={pathway.id} value={pathway.id}>
                {pathway.title}
              </option>
            ))}
          </select>
        </label>
        <button type="submit">{dictionary['admin.challengeCreate']}</button>
      </form>

      {error ? <p role="alert">{dictionary['admin.challengeError']}</p> : null}

      {challenges.length === 0 ? (
        <p className="muted">{dictionary['admin.challengesEmpty']}</p>
      ) : (
        <ul className="stack">
          {challenges.map((challenge) => {
            const linked = pathways.find((pathway) => pathway.id === challenge.pathwayId);
            return (
              <li key={challenge.id} className="stack">
                <strong>{challenge.title}</strong>
                <span className="muted">
                  {challenge.status} · {challenge.locale}
                  {linked ? ` · ${linked.title}` : ''}
                </span>
                {challenge.summary ? <p>{challenge.summary}</p> : null}
                <div className="nav">
                  {challenge.status === 'draft' ? (
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => void onPublish(challenge.id)}
                    >
                      {dictionary['admin.challengePublish']}
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => void onArchive(challenge.id)}
                  >
                    {dictionary['admin.challengeArchive']}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
