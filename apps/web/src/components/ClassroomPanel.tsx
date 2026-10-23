'use client';

import type { Locale, MessageKey } from '@koode/contracts';
import Link from 'next/link';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  addStudent,
  createSection,
  fetchMe,
  listRoster,
  listSections,
  removeStudent,
  resetStudentSecret,
  type ClassroomSection,
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
  const [sectionName, setSectionName] = useState('Class 7A');
  const [studentName, setStudentName] = useState('');
  const [lastSecretWords, setLastSecretWords] = useState<string | null>(null);
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
