'use client';

import type { Locale, MessageKey } from '@koode/contracts';
import Link from 'next/link';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  addStudent,
  createSection,
  exportRosterCsv,
  fetchMe,
  fetchSectionInsights,
  listLearnerPathways,
  listRoster,
  listSectionPathways,
  listSections,
  removeStudent,
  resetStudentSecret,
  setSectionPathways,
  type ClassroomSection,
  type LearnerPathway,
  type SectionInsights,
} from '@/lib/api';

type Props = {
  locale: Locale;
  dictionary: Record<MessageKey, string>;
};

export function ClassroomPanel({ locale, dictionary }: Props) {
  const [isTeacher, setIsTeacher] = useState<boolean | null>(null);
  const [sections, setSections] = useState<ClassroomSection[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [roster, setRoster] = useState<Array<{ id: string; displayName: string }>>([]);
  const [insights, setInsights] = useState<SectionInsights | null>(null);
  const [sectionName, setSectionName] = useState('Class 7A');
  const [studentName, setStudentName] = useState('');
  const [lastSecretWords, setLastSecretWords] = useState<string | null>(null);
  const [availablePathways, setAvailablePathways] = useState<LearnerPathway[]>([]);
  const [selectedPathwayIds, setSelectedPathwayIds] = useState<string[]>([]);
  const [directionSaved, setDirectionSaved] = useState(false);
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
    void listRoster(activeId)
      .then((result) => setRoster(result.roster))
      .catch(() => setError(true));
    void fetchSectionInsights(activeId)
      .then((result) => setInsights(result.insights))
      .catch(() => setError(true));
    void Promise.all([listLearnerPathways(), listSectionPathways(activeId)])
      .then(([published, linked]) => {
        setAvailablePathways(published.pathways);
        setSelectedPathwayIds(linked.pathways.map((pathway) => pathway.id));
        setDirectionSaved(false);
      })
      .catch(() => setError(true));
  }, [activeId, isTeacher]);

  async function onCreateSection(event: FormEvent) {
    event.preventDefault();
    setError(false);
    try {
      const { section } = await createSection(sectionName);
      setSections((prev) => [...prev, section]);
      setActiveId(section.id);
    } catch {
      setError(true);
    }
  }

  async function onAddStudent(event: FormEvent) {
    event.preventDefault();
    if (!activeId) return;
    setError(false);
    try {
      const { student } = await addStudent(activeId, studentName);
      setLastSecretWords(student.secretWords);
      setStudentName('');
      const { roster: next } = await listRoster(activeId);
      setRoster(next);
    } catch {
      setError(true);
    }
  }

  async function onRemoveStudent(membershipId: string) {
    if (!activeId) return;
    setError(false);
    try {
      await removeStudent(activeId, membershipId);
      setRoster((prev) => prev.filter((row) => row.id !== membershipId));
    } catch {
      setError(true);
    }
  }

  async function onResetSecret(membershipId: string) {
    if (!activeId) return;
    setError(false);
    try {
      const { student } = await resetStudentSecret(activeId, membershipId);
      setLastSecretWords(student.secretWords);
    } catch {
      setError(true);
    }
  }

  async function onExportRoster() {
    if (!activeId || !active) return;
    setError(false);
    try {
      const blob = await exportRosterCsv(activeId);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `roster-${active.code}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch {
      setError(true);
    }
  }

  async function onSaveDirection(event: FormEvent) {
    event.preventDefault();
    if (!activeId) return;
    setError(false);
    setDirectionSaved(false);
    try {
      const { pathways } = await setSectionPathways(activeId, selectedPathwayIds);
      setSelectedPathwayIds(pathways.map((pathway) => pathway.id));
      setDirectionSaved(true);
    } catch {
      setError(true);
    }
  }

  function togglePathway(pathwayId: string) {
    setSelectedPathwayIds((prev) =>
      prev.includes(pathwayId) ? prev.filter((id) => id !== pathwayId) : [...prev, pathwayId],
    );
    setDirectionSaved(false);
  }

  if (isTeacher === null) {
    return <p className="muted">{dictionary['health.ok']}…</p>;
  }

  if (!isTeacher) {
    return (
      <div className="panel stack">
        <h2>{dictionary['classroom.title']}</h2>
        <p>{dictionary['classroom.needTeacher']}</p>
        <Link className="button" href={`/${locale}/sign-in`}>
          {dictionary['nav.signIn']}
        </Link>
      </div>
    );
  }

  const active = sections.find((section) => section.id === activeId) ?? null;

  return (
    <div className="stack">
      <div className="panel stack">
        <h2>{dictionary['classroom.title']}</h2>
        <form className="stack" onSubmit={(event) => void onCreateSection(event)}>
          <label htmlFor="section-name">{dictionary['classroom.nameLabel']}</label>
          <input
            id="section-name"
            value={sectionName}
            onChange={(event) => setSectionName(event.target.value)}
            required
          />
          <button type="submit">{dictionary['classroom.create']}</button>
        </form>
        {sections.length === 0 ? <p className="muted">{dictionary['classroom.empty']}</p> : null}
        <div className="nav">
          {sections.map((section) => (
            <button
              key={section.id}
              type="button"
              className={section.id === activeId ? undefined : 'secondary'}
              onClick={() => setActiveId(section.id)}
            >
              {section.name} ({section.code})
            </button>
          ))}
        </div>
      </div>

      {active ? (
        <div className="panel stack">
          <p>
            <strong>{dictionary['classroom.codeLabel']}:</strong> {active.code}
          </p>
          <button type="button" className="secondary" onClick={() => void onExportRoster()}>
            {dictionary['classroom.exportRoster']}
          </button>

          <h3>{dictionary['classroom.pathwayDirection']}</h3>
          <p className="muted">{dictionary['classroom.pathwayDirectionHint']}</p>
          <form className="stack" onSubmit={(event) => void onSaveDirection(event)}>
            {availablePathways.length === 0 ? (
              <p className="muted">{dictionary['classroom.pathwayDirectionEmpty']}</p>
            ) : (
              <ul className="stack">
                {availablePathways.map((pathway) => (
                  <li key={pathway.id}>
                    <label>
                      <input
                        type="checkbox"
                        checked={selectedPathwayIds.includes(pathway.id)}
                        onChange={() => togglePathway(pathway.id)}
                      />{' '}
                      {pathway.title}
                    </label>
                  </li>
                ))}
              </ul>
            )}
            <button type="submit">{dictionary['classroom.pathwayDirectionSave']}</button>
            {directionSaved ? (
              <p className="muted">{dictionary['classroom.pathwayDirectionSaved']}</p>
            ) : null}
          </form>

          <h3>{dictionary['classroom.insights']}</h3>
          {insights ? (
            <div className="stack" data-testid="support-insights">
              <p data-testid="support-legend">{dictionary['classroom.supportLegend']}</p>
              <ul className="stack muted">
                <li>{dictionary['classroom.supportGreen']}</li>
                <li>{dictionary['classroom.supportOrange']}</li>
                <li>{dictionary['classroom.supportRed']}</li>
              </ul>
              <ul className="stack">
                {insights.learners.map((learner) => (
                  <li key={learner.userId} className="nav">
                    <span
                      className={`support-dot support-${learner.supportIndicator}`}
                      title={learner.supportIndicator}
                      aria-label={`${learner.displayName}: ${learner.supportIndicator}`}
                    />
                    <span>{learner.displayName}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <h3>{dictionary['classroom.roster']}</h3>
          <ul className="stack">
            {roster.map((row) => (
              <li key={row.id} className="nav">
                <span>{row.displayName}</span>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => void onResetSecret(row.id)}
                >
                  {dictionary['classroom.resetSecret']}
                </button>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => void onRemoveStudent(row.id)}
                >
                  {dictionary['classroom.removeStudent']}
                </button>
              </li>
            ))}
          </ul>
          <form className="stack" onSubmit={(event) => void onAddStudent(event)}>
            <label htmlFor="student-name">{dictionary['classroom.studentName']}</label>
            <input
              id="student-name"
              value={studentName}
              onChange={(event) => setStudentName(event.target.value)}
              required
            />
            <button type="submit">{dictionary['classroom.addStudent']}</button>
          </form>
          {lastSecretWords ? (
            <p>
              <strong>{dictionary['classroom.secretWords']}:</strong> {lastSecretWords}
            </p>
          ) : null}
        </div>
      ) : null}
      {error ? <p className="muted">{dictionary['join.error']}</p> : null}
    </div>
  );
}
