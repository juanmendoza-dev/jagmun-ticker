'use client';

import { COMPOSITE_OPEN } from '@/lib/constants';
import { gridLines } from '@/lib/live';

const W = 1728;
const H = 470;
/** Room on the right for the price axis and the live tag that rides the last value. */
const GUTTER = 168;
const PLOT = W - GUTTER;

export type ChartProps = {
  /** Every sample the board has printed this session, oldest first. */
  series: number[];
  /** Indices into `series` where the dais actually moved the market. */
  markers: number[];
  /** Wall-clock label for the left edge of the time axis. */
  openedAt: string;
  now: string;
  live: boolean;
};

/**
 * The session chart — the centrepiece of the board, not a sparkline. Filled area, a
 * price axis on the right, the 1000 open marked, a tag riding the live value, and a dot
 * on the line everywhere a director actually moved the market. A delegate should be
 * able to point at a step and say "that's when we let the bank fail".
 */
export default function Chart({ series, markers, openedAt, now, live }: ChartProps) {
  const pts = series.length > 1 ? series : [COMPOSITE_OPEN, COMPOSITE_OPEN];
  const last = pts[pts.length - 1];
  const down = last < COMPOSITE_OPEN;
  const stroke = down ? 'var(--down)' : 'var(--up)';

  // Always frame the open, so "are we above or below where we started" is the shape of
  // the chart itself and not something you have to read off an axis.
  const rawLo = Math.min(...pts, COMPOSITE_OPEN);
  const rawHi = Math.max(...pts, COMPOSITE_OPEN);
  const pad = Math.max((rawHi - rawLo) * 0.18, 6);
  const lo = rawLo - pad;
  const hi = rawHi + pad;

  const x = (i: number) => (i / (pts.length - 1)) * PLOT;
  const y = (v: number) => H - ((v - lo) / (hi - lo)) * H;

  const line = pts.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const area = `0,${H} ${line} ${x(pts.length - 1).toFixed(1)},${H}`;
  const tagY = clampY(y(last));

  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img">
      <defs>
        <linearGradient id="fill-down" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--down)" stopOpacity="0.34" />
          <stop offset="100%" stopColor="var(--down)" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="fill-up" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--up)" stopOpacity="0.34" />
          <stop offset="100%" stopColor="var(--up)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* price gridlines, labelled on the right the way a trading screen is */}
      {gridLines(lo, hi).map((v) => (
        <g key={v}>
          <line x1={0} x2={PLOT} y1={y(v)} y2={y(v)} className="grid" />
          <text x={PLOT + 18} y={y(v) + 11} className="axis">
            {v.toFixed(0)}
          </text>
        </g>
      ))}

      {/* where the session started — the one number a delegate has to know */}
      <line x1={0} x2={PLOT} y1={y(COMPOSITE_OPEN)} y2={y(COMPOSITE_OPEN)} className="openline" />
      <text x={6} y={y(COMPOSITE_OPEN) - 14} className="openlabel">
        OPEN 1000
      </text>

      <polygon points={area} fill={down ? 'url(#fill-down)' : 'url(#fill-up)'} />
      <polyline
        points={line}
        fill="none"
        stroke={stroke}
        strokeWidth={5}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />

      {/* every point where the committee actually did something */}
      {markers
        .filter((i) => i > 0 && i < pts.length)
        .map((i, n) => (
          <circle
            key={`${i}-${n}`}
            cx={x(i)}
            cy={y(pts[i])}
            r={9}
            className="marker"
            stroke={stroke}
          />
        ))}

      {/* the live end: a tag riding the current value, pulsing while the market is open */}
      <line x1={0} x2={PLOT} y1={y(last)} y2={y(last)} className="lastline" stroke={stroke} />
      <circle
        cx={x(pts.length - 1)}
        cy={y(last)}
        r={8}
        fill={stroke}
        className={live ? 'chart-head' : undefined}
      />
      <rect x={PLOT + 8} y={tagY - 26} width={GUTTER - 16} height={52} rx={8} fill={stroke} />
      <text x={PLOT + 8 + (GUTTER - 16) / 2} y={tagY + 12} className="tag" textAnchor="middle">
        {last.toFixed(2)}
      </text>

      <text x={2} y={H - 10} className="axis time">
        {openedAt}
      </text>
      <text x={PLOT - 2} y={H - 10} className="axis time" textAnchor="end">
        {now}
      </text>
    </svg>
  );
}

/** Keep the price tag inside the plot even when the line is pinned to an edge. */
function clampY(v: number): number {
  return Math.max(30, Math.min(H - 30, v));
}
