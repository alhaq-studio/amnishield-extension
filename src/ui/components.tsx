import { Component, useMemo, useState, type ReactNode } from "react";
import type { DateKey, UsageHistory } from "../lib/types";
import { DAY_LABELS, dayLabel, friendlyDate, msToHuman, todayKey, weekKeys, weekRangeLabel } from "../lib/time";
import { dayTotal, domainsForDay, type DomainRow } from "../lib/stats";

// Shared button and input recipes so every screen stays visually in sync.
export const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-pill bg-accent px-6 py-2.5 text-sm font-medium text-bg shadow-soft transition-all duration-200 ease-out hover:shadow-float hover:-translate-y-px active:translate-y-0 active:scale-[0.98] disabled:opacity-40 disabled:shadow-none disabled:hover:translate-y-0";
export const btnOutline =
  "inline-flex items-center justify-center gap-2 rounded-pill border border-line bg-surface px-5 py-2 text-sm font-medium text-ink transition-colors duration-200 hover:bg-state active:scale-[0.98]";
export const btnGhost = "text-sm text-muted transition-colors hover:text-ink";
export const inputCls =
  "bg-transparent border-b border-line py-1.5 px-1 text-sm transition-colors focus:outline-none focus:border-ink placeholder:text-faint";
export const selectCls =
  "w-full bg-transparent border-b border-line py-1.5 text-sm transition-colors focus:outline-none focus:border-ink";

export const DOMAIN_PALETTE = [
  "#38bdf8", // Sky blue
  "#f87171", // Coral red
  "#34d399", // Mint emerald
  "#fbbf24", // Amber gold
  "#c084fc", // Lavender purple
  "#818cf8", // Indigo
  "#fb923c", // Orange
  "#2dd4bf", // Teal
];

export function Stat({ label, ms }: { label: string; ms: number }) {
  return (
    <div className="relative flex flex-col items-center overflow-hidden pt-7 pb-3 text-center">
      <div className="bloom" aria-hidden="true" />
      <span className="label relative">{label}</span>
      <span className="font-display tnum relative mt-3 text-[76px] leading-[0.78] tracking-tight">{msToHuman(ms)}</span>
    </div>
  );
}

/**
 * Modern Screentime Donut Ring Chart with rounded stroke caps,
 * interactive segments, and center analytics.
 */
export function ScreenTimeDonutChart({
  label = "SCREENTIME",
  totalMs,
  rows,
}: {
  label?: string;
  totalMs: number;
  rows: DomainRow[];
}) {
  const [hoveredDomain, setHoveredDomain] = useState<string | null>(null);

  // Group top 4 domains and remainder as "Other sites"
  const segments = useMemo(() => {
    if (totalMs <= 0 || rows.length === 0) return [];
    const top = rows.slice(0, 4);
    const otherMs = rows.slice(4).reduce((sum, r) => sum + r.ms, 0);

    const list = top.map((r, i) => ({
      domain: r.domain,
      ms: r.ms,
      ratio: r.ms / totalMs,
      color: DOMAIN_PALETTE[i % DOMAIN_PALETTE.length],
    }));

    if (otherMs > 0) {
      list.push({
        domain: "Other sites",
        ms: otherMs,
        ratio: otherMs / totalMs,
        color: "#94a3b8",
      });
    }

    return list;
  }, [rows, totalMs]);

  const radius = 68;
  const strokeWidth = 14;
  const circumference = 2 * Math.PI * radius;

  // Compute start offsets and arc lengths with rounded separation
  let accumulatedOffset = 0;
  const renderedArcs = segments.map((seg) => {
    const arcLength = seg.ratio * circumference;
    const gap = segments.length > 1 ? 6 : 0;
    const strokeDash = `${Math.max(2, arcLength - gap)} ${circumference}`;
    const offset = -accumulatedOffset;
    accumulatedOffset += arcLength;
    return {
      ...seg,
      strokeDash,
      offset,
    };
  });

  const activeSegment = hoveredDomain
    ? segments.find((s) => s.domain === hoveredDomain)
    : null;

  return (
    <div className="relative flex flex-col items-center justify-center pt-2 pb-1">
      <div className="relative flex items-center justify-center">
        <svg
          width="180"
          height="180"
          viewBox="0 0 180 180"
          className="rotate-[-90deg] transition-transform duration-500"
        >
          {/* Background Ring Track */}
          <circle
            cx="90"
            cy="90"
            r={radius}
            fill="none"
            stroke="var(--surface-2)"
            strokeWidth={strokeWidth}
            opacity="0.4"
          />

          {/* Segment Arcs */}
          {renderedArcs.map((arc) => {
            const isHovered = hoveredDomain === arc.domain;
            return (
              <circle
                key={arc.domain}
                cx="90"
                cy="90"
                r={radius}
                fill="none"
                stroke={arc.color}
                strokeWidth={isHovered ? strokeWidth + 3 : strokeWidth}
                strokeDasharray={arc.strokeDash}
                strokeDashoffset={arc.offset}
                strokeLinecap="round"
                className="transition-all duration-300 cursor-pointer"
                onMouseEnter={() => setHoveredDomain(arc.domain)}
                onMouseLeave={() => setHoveredDomain(null)}
                style={{
                  filter: isHovered ? `drop-shadow(0 0 8px ${arc.color})` : "none",
                  transformOrigin: "center",
                }}
              />
            );
          })}
        </svg>

        {/* Center Label & Metric */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none px-4">
          <span className="text-[10px] font-bold tracking-widest text-muted uppercase leading-none mb-1">
            {activeSegment ? activeSegment.domain : label}
          </span>
          <span className="font-display font-bold text-3xl sm:text-4xl text-ink leading-none tracking-tight">
            {activeSegment ? msToHuman(activeSegment.ms) : msToHuman(totalMs)}
          </span>
          {activeSegment && (
            <span className="text-[10px] font-semibold text-muted mt-1">
              {Math.round(activeSegment.ratio * 100)}% of browsing
            </span>
          )}
        </div>
      </div>

      {/* Website Segments Legend Pills */}
      {segments.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-1.5 mt-4 max-w-sm px-1">
          {segments.map((seg) => (
            <button
              key={seg.domain}
              type="button"
              onMouseEnter={() => setHoveredDomain(seg.domain)}
              onMouseLeave={() => setHoveredDomain(null)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                hoveredDomain === seg.domain
                  ? "bg-surface-2 text-ink shadow-sm scale-105 border border-line"
                  : "bg-surface-2/60 text-muted hover:text-ink hover:bg-surface-2"
              }`}
            >
              <span
                className="h-2 w-2 rounded-full shrink-0 shadow-sm"
                style={{ backgroundColor: seg.color }}
              />
              <span className="truncate max-w-[100px]">{seg.domain}</span>
              <span className="font-mono text-[10px] opacity-75">{msToHuman(seg.ms)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      className={`shrink-0 text-faint transition-transform duration-300 ${open ? "rotate-180" : ""}`}
    >
      <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function WeeklyBarGraph({
  usage,
  keys,
  selected,
  onSelect,
}: {
  usage: UsageHistory;
  keys: DateKey[];
  selected: DateKey;
  onSelect: (key: DateKey) => void;
}) {
  const totals = keys.map((k) => dayTotal(usage, k));
  const max = Math.max(1, ...totals);
  return (
    <div className="relative h-28">
      <div className="flex h-full items-end justify-between gap-1.5 pb-6">
        {keys.map((key, i) => {
          const active = key === selected;
          const has = totals[i] > 0;
          const height = has ? Math.max(8, Math.round((totals[i] / max) * 76)) : 3;
          return (
            <button
              key={key}
              onClick={() => onSelect(key)}
              aria-label={`${dayLabel(key)} ${msToHuman(totals[i])}`}
              className="group flex h-full flex-1 items-end justify-center cursor-pointer"
            >
              <div
                style={{ height }}
                className={`w-full max-w-[13px] rounded-full transition-all duration-300 ease-out ${
                  active ? "bg-accent shadow-sm" : has ? "bg-line group-hover:bg-faint" : "bg-line/50"
                }`}
              />
            </button>
          );
        })}
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-6 h-px bg-line/70" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-between gap-1.5">
        {keys.map((key) => (
          <span
            key={key}
            className={`flex-1 text-center text-[11px] transition-colors ${
              key === selected ? "font-semibold text-ink" : "text-muted"
            }`}
          >
            {dayLabel(key)}
          </span>
        ))}
      </div>
    </div>
  );
}

function DomainItem({ row, color }: { row: DomainRow; color?: string }) {
  const [open, setOpen] = useState(false);
  const hasPaths = row.paths.length > 1;
  const letterColor = color || "var(--muted)";

  return (
    <div className="border-b border-line/50 last:border-0">
      <button
        className="-mx-2 flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left transition-colors hover:bg-state cursor-pointer"
        onClick={() => hasPaths && setOpen((v) => !v)}
      >
        <span
          className="font-display grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold leading-none shadow-sm"
          style={{
            backgroundColor: color ? `${color}20` : "var(--surface-2)",
            color: color || "var(--muted)",
            border: color ? `1px solid ${color}40` : "1px solid var(--line)",
          }}
        >
          {row.domain[0]?.toUpperCase() ?? "?"}
        </span>
        <div className="flex-1 min-w-0">
          <span className="block truncate text-sm font-medium text-ink">{row.domain}</span>
          {hasPaths && (
            <span className="text-[11px] text-muted">{row.paths.length} pages visited</span>
          )}
        </div>
        {hasPaths && <Chevron open={open} />}
        <span className="tnum shrink-0 text-sm font-semibold text-muted">{msToHuman(row.ms)}</span>
      </button>
      {open && (
        <div className="flex flex-col gap-1.5 pb-3 pl-12 pr-2">
          {row.paths.slice(0, 6).map((p) => (
            <div key={p.path} className="flex items-center justify-between text-xs text-muted">
              <span className="truncate pr-3">{p.path}</span>
              <span className="tnum shrink-0">{msToHuman(p.ms)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function DomainList({ rows, emptyMessage }: { rows: DomainRow[]; emptyMessage: string }) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-12 text-center">
        <span className="h-2 w-2 animate-pulse rounded-full bg-accent" />
        <p className="text-sm text-muted">{emptyMessage}</p>
      </div>
    );
  }
  return (
    <div className="flex flex-col">
      {rows.map((row, i) => (
        <DomainItem
          key={row.domain}
          row={row}
          color={i < DOMAIN_PALETTE.length ? DOMAIN_PALETTE[i] : undefined}
        />
      ))}
    </div>
  );
}

function NavBtn({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="grid h-7 w-7 place-items-center rounded-full text-base text-muted transition-colors hover:bg-state hover:text-ink disabled:opacity-25 disabled:hover:bg-transparent cursor-pointer"
    >
      {children}
    </button>
  );
}

export function UsageView({ usage }: { usage: UsageHistory }) {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selected, setSelected] = useState(todayKey());
  const keys = useMemo(() => weekKeys(weekOffset), [weekOffset]);

  const rows = useMemo(() => domainsForDay(usage, selected), [usage, selected]);
  const total = useMemo(() => rows.reduce((s, r) => s + r.ms, 0), [rows]);
  const isToday = selected === todayKey();

  return (
    <div className="rise flex flex-col gap-5">
      {/* Visual ScreenTime Donut Card */}
      <div className="card p-5 relative overflow-hidden">
        <ScreenTimeDonutChart
          label={isToday ? "SCREENTIME" : friendlyDate(selected).toUpperCase()}
          totalMs={total}
          rows={rows}
        />
      </div>

      {/* Weekly Activity Bar Chart */}
      <div className="card px-4 pb-3 pt-4">
        <div className="flex items-center justify-between mb-2 px-1">
          <p className="label">Weekly Overview</p>
          <span className="text-xs text-muted font-medium">{weekRangeLabel(keys)}</span>
        </div>
        <WeeklyBarGraph usage={usage} keys={keys} selected={selected} onSelect={setSelected} />
        <div className="mt-1 flex items-center justify-center gap-2 text-xs text-muted">
          <NavBtn onClick={() => setWeekOffset((o) => o + 1)}>‹</NavBtn>
          <span className="tnum min-w-[140px] text-center">{weekRangeLabel(keys)}</span>
          <NavBtn onClick={() => setWeekOffset((o) => Math.max(0, o - 1))} disabled={weekOffset === 0}>
            ›
          </NavBtn>
        </div>
      </div>

      {/* Visited Websites Breakdown */}
      <div>
        <div className="flex items-center justify-between mb-2 px-1">
          <p className="label">{isToday ? "Top Sites Today" : "Top Visited Sites"}</p>
          {rows.length > 0 && (
            <span className="text-xs text-muted font-medium">{rows.length} {rows.length === 1 ? "site" : "sites"}</span>
          )}
        </div>
        <DomainList
          rows={rows}
          emptyMessage={isToday ? "No sites visited yet today. Enjoy the peace and focus." : "No browsing recorded that day."}
        />
      </div>
    </div>
  );
}

// Shared form primitives used by the blocker editors.

export function Slider({
  value,
  min,
  max,
  step = 1,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="slider"
    />
  );
}

export function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!on)}
      role="switch"
      aria-checked={on}
      className={`relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors duration-300 cursor-pointer ${
        on ? "bg-accent" : "bg-surface-2"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 rounded-full shadow-sm transition-transform duration-300 ease-out ${
          on ? "translate-x-[18px] bg-bg" : "translate-x-[3px] bg-faint"
        }`}
      />
    </button>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex w-full gap-1 rounded-pill bg-surface-2 p-1">
      {options.map((o) => {
        const sel = value === o.value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            className={`flex-1 whitespace-nowrap rounded-pill px-3 py-1.5 text-xs font-medium transition-all duration-200 cursor-pointer ${
              sel ? "bg-surface text-ink shadow-soft" : "text-muted hover:text-ink"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function DayChips({ active, onToggle }: { active: boolean[]; onToggle: (i: number) => void }) {
  return (
    <div className="flex gap-1.5">
      {DAY_LABELS.map((label, i) => (
        <button
          key={i}
          onClick={() => onToggle(i)}
          className={`h-9 w-9 rounded-full text-xs font-medium transition-all duration-200 cursor-pointer ${
            active[i] ? "bg-accent text-bg" : "bg-surface-2 text-muted hover:text-accent"
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  override state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="card p-6 text-center">
          <p className="text-sm text-muted">A quiet error occurred while rendering this section.</p>
        </div>
      );
    }
    return this.props.children;
  }
}
