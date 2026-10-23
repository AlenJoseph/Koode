'use client';

import type { Locale, MessageKey } from '@koode/contracts';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import { lookupSection, studentSignIn } from '@/lib/api';

type Props = {
  locale: Locale;
  dictionary: Record<MessageKey, string>;
};

export function JoinClassPanel({ locale, dictionary }: Props) {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [names, setNames] = useState<string[]>([]);
  const [sectionName, setSectionName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [secretWords, setSecretWords] = useState('');
  const [step, setStep] = useState<'code' | 'sign-in'>('code');
  const [error, setError] = useState(false);
  const [pending, setPending] = useState(false);

  async function onLookup(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(false);
    try {
      const result = await lookupSection(code);
      setSectionName(result.section.name);
      setNames(result.section.students.map((student) => student.displayName));
      setStep('sign-in');
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }

  async function onSignIn(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError(false);
    try {
      await studentSignIn({
        code: code.toUpperCase(),
        displayName,
        secretWords,
      });
      router.replace(`/${locale}`);
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="panel stack">
      <h2>{dictionary['join.title']}</h2>
      {step === 'code' ? (
        <form className="stack" onSubmit={(event) => void onLookup(event)}>
          <label htmlFor="code">{dictionary['join.codeLabel']}</label>
          <input
            id="code"
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            maxLength={6}
            required
          />
          <button type="submit" disabled={pending}>
            {dictionary['join.continue']}
          </button>
        </form>
      ) : (
        <form className="stack" onSubmit={(event) => void onSignIn(event)}>
          <p className="muted">
            {sectionName} · {code.toUpperCase()}
          </p>
          <label htmlFor="name">{dictionary['join.pickName']}</label>
          <select
            id="name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            required
          >
            <option value="">—</option>
            {names.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
          <label htmlFor="secret">{dictionary['join.secretLabel']}</label>
          <input
            id="secret"
            value={secretWords}
            onChange={(event) => setSecretWords(event.target.value)}
            required
          />
          <button type="submit" disabled={pending}>
            {dictionary['join.signIn']}
          </button>
        </form>
      )}
      {error ? <p className="muted">{dictionary['join.error']}</p> : null}
    </div>
  );
}
