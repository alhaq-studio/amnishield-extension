import { useEffect, useState } from "react";
import { useAmnShield } from "../../ui/useStore";
import { UsageView, ErrorBoundary } from "../../ui/components";
import { GroupManager } from "../../ui/blocker";
import { FocusPanel } from "../../ui/focus";
import { AboutPanel } from "../../ui/about";
import { ProtectionPanel } from "../../ui/protection";
import { PasswordLock } from "../../ui/PasswordLock";
import type { Settings } from "../../lib/types";

type Tab = "usage" | "website" | "focus" | "protection" | "about";

const TABS: { value: Tab; label: string }[] = [
  { value: "usage", label: "Usage" },
  { value: "website", label: "Website Blocker" },
  { value: "focus", label: "Focus" },
  { value: "protection", label: "Protection" },
  { value: "about", label: "About" },
];

function BlockedPage({ domain }: { domain: string }) {
  const handleLeave = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.location.href = "about:blank";
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-6 py-12 text-slate-100 font-sans">
      <div className="relative flex max-w-lg flex-col items-center text-center gap-6 p-8 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-2xl backdrop-blur-xl">
        <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 shadow-inner">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
            <span>🛡️ AmnShield Active Protection</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white mt-1">Access Restricted</h1>
        </div>

        <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 w-full text-center">
          <span className="text-xs font-medium text-slate-400 uppercase tracking-widest block mb-1">Blocked Target</span>
          <span className="font-mono text-base font-bold text-emerald-400 break-all">{domain}</span>
        </div>

        <blockquote className="text-sm italic text-slate-300 border-l-2 border-emerald-500/50 pl-4 my-1 text-left">
          "Take a mindful moment to step back and focus on what truly matters today."
        </blockquote>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full pt-2">
          <button
            onClick={handleLeave}
            className="w-full sm:w-auto flex-1 py-3 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition-all shadow-lg hover:shadow-emerald-500/25 cursor-pointer"
          >
            Go Back to Safety
          </button>
          <a
            href="https://app.amnshield.com"
            target="_blank"
            rel="noreferrer"
            className="w-full sm:w-auto flex-1 py-3 px-6 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm transition-all border border-slate-700 text-center"
          >
            Manage Rules Console
          </a>
        </div>
      </div>
    </div>
  );
}

export function App() {
  const { usage, settings, focus, focusLog, ready, saveSettings } = useAmnShield();
  const [draft, setDraft] = useState<Settings | null>(null);
  const [tab, setTab] = useState<Tab>("usage");
  const [isLocked, setIsLocked] = useState<boolean>(false);

  // Check if routed as Blocked Page
  const hash = window.location.hash;
  const searchParams = new URLSearchParams(window.location.search);
  const blockedDomainParam =
    searchParams.get("domain") || (hash.includes("domain=") ? decodeURIComponent(hash.split("domain=")[1]) : null);

  useEffect(() => {
    if (ready && !draft) {
      setDraft(settings);
      if (settings.password) {
        setIsLocked(true);
      }
    }
  }, [ready, settings, draft]);

  if (blockedDomainParam) {
    return <BlockedPage domain={blockedDomainParam} />;
  }

  if (!draft) return null;

  const commit = (next: Settings) => {
    setDraft(next);
    void saveSettings(next);
  };

  const handleUpgradePassword = async (newHash: string) => {
    commit({ ...draft, password: newHash });
  };

  const handleEmergencyReset = async () => {
    const nextSettings = { ...draft };
    delete nextSettings.password;
    delete nextSettings.securityQuestion;
    delete nextSettings.securityAnswer;
    commit(nextSettings);
  };

  if (isLocked && draft.password) {
    return (
      <PasswordLock
        storedHash={draft.password}
        storedQuestion={draft.securityQuestion}
        storedAnswerHash={draft.securityAnswer}
        onUnlock={() => setIsLocked(false)}
        onEmergencyReset={handleEmergencyReset}
        onUpgradePassword={handleUpgradePassword}
      />
    );
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-7 px-6 py-14">
      <header>
        <div className="flex items-center gap-2.5">
          <h1 className="font-display text-5xl leading-none">Amn Shield</h1>
          <span className="mt-1 h-2 w-2 animate-pulse rounded-full bg-ink/40" />
        </div>
        <p className="mt-2 text-sm text-muted">Halal-first browsing protection</p>
      </header>

      <nav className="-mt-1 flex gap-1 border-b border-line">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`relative px-4 py-3 text-sm font-medium transition-colors ${
              tab === t.value ? "text-ink" : "text-muted hover:text-ink"
            }`}
          >
            {t.label}
            {tab === t.value && <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-ink" />}
          </button>
        ))}
      </nav>

      <ErrorBoundary key={tab}>
        <div className="rise">
          {tab === "usage" && <UsageView usage={usage} />}
          {tab === "website" && (
            <>
              <GroupManager groups={draft.groups} onChange={(groups) => commit({ ...draft, groups })} />
              <KeywordHelp />
            </>
          )}
          {tab === "focus" && (
            <FocusPanel
              focus={focus}
              focusGroups={draft.focusGroups}
              focusLog={focusLog}
              onChangeGroups={(focusGroups) => commit({ ...draft, focusGroups })}
            />
          )}
          {tab === "protection" && (
            <ProtectionPanel settings={draft} onChange={commit} />
          )}
          {tab === "about" && <AboutPanel />}
        </div>
      </ErrorBoundary>
    </div>
  );
}

function KeywordHelp() {
  const rows: [string, string][] = [
    ["Block a whole site", "youtube.com"],
    ["Block one section", "youtube.com/shorts"],
    ["Block a path on any site", "/shorts"],
    ["Block all subdomains", "*.youtube.com"],
    ["Block by domain word", "youtube"],
    ["Advanced match", "r:shorts|reels"],
  ];
  return (
    <div className="card mt-6 p-5">
      <p className="label mb-3">How to write keywords</p>
      <div className="flex flex-col gap-2.5">
        {rows.map(([what, type]) => (
          <div key={type} className="flex items-center justify-between gap-3 text-xs">
            <span className="text-muted">{what}</span>
            <span className="rounded-md bg-surface-2 px-2 py-1 font-mono text-ink">{type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
