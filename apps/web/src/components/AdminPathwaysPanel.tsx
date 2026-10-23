'use client';

import type { MessageKey } from '@koode/contracts';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  archiveAdminPathway,
  createAdminPathway,
  listAdminPathways,
  updateAdminPathway,
  type AdminPathway,
} from '@/lib/api';

type Props = {
  dictionary: Record<MessageKey, string>;
};

export function AdminPathwaysPanel({ dictionary }: Props) {
  const [pathways, setPathways] = useState<AdminPathway[]>([]);
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const { pathways: next } = await listAdminPathways();
    setPathways(next);
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
      const { pathway } = await createAdminPathway({ title, summary });
      setPathways((prev) => [pathway, ...prev]);
      setTitle('');
      setSummary('');
    } catch {
      setError(true);
    }
  }

  async function onPublish(pathwayId: string) {
    setError(false);
    try {
      const { pathway } = await updateAdminPathway(pathwayId, { status: 'published' });
      setPathways((prev) => prev.map((row) => (row.id === pathwayId ? pathway : row)));
    } catch {
      setError(true);
    }
  }

  async function onArchive(pathwayId: string) {
    setError(false);
    try {
      await archiveAdminPathway(pathwayId);
      setPathways((prev) => prev.filter((row) => row.id !== pathwayId));
    } catch {
      setError(true);
    }
  }

  if (loading) {
    return <p className="muted">{dictionary['health.ok']}…</p>;
  }

  return (
    <div className="panel stack">
      <h3>{dictionary['admin.pathwaysTitle']}</h3>
      <p className="muted">{dictionary['admin.pathwaysHint']}</p>

      <form className="stack" onSubmit={(event) => void onCreate(event)}>
        <label>
          {dictionary['admin.pathwayTitle']}
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            maxLength={200}
          />
        </label>
        <label>
          {dictionary['admin.pathwaySummary']}
          <textarea
            value={summary}
            onChange={(event) => setSummary(event.target.value)}
            maxLength={2000}
            rows={3}
          />
        </label>
        <button type="submit">{dictionary['admin.pathwayCreate']}</button>
      </form>

      {error ? <p role="alert">{dictionary['admin.pathwayError']}</p> : null}

      {pathways.length === 0 ? (
        <p className="muted">{dictionary['admin.pathwaysEmpty']}</p>
      ) : (
        <ul className="stack">
          {pathways.map((pathway) => (
            <li key={pathway.id} className="stack">
              <strong>{pathway.title}</strong>
              <span className="muted">
                {pathway.status} · {pathway.locale}
              </span>
              {pathway.summary ? <p>{pathway.summary}</p> : null}
              <div className="nav">
                {pathway.status === 'draft' ? (
                  <button type="button" className="secondary" onClick={() => void onPublish(pathway.id)}>
                    {dictionary['admin.pathwayPublish']}
                  </button>
                ) : null}
                <button type="button" className="secondary" onClick={() => void onArchive(pathway.id)}>
                  {dictionary['admin.pathwayArchive']}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
