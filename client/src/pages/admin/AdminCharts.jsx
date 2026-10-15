import { useState } from 'react';
import { cx } from '../../lib/api';

// Chart colours (validated for colour-blind separation on white): green, then blue.
export const CHART = { green: '#12866a', blue: '#2563eb' };
const nf = new Intl.NumberFormat('en-IN');
const dayLabel = (day) => new Date(day + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });

// Vertical bars per day. One series = plain bars; two = stacked with a legend.
export function DayBars({ data, series, height = 150, format = (v) => nf.format(v) }) {
  const [hover, setHover] = useState(null);
  const max = Math.max(1, ...data.map((d) => series.reduce((a, s) => a + (d[s.key] || 0), 0)));
  const step = Math.ceil(data.length / 7);
  return (
    <div>
      {series.length > 1 && (
        <div className="mb-3 flex flex-wrap gap-4 text-xs font-semibold text-white/60">
          {series.map((s) => (
            <span key={s.key} className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm" style={{ background: s.color }} /> {s.label}
            </span>
          ))}
        </div>
      )}
      <div className="flex items-end gap-[3px] border-b border-white/10" style={{ height }}>
        {data.map((d, i) => {
          const total = series.reduce((a, s) => a + (d[s.key] || 0), 0);
          return (
            <div key={d.day} className="relative flex h-full flex-1 flex-col justify-end" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <div className={cx('flex flex-col-reverse gap-[2px] transition-opacity', hover != null && hover !== i && 'opacity-50')}>
                {series.map((s) =>
                  d[s.key] ? <div key={s.key} className="w-full last:rounded-t-[4px]" style={{ height: Math.max(2, (d[s.key] / max) * (height - 6)), background: s.color }} /> : null,
                )}
                {total === 0 && <div className="h-[2px] w-full bg-white/10" />}
              </div>
              {hover === i && (
                <div className={cx('pointer-events-none absolute bottom-full z-10 mb-2 w-36 rounded-xl border border-white/10 bg-ink-900 p-2.5 text-xs shadow-lg', i > data.length * 0.7 ? 'right-0' : 'left-0')}>
                  <p className="font-bold">{dayLabel(d.day)}</p>
                  {series.map((s) => (
                    <p key={s.key} className="mt-1 flex items-center justify-between gap-2 text-white/70">
                      <span className="flex items-center gap-1.5">
                        <span className="size-2 rounded-sm" style={{ background: s.color }} />
                        {s.label}
                      </span>
                      <b className="text-white">{format(d[s.key] || 0)}</b>
                    </p>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-1.5 flex gap-[3px] text-[10px] text-white/40">
        {data.map((d, i) => (
          <span key={d.day} className="flex-1 whitespace-nowrap text-center">
            {i % step === 0 ? dayLabel(d.day) : ''}
          </span>
        ))}
      </div>
    </div>
  );
}

// Ranked horizontal bars (top skills, cities, pipeline stages).
export function RankBars({ items, color = CHART.green, empty = 'No data yet' }) {
  if (!items.length) return <p className="text-sm text-white/45">{empty}</p>;
  const max = Math.max(1, ...items.map((i) => i.n));
  return (
    <ul className="space-y-2">
      {items.map((i) => (
        <li key={i.label} className="text-sm" title={`${i.label}: ${i.n}`}>
          <div className="mb-1 flex items-baseline justify-between gap-2">
            <span className="truncate font-semibold">{i.label}</span>
            <span className="tabular-nums text-white/60">{nf.format(i.n)}</span>
          </div>
          <div className="h-2 rounded-full bg-white/[0.06]">
            <div className="h-2 rounded-full" style={{ width: `${Math.max(2, (i.n / max) * 100)}%`, background: color }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
