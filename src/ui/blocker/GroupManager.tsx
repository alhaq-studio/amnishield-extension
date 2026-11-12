import { useState, useEffect } from "react";
import type { BlockGroup, PolicyScheduleRule } from "../../lib/types";
import { newGroup } from "../../lib/types";
import { Toggle, btnOutline } from "../components";
import { DAY_NAMES, MODE_LABEL } from "./constants";
import { GroupEditor } from "./GroupEditor";
import { get, watch } from "../../lib/storage";
import { minutesToClock } from "../../lib/time";
import { normalizeScheduleDays } from "../../core/blocker";

export function GroupManager({
  groups,
  onChange,
}: {
  groups: BlockGroup[];
  onChange: (groups: BlockGroup[]) => void;
}) {
  const [editing, setEditing] = useState<{ group: BlockGroup; isNew: boolean } | null>(null);
  const [windowsDomains, setWindowsDomains] = useState<string[]>([]);
  const [adultActive, setAdultActive] = useState<boolean>(false);
  const [socialActive, setSocialActive] = useState<boolean>(false);
  const [policySchedules, setPolicySchedules] = useState<PolicyScheduleRule[]>([]);

  useEffect(() => {
    const load = async () => {
      const [custom, blocked, adult, social, settings] = await Promise.all([
        get("guardianCustomDomains"),
        get("blockedDomains"),
        get("adultPackActive"),
        get("socialPackActive"),
        get("settings"),
      ]);
      const combined = Array.from(new Set([...(custom || []), ...(blocked || [])]));
      setWindowsDomains(combined);
      setAdultActive(Boolean(adult));
      setSocialActive(Boolean(social));
      setPolicySchedules(settings.policySchedules ?? []);
    };
    void load();
    return watch(() => {
      void load();
    });
  }, []);

  if (editing) {
    return (
      <GroupEditor
        group={editing.group}
        onSave={(next) => {
          onChange(editing.isNew ? [...groups, next] : groups.map((g) => (g.id === next.id ? next : g)));
          setEditing(null);
        }}
        onCancel={() => setEditing(null)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Cloud / Windows Enforced System Packs, Domains & Policy Schedules */}
      {(adultActive || socialActive || windowsDomains.length > 0 || policySchedules.length > 0) && (
        <div className="rounded-2xl border border-accent/20 bg-accent/5 p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-1.5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
              <span>AmniShield Cloud &amp; System Policy Rules (Enforced)</span>
            </span>
            <span className="text-[10px] text-muted font-medium bg-surface px-2 py-0.5 rounded-md border border-line">
              Master Authority
            </span>
          </div>

          {adultActive && (
            <div className="flex items-center justify-between border-b border-line/50 pb-2">
              <div>
                <p className="text-sm font-medium text-ink">Adult &amp; NSFW Content Pack</p>
                <p className="text-xs text-muted">24/7 Blocked via System Policy</p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 font-semibold border border-emerald-500/20">
                Enforced
              </span>
            </div>
          )}

          {socialActive && (
            <div className="flex items-center justify-between border-b border-line/50 pb-2">
              <div>
                <p className="text-sm font-medium text-ink">Social Media Pack</p>
                <p className="text-xs text-muted">24/7 Blocked via System Policy</p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 font-semibold border border-emerald-500/20">
                Enforced
              </span>
            </div>
          )}

          {windowsDomains.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <p className="text-sm font-medium text-ink">Synced Blocked Domains</p>
              <div className="flex flex-wrap gap-1.5">
                {windowsDomains.map((domain) => (
                  <span
                    key={domain}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface border border-line text-xs font-mono text-ink"
                    title="Managed by AmniShield Policy"
                  >
                    {domain}
                  </span>
                ))}
              </div>
            </div>
          )}

          {policySchedules.length > 0 && (
            <div className="flex flex-col gap-2 pt-1 border-t border-line/50">
              <p className="text-sm font-medium text-ink">Synced Policy Schedules</p>
              {policySchedules.map((sched) => {
                const jsDays = normalizeScheduleDays(sched.selectedDays);
                const dayStr =
                  jsDays.length === 7 ? "Every day" : jsDays.map((d) => DAY_NAMES[d] ?? "").join(", ");
                return (
                  <div
                    key={sched.id}
                    className="flex items-center justify-between rounded-xl bg-surface/80 border border-line px-3 py-2 text-xs"
                  >
                    <div>
                      <p className="font-semibold text-ink">
                        {sched.title} <span className="text-muted font-normal">({sched.blockerType})</span>
                      </p>
                      <p className="text-muted">
                        {minutesToClock(sched.startMinute)} to {minutesToClock(sched.endMinute)} · {dayStr}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        sched.isEnabled
                          ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                          : "bg-surface-2 text-muted border-line"
                      }`}
                    >
                      {sched.isEnabled ? sched.type : "Paused"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Extension Custom Groups */}
      <div className="flex flex-col gap-2">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted mt-2">Extension Local Groups</h4>
        {groups.length === 0 && <p className="text-sm text-muted py-2">No local extension blocks yet. Add one below.</p>}
        {groups.map((group) => (
          <div key={group.id} className="flex items-center justify-between border-b border-line/70 py-3">
            <button
              className="-mx-2 flex-1 rounded-xl px-2 py-1 text-left transition-colors hover:bg-state"
              onClick={() => setEditing({ group, isNew: false })}
            >
              <p className="text-sm">{group.name}</p>
              <p className="text-xs text-muted">
                {group.matchers.length} site{group.matchers.length === 1 ? "" : "s"} · {MODE_LABEL[group.mode]}
              </p>
            </button>
            <div className="flex items-center gap-3 pl-3">
              <Toggle
                on={group.enabled}
                onChange={(on) => onChange(groups.map((g) => (g.id === group.id ? { ...g, enabled: on } : g)))}
              />
              <button
                onClick={() => onChange(groups.filter((g) => g.id !== group.id))}
                className="text-xs text-faint transition-colors hover:text-ink"
              >
                Remove
              </button>
            </div>
          </div>
        ))}
        <button
          onClick={() => setEditing({ group: newGroup(`New group ${groups.length + 1}`), isNew: true })}
          className={`mt-3 self-start ${btnOutline}`}
        >
          + New group
        </button>
      </div>
    </div>
  );
}
