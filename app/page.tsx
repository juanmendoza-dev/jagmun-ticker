import Link from 'next/link';

export default function Home() {
  return (
    <main style={{ padding: '3rem 1.5rem', maxWidth: 520, margin: '0 auto', lineHeight: 1.6 }}>
      <h1 style={{ letterSpacing: '0.16em', fontSize: '1.1rem' }}>JAG COMPOSITE</h1>
      <p style={{ color: 'var(--ink-dim)' }}>
        2008 Financial Stock Market Crash · JAGMUN III
      </p>
      <p>
        <Link href="/board" style={{ color: 'var(--up)' }}>
          /board
        </Link>{' '}
        — the projector. Put this on the wall.
      </p>
      <p>
        <Link href="/panel" style={{ color: 'var(--up)' }}>
          /panel
        </Link>{' '}
        — the directors&apos; phones. Passcode required.
      </p>
    </main>
  );
}
