'use client';

import type { Certificate, Locale, MessageKey, ShopItem } from '@koode/contracts';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import {
  fetchCertificates,
  fetchCoinBalance,
  fetchMe,
  fetchShop,
  redeemShopItem,
} from '@/lib/api';

type Props = {
  locale: Locale;
  dictionary: Record<MessageKey, string>;
};

export function ShopPanel({ locale, dictionary }: Props) {
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [balance, setBalance] = useState(0);
  const [items, setItems] = useState<ShopItem[]>([]);
  const [redeemed, setRedeemed] = useState<string[]>([]);
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const me = await fetchMe();
    if (!me?.user) {
      setSignedIn(false);
      return;
    }
    setSignedIn(true);
    const [bal, shop, certificates] = await Promise.all([
      fetchCoinBalance(),
      fetchShop(),
      fetchCertificates(),
    ]);
    setBalance(bal.balance);
    setItems(shop.items);
    setRedeemed(shop.redeemedItemIds);
    setCerts(certificates.certificates);
  }, []);

  useEffect(() => {
    void refresh().catch(() => setSignedIn(false));
  }, [refresh]);

  async function onRedeem(itemId: string) {
    setBusy(true);
    setError(false);
    try {
      const result = await redeemShopItem(itemId);
      setBalance(result.balance);
      setRedeemed((prev) => [...prev, itemId]);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  if (signedIn === null) {
    return <p className="muted">{dictionary['health.ok']}…</p>;
  }

  if (!signedIn) {
    return (
      <div className="panel stack">
        <p>{dictionary['shop.needSignIn']}</p>
        <Link className="btn btn-primary" href={`/${locale}/sign-up`}>
          {dictionary['nav.signUp']}
        </Link>
      </div>
    );
  }

  return (
    <div className="stack" data-testid="shop-panel">
      <section className="hero-strip">
        <h1 className="brand-hero" style={{ fontSize: 'clamp(1.8rem, 4.5vw, 2.8rem)' }}>
          {dictionary['shop.title']}
        </h1>
        <p className="support">{dictionary['shop.hint']}</p>
        <p className="streak" data-testid="coin-balance">
          {dictionary['shop.balance']}: {balance}
        </p>
      </section>

      {error ? <p role="alert">{dictionary['shop.error']}</p> : null}

      <ul className="stack">
        {items.map((item) => {
          const owned = redeemed.includes(item.id);
          return (
            <li key={item.id} className="board-card" data-testid={`shop-item-${item.id}`}>
              <h2>{item.title}</h2>
              <p className="muted">{item.description}</p>
              <p>
                {item.costCoins} coins · {item.kind}
              </p>
              {owned ? (
                <span className="badge">{dictionary['shop.redeemed']}</span>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={busy || balance < item.costCoins}
                  onClick={() => void onRedeem(item.id)}
                >
                  {dictionary['shop.redeem']}
                </button>
              )}
            </li>
          );
        })}
      </ul>

      <section className="stack" data-testid="certificates">
        <h2>{dictionary['shop.certsTitle']}</h2>
        <p className="muted">{dictionary['shop.certsHint']}</p>
        {certs.length === 0 ? (
          <p className="muted">{dictionary['shop.certsEmpty']}</p>
        ) : (
          <ul>
            {certs.map((cert) => (
              <li key={cert.id} data-testid="certificate-row">
                <strong>{cert.title}</strong>
                <p className="muted">{cert.evidenceSummary}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
