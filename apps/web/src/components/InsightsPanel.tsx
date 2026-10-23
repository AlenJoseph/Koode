'use client';

import type { Locale, MessageKey } from '@koode/contracts';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  fetchMe,
  fetchSectionInsights,
  listSections,
  type ClassroomSection,
  type SectionInsights,
} from '@/lib/api';

type Props = {
  locale: Locale;
  dictionary: Record<MessageKey, string>;
};

export function InsightsPanel({ locale, dictionary }: Props) {
  const [isTeacher, setIsTeacher] = useState<boolean | null>(null);
  const [sections, setSections] = useState<ClassroomSection[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [insights, setInsights] = useState<SectionInsights | null>(null);
  const [error, setError] = useState(false);

  const refresh = useCallback(async () => {
    const me = await fetchMe();
    if (!me?.user || me.user.role !== 'teacher') {
      setIsTeacher(false);
      return;
    }
    setIsTeacher(true);
    const { sections: next } = await listSections();
    setSections(next);
    if (!activeId && next[0]) {
      setActiveId(next[0].id);
    }
  }, [activeId]);

  useEffect(() => {
    void refresh().catch(() => setIsTeacher(false));
  }, [refresh]);

  useEffect(() => {
    if (!activeId || !isTeacher) return;
    void fetchSectionInsights(activeId)
      .then((result) => {
        setInsights(result.insights);
        setError(false);
      })
      .catch(() => setError(true));
  }, [activeId, isTeacher]);

  if (isTeacher === null) {
    return <p className="muted">{dictionary['health.ok']}…</p>;
  }

  if (!isTeacher) {
    return (
      <div className="panel stack">
        <h2>{dictionary['insights.title']}</h2>
        <p>{dictionary['insights.needTeacher']}</p>
        <Link className="button" href={`/${locale}/sign-in`}>
          {dictionary['nav.signIn']}
        </Link>
      </div>
    );
  }

  const aggregates = insights?.aggregates;
  const maxBucket = aggregates
    ? Math.max(
        aggregates.strength,
        aggregates.weakness,
        aggregates.growth,
        aggregates.helpNeeded,
        1,
      )
    : 1;

  const bars = aggregates
    ? [
        { key: 'strength', label: dictionary['insights.strength'], value: aggregates.strength },
        { key: 'growth', label: dictionary['insights.growth'], value: aggregates.growth },
        { key: 'weakness', label: dictionary['insights.weakness'], value: aggregates.weakness },
        {
          key: 'helpNeeded',
          label: dictionary['insights.helpNeeded'],
          value: aggregates.helpNeeded,
        },
      ]
    : [];

  return (
    <div className="stack" data-testid="insights-page">
      <div className="panel stack">
        <h2>{dictionary['insights.title']}</h2>
        <p className="muted">{dictionary['insights.subtitle']}</p>
        {sections.length === 0 ? (
          <p className="muted">{dictionary['insights.empty']}</p>
        ) : (
          <div className="nav">
            {sections.map((section) => (
              <button
                key={section.id}
                type="button"
                className={section.id === activeId ? undefined : 'secondary'}
                onClick={() => setActiveId(section.id)}
              >
                {section.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {insights ? (
        <div className="panel stack">
          <h3>{dictionary['insights.learningGraph']}</h3>
          <div
            className="insight-bars"
            data-testid="learning-support-graph"
            role="img"
            aria-label={dictionary['insights.learningGraph']}
          >
            {bars.map((bar) => (
              <div key={bar.key} className="insight-bar-row">
                <span>{bar.label}</span>
                <div className="insight-bar-track">
                  <div
                    className="insight-bar-fill"
                    style={{ width: `${(bar.value / maxBucket) * 100}%` }}
                    data-testid={`bar-${bar.key}`}
                  />
                </div>
                <span>{bar.value}</span>
              </div>
            ))}
          </div>

          <h3>{dictionary['insights.challengeGraph']}</h3>
          {insights.byChallenge.length === 0 ? (
            <p className="muted">{dictionary['insights.noChallenges']}</p>
          ) : (
            <div
              className="insight-bars"
              data-testid="challenge-graph"
              role="img"
              aria-label={dictionary['insights.challengeGraph']}
            >
              {insights.byChallenge.map((row) => (
                <div key={row.challengeId} className="insight-bar-row">
                  <span>{row.title}</span>
                  <div className="insight-bar-track">
                    <div
                      className="insight-bar-fill"
                      style={{ width: `${row.completionRate * 100}%` }}
                    />
                  </div>
                  <span>{Math.round(row.completionRate * 100)}%</span>
                </div>
              ))}
            </div>
          )}

          <h3>{dictionary['classroom.insights']}</h3>
          <p data-testid="insights-support-legend">{dictionary['classroom.supportLegend']}</p>
          <ul className="stack">
            {insights.learners.map((learner) => (
              <li key={learner.userId} className="nav">
                <span
                  className={`support-dot support-${learner.supportIndicator}`}
                  aria-label={`${learner.displayName}: ${learner.supportIndicator}`}
                />
                <span>{learner.displayName}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {error ? <p className="muted">{dictionary['insights.error']}</p> : null}
    </div>
  );
}
