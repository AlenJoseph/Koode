'use client';

import type { Locale, MessageKey } from '@koode/contracts';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  fetchMe,
  listLearnerPathways,
  listMyPathwayEnrollments,
  type LearnerPathway,
  type PathwayEnrollment,
} from '@/lib/api';
import { pathwayBadge } from '@/lib/pathway-meta';

type Props = {
  locale: Locale;
  dictionary: Record<MessageKey, string>;
};

export function PathwaysBrowsePanel({ locale, dictionary }: Props) {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [pathways, setPathways] = useState<LearnerPathway[]>([]);
  const [enrollments, setEnrollments] = useState<PathwayEnrollment[]>([]);
  const [error, setError] = useState(false);

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
    void refresh().catch(() => {
      setSignedIn(false);
      setError(true);
    });
  }, [refresh]);

  if (signedIn === null) {
    return <p className="muted">{dictionary['health.ok']}…</p>;
  }

  if (!signedIn) {
    return (
      <div className="panel stack">
        <h2 className="section-title">{dictionary['pathways.title']}</h2>
        <p>{dictionary['pathways.needSignIn']}</p>
        <Link className="btn btn-primary" href={`/${locale}/sign-up`}>
          {dictionary['nav.signUp']}
        </Link>
      </div>
    );
  }

  const enrolledIds = new Set(enrollments.map((row) => row.pathwayId));

  return (
    <div className="stack">
      <div>
        <h2 className="section-title">{dictionary['pathways.title']}</h2>
        <p className="section-support">{dictionary['pathways.hint']}</p>
      </div>
      {error ? <p role="alert">{dictionary['pathways.error']}</p> : null}

      {pathways.length === 0 ? (
        <p className="muted">{dictionary['pathways.empty']}</p>
      ) : (
        <div className="worlds">
          {pathways.map((pathway) => {
            const badge = pathwayBadge(pathway.slug);
            const enrolled = enrolledIds.has(pathway.id);
            return (
              <Link
                key={pathway.id}
                className="path-card"
                href={`/${locale}/pathways/${pathway.id}`}
                data-pathway-slug={pathway.slug ?? ''}
              >
                <span className={badge.className}>{badge.label}</span>
                <h3>{pathway.title}</h3>
                {pathway.summary ? <p>{pathway.summary}</p> : null}
                <p className="card-link muted">
                  {enrolled ? dictionary['pathways.enrolled'] : dictionary['pathways.start']} →
                </p>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
