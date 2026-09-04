/** Shared scene scaffolding, so every page has the same rhythm. */

import type { ReactNode } from 'react';

export function Page({
  title,
  lede,
  children,
}: {
  title: string;
  lede: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <h1 className="pg-h1">{title}</h1>
      <p className="pg-lede">{lede}</p>
      {children}
    </>
  );
}

export function Section({
  title,
  note,
  children,
}: {
  title: string;
  note?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="pg-section">
      <h2 className="pg-h2">{title}</h2>
      {note && <p className="pg-note">{note}</p>}
      {children}
    </section>
  );
}
