import { useState, useEffect } from "react";
import { browser } from "#imports";
import { useAmnShield } from "../../ui/useStore";
import { UsageView, ErrorBoundary } from "../../ui/components";
import { FocusQuickControl } from "../../ui/focus";
import { pollGuardianStatus, type GuardianStatus } from "../../lib/guardianSync";

async function openOptions(): Promise<void> {
  const url = browser.runtime.getURL("/options.html");
  const [existing] = await browser.tabs.query({ url });
  if (existing?.id != null) {
    await browser.tabs.update(existing.id, { active: true });
    if (existing.windowId != null) await browser.windows.update(existing.windowId, { focused: true });
  } else {
    await browser.tabs.create({ url });
  }
  window.close();
}

function Header() {
  const [guardianStatus, setGuardianStatus] = useState<GuardianStatus | null>(null);

  useEffect(() => {
    void pollGuardianStatus().then(setGuardianStatus);
    const interval = setInterval(() => {
      void pollGuardianStatus().then(setGuardianStatus);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const isOnline = guardianStatus?.status === "online";

  return (
    <header className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <h1 className="font-display text-2xl leading-none tracking-tight">Amn Shield</h1>
        <span
          title={isOnline ? "Connected to AmnShield Windows Guardian Service" : "Standalone Browser Mode"}
          className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold tracking-wider ${
            isOnline
              ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30"
              : "bg-amber-500/15 text-amber-600 border border-amber-500/30"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              isOnline ? "bg-emerald-500 animate-pulse shadow-[0_0_6px_rgba(16,185,129,0.8)]" : "bg-amber-500"
            }`}
          />
          {isOnline ? "SYS SYNCED" : "STANDALONE"}
        </span>
      </div>
      <span className="flex items-center gap-1.5 text-[11px] text-faint">
        <span className="h-1.5 w-1.5 rounded-full bg-ink/40" />
        Today
      </span>
    </header>
  );
}

function Loading() {
  return (
    <div className="relative flex h-[480px] w-[360px] flex-col items-center justify-center overflow-hidden bg-bg">
      <div className="bloom" aria-hidden="true" />
      <span className="label relative">A quiet moment…</span>
    </div>
  );
}

export function App() {
  const { usage, settings, focus, ready } = useAmnShield();

  if (!ready) return <Loading />;

  return (
    <div className="flex min-h-[480px] w-[360px] flex-col gap-6 bg-bg px-5 py-6">
      <Header />
      <ErrorBoundary>
        <UsageView usage={usage} />
        <FocusQuickControl focus={focus} focusGroups={settings.focusGroups} />
      </ErrorBoundary>
      <button
        onClick={() => void openOptions()}
        className="mt-auto flex items-center justify-center gap-1.5 rounded-pill py-2.5 text-xs font-medium text-muted transition-colors hover:bg-state hover:text-ink"
      >
        Manage blocks and focus →
      </button>
    </div>
  );
}
