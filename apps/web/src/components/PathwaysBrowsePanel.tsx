'use client';

import type { Locale, MessageKey } from '@koode/contracts';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  enrollInPathway,
  fetchMe,
  listLearnerPathways,
  listMyPathwayEnrollments,
  type LearnerPathway,
  type PathwayEnrollment,
} from '@/lib/api';

type Props = {
  locale: Locale;
  dictionary: Record<MessageKey, string>;
};

export function PathwaysBrowsePanel({ locale, dictionary }: Props) {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [pathways, setPathways] = useState<LearnerPathway[]>([]);
  const [enrollments, setEnrollments] = useState<PathwayEnrollment[]>([]);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const me = await fetchMe();
    if (!me?.user) {
      setSignedIn(false);
      return;
    }
    setSignedIn(true);
    const [pathwayResult, enrollmentResult] = await Promise.all([
      listLearnerPathways(),
      listMyPathwayEnrollments(),
    ]);
    setPathways(pathwayResult.pathways);
    setEnrollments(enrollmentResult.enrollments);
  }, []);

  useEffect(() => {
    void refresh().catch(() => setSignedIn(false));
  }, [refresh]);

  async function onStart(pathwayId: string) {
    setError(false);
    setBusyId(pathwayId);
    try {
      const { enrollment } = await enrollInPathway(pathwayId);
      setEnrollments((prev) => {
        if (prev.some((row) => row.id === enrollment.id)) {
          return prev;
        }
        return [enrollment, ...prev];
      });
    } catch {
      setError(true);
    } finally {
      setBusyId(null);
    }
  }

  if (signedIn === null) {
    return <p className="muted">{dictionary['health.ok']}…</p>;
  }

  if (!signedIn) {
    return (
      <div className="panel stack">
        <h2>{dictionary['pathways.title']}</h2>
        <p>{dictionary['pathways.needSignIn']}</p>
        <Link className="button" href={`/${locale}/sign-up`}>
          {dictionary['nav.signUp']}
        </Link>
      </div>
    );
  }

  const enrolledIds = new Set(enrollments.map((row) => row.pathwayId));

  return (
    <div className="panel stack">
      <h2>{dictionary['pathways.title']}</h2>
      <p className="muted">{dictionary['pathways.hint']}</p>
      {error ? <p role="alert">{dictionary['pathways.error']}</p> : null}

      {pathways.length === 0 ? (
        <p className="muted">{dictionary['pathways.empty']}</p>
      ) : (
        <ul className="stack">
          {pathways.map((pathway) => {
            const enrolled = enrolledIds.has(pathway.id);
            return (
              <li key={pathway.id} className="stack">
                <strong>{pathway.title}</strong>
                {pathway.summary ? <p>{pathway.summary}</p> : null}
                {enrolled ? (
                  <p className="muted">{dictionary['pathways.enrolled']}</p>
                ) : (
                  <button
                    type="button"
                    disabled={busyId === pathway.id}
                    onClick={() => void onStart(pathway.id)}
                  >
                    {dictionary['pathways.start']}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
