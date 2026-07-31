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
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#f3f1ec] px-6 py-12 text-[#202724] dark:bg-[#140d26] dark:text-[#f3ecff]">
      <div className="flex max-w-md flex-col items-center text-center gap-6">
        <div className="relative flex h-24 w-24 items-center justify-center rounded-full border border-current animate-pulse">
          <span className="text-xs uppercase tracking-widest opacity-70">Breathe</span>
        </div>

        <h1 className="font-display text-3xl font-bold tracking-tight">Amn Shield Protection</h1>

        <p className="text-lg leading-relaxed opacity-85">
          <span className="font-semibold underline decoration-emerald-500">{domain}</span> is blocked by your active AmnShield focus & web filtering policy.
        </p>

        <p className="text-sm italic opacity-60">
          "Take a mindful moment to step back and focus on what truly matters today."
        </p>

        <button
          onClick={handleLeave}
          className="mt-4 rounded-full bg-[#3c7a67] px-8 py-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 dark:bg-[#c8b8ff] dark:text-[#140d26]"
        >
          Take me somewhere calmer
        </button>
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
