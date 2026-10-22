'use client';

import type { Locale, MessageKey } from '@koode/contracts';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { verifyMagicLink } from '@/lib/api';

type Props = {
  locale: Locale;
  token: string;
  dictionary: Record<MessageKey, string>;
};

export function VerifyClient({ locale, token, dictionary }: Props) {
  const router = useRouter();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        await verifyMagicLink(token);
        if (!cancelled) {
          router.replace(`/${locale}`);
        }
      } catch {
        if (!cancelled) {
          setFailed(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [locale, router, token]);

  return (
    <div className="panel">
      <h2>{dictionary['auth.verifyTitle']}</h2>
      <p>{failed ? dictionary['auth.verifyFailed'] : dictionary['auth.verifying']}</p>
    </div>
  );
}
