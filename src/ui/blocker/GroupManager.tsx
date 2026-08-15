import { useState, useEffect } from "react";
import type { BlockGroup } from "../../lib/types";
import { newGroup } from "../../lib/types";
import { Toggle, btnOutline } from "../components";
import { MODE_LABEL } from "./constants";
import { GroupEditor } from "./GroupEditor";
import { get } from "../../lib/storage";

export function GroupManager({ groups, onChange }: { groups: BlockGroup[]; onChange: (groups: BlockGroup[]) => void }) {
  const [editing, setEditing] = useState<{ group: BlockGroup; isNew: boolean } | null>(null);
  const [windowsDomains, setWindowsDomains] = useState<string[]>([]);
  const [adultActive, setAdultActive] = useState<boolean>(false);
  const [socialActive, setSocialActive] = useState<boolean>(false);

  useEffect(() => {
    void get("guardianCustomDomains").then((d) => setWindowsDomains(d || []));
    void get("adultPackActive").then((a) => setAdultActive(!!a));
    void get("socialPackActive").then((s) => setSocialActive(!!s));
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
      {/* Windows Enforced System Packs & Rules */}
      {(adultActive || socialActive || windowsDomains.length > 0) && (
        <div className="rounded-2xl border border-accent/20 bg-accent/5 p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-1.5">
              🛡️ AmniShield Windows App Rules (Enforced)
            </span>
            <span className="text-[10px] text-muted font-medium bg-surface px-2 py-0.5 rounded-md border border-line">
              Master Authority
            </span>
          </div>

          {adultActive && (
            <div className="flex items-center justify-between border-b border-line/50 pb-2">
              <div>
                <p className="text-sm font-medium text-ink">🔞 Adult & NSFW Content Pack</p>
                <p className="text-xs text-muted">24/7 Blocked via Windows App</p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 font-semibold border border-emerald-500/20">
                🔒 Enforced
              </span>
            </div>
          )}

          {socialActive && (
            <div className="flex items-center justify-between border-b border-line/50 pb-2">
              <div>
                <p className="text-sm font-medium text-ink">💬 Social Media Pack</p>
                <p className="text-xs text-muted">24/7 Blocked via Windows App</p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 font-semibold border border-emerald-500/20">
                🔒 Enforced
              </span>
            </div>
          )}

          {windowsDomains.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <p className="text-sm font-medium text-ink">💻 Windows Companion Custom Sites</p>
              <div className="flex flex-wrap gap-1.5">
                {windowsDomains.map((domain) => (
                  <span
                    key={domain}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface border border-line text-xs font-mono text-ink"
                    title="Managed by AmniShield Windows App — Delete from Windows App only"
                  >
                    🔒 {domain}
                  </span>
                ))}
              </div>
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
            <button className="-mx-2 flex-1 rounded-xl px-2 py-1 text-left transition-colors hover:bg-state" onClick={() => setEditing({ group, isNew: false })}>
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
