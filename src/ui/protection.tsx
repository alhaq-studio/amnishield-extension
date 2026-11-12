import { useEffect, useState } from "react";
import { Toggle, btnPrimary, btnOutline, btnGhost, inputCls, selectCls } from "./components";
import { hashPassword, hashSecurityAnswer } from "../lib/password";
import {
  defaultFocusModePolicy,
  defaultReelBlocker,
  type ReelBlockerConfig,
  type Settings,
  type UserProfileConfig,
} from "../lib/types";
import {
  claimConsolePairingPin,
  getCloudSyncStatus,
  pullAndApplyCloudPolicy,
  pushLocalPolicyToCloud,
  restorePreSyncRuleSnapshot,
  signInCloudAccount,
  signOutCloudAccount,
  signUpCloudAccount,
  unpairConsoleDevice,
  type ApplyMode,
  type CloudSyncStatus,
} from "../lib/cloudSync";

const AVAILABLE_CATEGORIES: { id: string; label: string }[] = [
  { id: "adult", label: "Adult / NSFW" },
  { id: "harmful", label: "Harmful & Vice" },
  { id: "gambling", label: "Gambling & Betting" },
  { id: "social", label: "Social Media" },
  { id: "dating", label: "Dating" },
  { id: "shorts", label: "Short-Form Videos" },
];

export function ProtectionPanel({
  settings,
  onChange,
}: {
  settings: Settings;
  onChange: (next: Settings) => void;
}) {
  const [passwordInput, setPasswordInput] = useState("");
  const [questionInput, setQuestionInput] = useState(settings.securityQuestion || "");
  const [answerInput, setAnswerInput] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [showQuestionForm, setShowQuestionForm] = useState(false);

  // Cloud Sync & Account / Console Pairing State
  const [syncStatus, setSyncStatus] = useState<CloudSyncStatus | null>(null);
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authMode, setAuthMode] = useState<"signin" | "signup">("signin");
  const [pairingPin, setPairingPin] = useState("");
  const [deviceNameInput, setDeviceNameInput] = useState("AmniShield Browser Extension");
  const [syncBusy, setSyncBusy] = useState(false);
  const [syncBanner, setSyncBanner] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showPullModal, setShowPullModal] = useState(false);

  // Profile Setup State
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileDraft, setProfileDraft] = useState<UserProfileConfig>(
    settings.userProfile ?? {
      displayName: "",
      email: "",
      bio: "",
      role: "personal",
      dailyGoalMinutes: 120,
    },
  );

  // Keyword Filter input
  const [keywordInput, setKeywordInput] = useState("");

  const refreshSyncStatus = async () => {
    const st = await getCloudSyncStatus();
    setSyncStatus(st);
    if (st.deviceName) setDeviceNameInput(st.deviceName);
  };

  useEffect(() => {
    void refreshSyncStatus();
  }, []);

  useEffect(() => {
    if (settings.userProfile) {
      setProfileDraft((prev) => ({ ...prev, ...settings.userProfile }));
    }
  }, [settings.userProfile]);

  const reelCfg: ReelBlockerConfig = settings.reelBlocker ?? defaultReelBlocker();
  const updateReelCfg = (patch: Partial<ReelBlockerConfig>) => {
    onChange({
      ...settings,
      reelBlocker: { ...reelCfg, ...patch },
    });
  };

  const toggleCategory = (catId: string) => {
    const current = new Set((settings.blockedCategories ?? []).map((c) => c.toLowerCase()));
    if (current.has(catId)) current.delete(catId);
    else current.add(catId);
    const nextCats = Array.from(current);
    onChange({
      ...settings,
      blockedCategories: nextCats,
      adultContentEnabled: nextCats.includes("adult") ? true : settings.adultContentEnabled,
      harmfulContentEnabled: nextCats.includes("harmful") ? true : settings.harmfulContentEnabled,
    });
  };

  const handleAddKeyword = () => {
    const clean = keywordInput.trim().toLowerCase();
    if (!clean) return;
    const existing = settings.blockedKeywords ?? [];
    if (!existing.includes(clean)) {
      onChange({
        ...settings,
        blockedKeywords: [...existing, clean],
      });
    }
    setKeywordInput("");
  };

  const handleRemoveKeyword = (kw: string) => {
    onChange({
      ...settings,
      blockedKeywords: (settings.blockedKeywords ?? []).filter((k) => k !== kw),
    });
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    onChange({
      ...settings,
      userProfile: {
        ...profileDraft,
        displayName: profileDraft.displayName?.trim() || "",
        email: profileDraft.email?.trim() || syncStatus?.userEmail || "",
        bio: profileDraft.bio?.trim() || "",
        role: profileDraft.role || "personal",
        dailyGoalMinutes: Number(profileDraft.dailyGoalMinutes) || 120,
      },
    });
    setSyncBanner({ type: "success", text: "Profile preferences saved." });
    setProfileOpen(false);
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSyncBusy(true);
    setSyncBanner(null);
    try {
      const res =
        authMode === "signin"
          ? await signInCloudAccount(authEmail, authPassword)
          : await signUpCloudAccount(authEmail, authPassword, profileDraft.displayName);
      setSyncBanner({ type: res.success ? "success" : "error", text: res.message });
      if (res.success) {
        setAuthPassword("");
        await refreshSyncStatus();
      }
    } finally {
      setSyncBusy(false);
    }
  };

  const handleSignOut = async () => {
    setSyncBusy(true);
    setSyncBanner(null);
    try {
      await signOutCloudAccount();
      await refreshSyncStatus();
      setSyncBanner({ type: "success", text: "Signed out of AmniShield Cloud Account." });
    } finally {
      setSyncBusy(false);
    }
  };

  const handlePairPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pairingPin.trim()) return;
    setSyncBusy(true);
    setSyncBanner(null);
    try {
      const res = await claimConsolePairingPin(pairingPin, deviceNameInput);
      setSyncBanner({ type: res.success ? "success" : "error", text: res.message });
      if (res.success) {
        setPairingPin("");
        await refreshSyncStatus();
      }
    } finally {
      setSyncBusy(false);
    }
  };

  const handleUnpair = async () => {
    setSyncBusy(true);
    setSyncBanner(null);
    try {
      await unpairConsoleDevice();
      await refreshSyncStatus();
      setSyncBanner({ type: "success", text: "Device unpaired from Admin Console." });
    } finally {
      setSyncBusy(false);
    }
  };

  const handleExecutePull = async (mode: ApplyMode) => {
    setShowPullModal(false);
    setSyncBusy(true);
    setSyncBanner(null);
    try {
      const summary = await pullAndApplyCloudPolicy(mode);
      setSyncBanner({
        type: summary.success ? "success" : "error",
        text: summary.message,
      });
      await refreshSyncStatus();
    } finally {
      setSyncBusy(false);
    }
  };

  const handlePushToCloud = async () => {
    setSyncBusy(true);
    setSyncBanner(null);
    try {
      const res = await pushLocalPolicyToCloud();
      setSyncBanner({
        type: res.success ? "success" : "error",
        text: res.message,
      });
      await refreshSyncStatus();
    } finally {
      setSyncBusy(false);
    }
  };

  const handleRestoreSnapshot = async () => {
    setSyncBusy(true);
    setSyncBanner(null);
    try {
      const ok = await restorePreSyncRuleSnapshot();
      setSyncBanner({
        type: ok ? "success" : "error",
        text: ok
          ? "Restored local rules and schedules from pre-sync backup snapshot."
          : "No pre-sync backup snapshot available to restore.",
      });
      await refreshSyncStatus();
    } finally {
      setSyncBusy(false);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("");
    setError("");

    if (passwordInput.length < 4) {
      setError("Password must be at least 4 characters long.");
      return;
    }

    const hashed = await hashPassword(passwordInput);
    onChange({ ...settings, password: hashed });
    setStatus("Password configured successfully! Bismillah.");
    setPasswordInput("");
  };

  const handleRemovePassword = () => {
    if (
      window.confirm(
        "Are you sure you want to remove password protection? This will allow anyone to modify blocking preferences or disable protection.",
      )
    ) {
      const next = { ...settings };
      delete next.password;
      delete next.securityQuestion;
      delete next.securityAnswer;
      onChange(next);
      setStatus("Password protection removed.");
    }
  };

  const handleSetSecurityQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("");
    setError("");

    if (!questionInput || !answerInput.trim()) {
      setError("Please select a question and provide an answer.");
      return;
    }

    const hashedAnswer = await hashSecurityAnswer(answerInput);
    onChange({
      ...settings,
      securityQuestion: questionInput,
      securityAnswer: hashedAnswer,
    });
    setStatus("Security question configured successfully! Alhamdulillah.");
    setAnswerInput("");
    setShowQuestionForm(false);
  };

  const statusBadgeLabel =
    syncStatus?.mode === "console_managed"
      ? "Console Managed"
      : syncStatus?.mode === "personal_cloud"
      ? "Personal Cloud Sync"
      : "Standalone";

  return (
    <div className="flex flex-col gap-6">
      {/* Warning / Confirmation Modal for Pull / Force Apply Remote Rules */}
      {showPullModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pull-policy-modal-title"
        >
          <div className="card w-full max-w-md p-6 flex flex-col gap-4 border border-line shadow-2xl">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/15 text-amber-500 border border-amber-500/30">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div>
                <h3 id="pull-policy-modal-title" className="font-semibold text-base text-ink">
                  Pull / Force Apply Remote Rules &amp; Policies
                </h3>
                <p className="text-xs text-muted mt-1 leading-relaxed">
                  Pulling remote rules fetches the latest schedules, blocked websites, keywords, categories, and
                  short-form video limits from your Cloud Account or Admin Console.
                </p>
              </div>
            </div>

            <div className="rounded-xl bg-surface-2/80 border border-line p-3.5 text-xs text-muted space-y-1.5">
              <p className="text-ink font-medium">How would you like to apply remote rules?</p>
              <p>
                <strong>Force Apply (Overwrite Local):</strong> Replaces conflicting local domain lists, keywords,
                categories, and policy schedules with the remote policy. An automatic local backup snapshot is saved
                first so you can restore anytime.
              </p>
              <p>
                <strong>Merge with Local Rules:</strong> Combines remote blocked domains, keywords, categories, and
                schedules with your existing local rules without removing local entries.
              </p>
            </div>

            <div className="flex flex-col gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => void handleExecutePull("FORCE_REPLACE")}
                className={`${btnPrimary} w-full justify-center`}
              >
                Force Apply (Overwrite Local)
              </button>
              <button
                type="button"
                onClick={() => void handleExecutePull("MERGE")}
                className={`${btnOutline} w-full justify-center`}
              >
                Merge with Local Rules
              </button>
              <button
                type="button"
                onClick={() => setShowPullModal(false)}
                className={`${btnGhost} py-1.5 text-center`}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      <section className="card p-6">
        <h2 className="text-xl font-semibold mb-1">AmniShield Protection</h2>
        <p className="text-sm text-muted">
          Configure baseline faith-protection, short-form video filters, cloud policy sync, and screen time controls.
        </p>
      </section>

      {/* Account, Profile & Cloud Sync Hub */}
      <section className="card p-6 flex flex-col gap-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-semibold text-sm">Cloud Sync, Account &amp; Remote Policies</h3>
            <p className="text-xs text-muted leading-normal mt-1">
              Pair with the Web Admin Console or sign in to sync rules, schedules, and limits across Android, Windows,
              and Browser.
            </p>
          </div>
          <span
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
              syncStatus?.mode === "console_managed"
                ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
                : syncStatus?.mode === "personal_cloud"
                ? "bg-accent/15 text-accent border-accent/30"
                : "bg-surface-2 text-muted border-line"
            }`}
          >
            {statusBadgeLabel}
          </span>
        </div>

        {/* Live Sync Metadata Summary */}
        <div className="rounded-xl bg-surface-2/60 border border-line p-3.5 text-xs flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-muted">Sync Mode:</span>
            <span className="font-medium text-ink">{statusBadgeLabel}</span>
          </div>
          {(syncStatus?.userEmail || settings.userProfile?.email) && (
            <div className="flex items-center justify-between">
              <span className="text-muted">Account:</span>
              <span className="font-mono text-ink">{syncStatus?.userEmail || settings.userProfile?.email}</span>
            </div>
          )}
          {syncStatus?.deviceId && (
            <div className="flex items-center justify-between">
              <span className="text-muted">Paired Device ID:</span>
              <span className="font-mono text-ink truncate max-w-[200px]">{syncStatus.deviceId}</span>
            </div>
          )}
          <div className="flex items-center justify-between">
            <span className="text-muted">Last Policy Sync:</span>
            <span className="text-ink">
              {syncStatus?.lastSyncedAt ? new Date(syncStatus.lastSyncedAt).toLocaleString() : "Never synced"}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted">Active Policy Schedules:</span>
            <span className="font-semibold text-ink">{(settings.policySchedules ?? []).length}</span>
          </div>
        </div>

        {syncBanner && (
          <div
            className={`rounded-xl p-3 text-xs font-medium border ${
              syncBanner.type === "success"
                ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/30"
                : "bg-red-500/10 text-red-400 border-red-500/30"
            }`}
          >
            {syncBanner.text}
          </div>
        )}

        {/* Primary Action Buttons: Pull / Force Apply, Push to Cloud, Restore Backup */}
        <div className="flex flex-wrap gap-2.5">
          <button
            type="button"
            disabled={syncBusy}
            onClick={() => setShowPullModal(true)}
            className={`${btnPrimary} text-xs`}
          >
            Pull / Force Apply Remote Rules
          </button>
          <button
            type="button"
            disabled={syncBusy}
            onClick={() => void handlePushToCloud()}
            className={`${btnOutline} text-xs`}
          >
            Push Current Rules to Cloud
          </button>
          {syncStatus?.hasPreSyncSnapshot && (
            <button
              type="button"
              disabled={syncBusy}
              onClick={() => void handleRestoreSnapshot()}
              className={`${btnOutline} text-xs`}
              title={
                syncStatus.preSyncSnapshotTimestamp
                  ? `Backup saved ${new Date(syncStatus.preSyncSnapshotTimestamp).toLocaleString()}`
                  : "Restore pre-sync local backup"
              }
            >
              Restore Pre-Sync Local Backup
            </button>
          )}
        </div>

        <hr className="border-line" />

        {/* Console 6-Digit PIN Pairing */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm">Admin Console PIN Pairing</p>
              <p className="text-xs text-muted mt-0.5">
                Link this browser with a 6-digit pairing PIN generated in the AmniShield Web Console.
              </p>
            </div>
            {syncStatus?.isPairedWithConsole && (
              <button type="button" onClick={() => void handleUnpair()} className={`${btnOutline} text-xs`}>
                Unpair
              </button>
            )}
          </div>

          {!syncStatus?.isPairedWithConsole && (
            <form onSubmit={handlePairPin} className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                placeholder="Device label (e.g. Work Browser)"
                value={deviceNameInput}
                onChange={(e) => setDeviceNameInput(e.target.value)}
                className={`${inputCls} flex-1`}
              />
              <input
                type="text"
                placeholder="6-digit Console PIN"
                value={pairingPin}
                onChange={(e) => setPairingPin(e.target.value)}
                maxLength={12}
                className={`${inputCls} sm:w-40 font-mono`}
                required
              />
              <button type="submit" disabled={syncBusy} className={`${btnOutline} text-xs shrink-0`}>
                Pair Device
              </button>
            </form>
          )}
        </div>

        <hr className="border-line" />

        {/* Cloud Account Sign-In & Profile Setup */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-sm">AmniShield Cloud Account &amp; Profile</p>
              <p className="text-xs text-muted mt-0.5">
                Sign in with your personal AmniShield account to sync rules and profile across devices.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setProfileOpen((v) => !v)}
              className="text-xs font-medium text-accent hover:underline cursor-pointer"
            >
              {profileOpen ? "Hide Profile" : "Edit Profile"}
            </button>
          </div>

          {syncStatus?.isLoggedIn ? (
            <div className="flex items-center justify-between rounded-xl bg-surface-2/50 border border-line px-3.5 py-2.5 text-xs">
              <span>
                Signed in as <strong>{syncStatus.userEmail}</strong>
              </span>
              <button type="button" onClick={() => void handleSignOut()} className="text-accent hover:underline">
                Sign Out
              </button>
            </div>
          ) : (
            <form onSubmit={handleAuthSubmit} className="flex flex-col gap-3">
              <div className="flex flex-col sm:flex-row gap-2.5">
                <input
                  type="email"
                  placeholder="Account email..."
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className={`${inputCls} flex-1`}
                  required
                />
                <input
                  type="password"
                  placeholder="Password..."
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className={`${inputCls} flex-1`}
                  required
                />
              </div>
              <div className="flex items-center gap-3">
                <button type="submit" disabled={syncBusy} className={`${btnOutline} text-xs`}>
                  {authMode === "signin" ? "Sign In" : "Create Account"}
                </button>
                <button
                  type="button"
                  onClick={() => setAuthMode(authMode === "signin" ? "signup" : "signin")}
                  className="text-xs text-muted hover:text-ink"
                >
                  {authMode === "signin" ? "Need an account? Sign Up" : "Have an account? Sign In"}
                </button>
              </div>
            </form>
          )}

          {profileOpen && (
            <form
              onSubmit={handleSaveProfile}
              className="mt-2 rounded-2xl bg-surface-2/40 border border-line p-4 flex flex-col gap-3"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-muted">Profile Setup</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Display Name"
                  value={profileDraft.displayName ?? ""}
                  onChange={(e) => setProfileDraft({ ...profileDraft, displayName: e.target.value })}
                  className={inputCls}
                />
                <select
                  value={profileDraft.role ?? "personal"}
                  onChange={(e) => setProfileDraft({ ...profileDraft, role: e.target.value })}
                  className={selectCls}
                >
                  <option value="personal">Personal Profile</option>
                  <option value="student">Student / Study</option>
                  <option value="work">Professional / Work</option>
                  <option value="parent">Parent / Family Guardian</option>
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="text-xs text-muted flex items-center gap-2">
                  Daily Screen-Time Goal (min):
                  <input
                    type="number"
                    min={15}
                    max={720}
                    value={profileDraft.dailyGoalMinutes ?? 120}
                    onChange={(e) =>
                      setProfileDraft({ ...profileDraft, dailyGoalMinutes: Math.max(15, Number(e.target.value)) })
                    }
                    className={`${inputCls} w-20`}
                  />
                </label>
                <input
                  type="text"
                  placeholder="Bio or Focus Intention"
                  value={profileDraft.bio ?? ""}
                  onChange={(e) => setProfileDraft({ ...profileDraft, bio: e.target.value })}
                  className={inputCls}
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="submit" className={`${btnPrimary} text-xs`}>
                  Save Profile
                </button>
                <button type="button" onClick={() => setProfileOpen(false)} className={`${btnGhost} text-xs`}>
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* Core Faith & Category Filters */}
      <section className="card p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-sm">Adult/NSFW Content Blocker</p>
            <p className="text-xs text-muted mt-1 leading-normal">
              Blocks pornography and sexually explicit websites. Works strictly at the network level.
            </p>
          </div>
          <Toggle
            on={settings.adultContentEnabled}
            onChange={(v) => onChange({ ...settings, adultContentEnabled: v })}
          />
        </div>

        <hr className="border-line" />

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-sm">Harmful Content Blocker</p>
            <p className="text-xs text-muted mt-1 leading-normal">
              Blocks gambling, betting, liquor, astrology, interest/riba, and pagan sites.
            </p>
          </div>
          <Toggle
            on={settings.harmfulContentEnabled}
            onChange={(v) => onChange({ ...settings, harmfulContentEnabled: v })}
          />
        </div>

        <hr className="border-line" />

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-sm">Strict Safe Search</p>
            <p className="text-xs text-muted mt-1 leading-normal">
              Forces Safe Search mode on Google, Bing, DuckDuckGo, Yahoo, and YouTube.
            </p>
          </div>
          <Toggle
            on={settings.safeSearchEnabled}
            onChange={(v) => onChange({ ...settings, safeSearchEnabled: v })}
          />
        </div>

        <hr className="border-line" />

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-sm">Strict Mode &amp; Unblur Lock</p>
            <p className="text-xs text-muted mt-1 leading-normal">
              Prevents bypassing block overlays and locks active Focus sessions until their timer completes.
            </p>
          </div>
          <Toggle
            on={Boolean(settings.strictMode || settings.allowUnblur === false)}
            onChange={(v) =>
              onChange({
                ...settings,
                strictMode: v,
                allowUnblur: !v,
                focusModePolicy: {
                  ...(settings.focusModePolicy ?? defaultFocusModePolicy()),
                  strictness: v ? 1 : 0,
                  allow_early_stop: !v,
                },
              })
            }
          />
        </div>

        <hr className="border-line" />

        <div>
          <p className="font-semibold text-sm mb-2">Protected Categories</p>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_CATEGORIES.map((cat) => {
              const active = (settings.blockedCategories ?? []).map((c) => c.toLowerCase()).includes(cat.id);
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => toggleCategory(cat.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                    active
                      ? "bg-accent text-bg border-accent"
                      : "bg-surface-2 text-muted border-line hover:text-ink"
                  }`}
                >
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Short-Form Video (Reels / Shorts / TikTok) Blocker */}
      <section className="card p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h3 className="font-semibold text-sm">Short-Form Video (Reels &amp; Shorts) Blocker</h3>
            <p className="text-xs text-muted mt-1 leading-normal">
              Block addictive vertical video feeds on YouTube Shorts, Instagram Reels, and TikTok while keeping normal
              pages accessible.
            </p>
          </div>
          <Toggle on={reelCfg.enabled} onChange={(enabled) => updateReelCfg({ enabled })} />
        </div>

        {reelCfg.enabled && (
          <div className="flex flex-col gap-3 pt-2 border-t border-line/70">
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["youtube", "YouTube Shorts"],
                  ["instagram", "Instagram Reels"],
                  ["tiktok", "TikTok"],
                  ["browser", "All Browser Short Videos"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => updateReelCfg({ [key]: !reelCfg[key] })}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                    reelCfg[key]
                      ? "bg-accent text-bg border-accent"
                      : "bg-surface-2 text-muted border-line hover:text-ink"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
              <label className="flex items-center gap-2 text-muted">
                Enforcement Mode:
                <select
                  value={reelCfg.mode}
                  onChange={(e) => updateReelCfg({ mode: Number(e.target.value) })}
                  className={`${selectCls} w-auto`}
                >
                  <option value={0}>Block Immediately (24/7)</option>
                  <option value={1}>Daily Time Allowance</option>
                </select>
              </label>

              {reelCfg.mode === 1 && (
                <label className="flex items-center gap-2 text-muted">
                  Daily Limit:
                  <input
                    type="number"
                    min={1}
                    max={240}
                    value={reelCfg.daily_limit_minutes}
                    onChange={(e) =>
                      updateReelCfg({ daily_limit_minutes: Math.max(1, Number(e.target.value) || 30) })
                    }
                    className={`${inputCls} w-16`}
                  />
                  min
                </label>
              )}
            </div>
          </div>
        )}
      </section>

      {/* Dedicated Keyword Filter Section (Separate from Blocked Domains) */}
      <section className="card p-6 flex flex-col gap-4">
        <div>
          <h3 className="font-semibold text-sm">Blocked Keywords Policy</h3>
          <p className="text-xs text-muted mt-1 leading-normal">
            Block URLs and paths containing specific keywords (kept separate from whole-domain network blocks).
          </p>
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Add keyword or path pattern (e.g. casino, /reels)..."
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddKeyword()}
            className={`${inputCls} flex-1`}
          />
          <button type="button" onClick={handleAddKeyword} className={`${btnOutline} text-xs`}>
            Add Keyword
          </button>
        </div>

        {(settings.blockedKeywords ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {(settings.blockedKeywords ?? []).map((kw) => (
              <span
                key={kw}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-surface-2 border border-line text-xs font-mono text-ink"
              >
                {kw}
                <button
                  type="button"
                  onClick={() => handleRemoveKeyword(kw)}
                  className="text-muted hover:text-ink cursor-pointer"
                  aria-label={`Remove keyword ${kw}`}
                >
                  x
                </button>
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Sync & Cloud Privacy Card */}
      <section className="card p-6 flex flex-col gap-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-sm">Dual-Sync &amp; Cloud Privacy</h3>
            <p className="text-xs text-muted leading-normal mt-1">
              Synchronize rules across your Android devices, Windows app, and browser extension.
            </p>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary text-[11px] font-semibold">
            Sync Hub Active
          </span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-sm">Local Windows App Sync</p>
              <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-500/10 text-emerald-400 font-medium">
                Auto-Detect
              </span>
            </div>
            <p className="text-xs text-muted mt-1 leading-normal">
              Accept live rule pushes from the local AmniShield Windows desktop daemon when running.
            </p>
          </div>
          <Toggle
            on={settings.syncRulesEnabled ?? true}
            onChange={(v) => onChange({ ...settings, syncRulesEnabled: v })}
          />
        </div>
        {(settings.syncRulesEnabled ?? true) && (
          <div className="ml-12 mt-1">
            <a
              href="https://github.com/alhaq-studio/amnishield-windows/releases/latest"
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1.5 text-[11px] text-primary font-medium hover:underline transition"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4"
                />
              </svg>
              <span>Don't have it yet? Download AmniShield Windows App</span>
            </a>
          </div>
        )}

        <hr className="border-line" />

        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <p className="font-semibold text-sm">AmniShield Cloud Sync</p>
              <span className="px-1.5 py-0.2 rounded text-[10px] bg-primary/15 text-primary font-medium">
                Cloud Connected
              </span>
            </div>
            <p className="text-xs text-muted mt-1 leading-normal">
              Synchronize custom blocklists and schedules directly with your AmniShield Cloud account.
            </p>
          </div>
          <Toggle
            on={settings.personalCloudSyncEnabled ?? settings.syncAppUsageEnabled ?? true}
            onChange={(v) =>
              onChange({ ...settings, personalCloudSyncEnabled: v, syncAppUsageEnabled: v })
            }
          />
        </div>

        <hr className="border-line" />

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-sm">Sync Website Browsing Metrics</p>
            <p className="text-xs text-muted mt-1 leading-normal">
              Sync web domain browsing duration to analyze time spent on productivity across devices.
            </p>
          </div>
          <Toggle
            on={settings.syncWebUsageEnabled ?? true}
            onChange={(v) => onChange({ ...settings, syncWebUsageEnabled: v })}
          />
        </div>

        <hr className="border-line" />

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-sm">Smart AI Recommendations</p>
            <p className="text-xs text-muted mt-1 leading-normal">
              Enable AI assistance for smart blocking suggestions and schedule optimization.
            </p>
          </div>
          <Toggle
            on={settings.smartRecommendationsEnabled ?? true}
            onChange={(v) => onChange({ ...settings, smartRecommendationsEnabled: v })}
          />
        </div>
      </section>

      {/* Password Protection Card */}
      <section className="card p-6 flex flex-col gap-4">
        <h3 className="font-semibold text-sm">Settings Password Protection</h3>
        <p className="text-xs text-muted leading-normal">
          Prevent children or unauthorized users from changing your blocking preferences or disabling protection.
        </p>

        {status && <p className="text-xs font-semibold text-teal-600">{status}</p>}
        {error && <p className="text-xs font-semibold text-accent">{error}</p>}

        {!settings.password ? (
          <form onSubmit={handleSetPassword} className="flex gap-3">
            <input
              type="password"
              placeholder="Set password..."
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className={`${inputCls} flex-1`}
              required
            />
            <button type="submit" className={btnPrimary}>
              Enable
            </button>
          </form>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-teal-600 font-semibold">Password Protection is Active</span>
              <button type="button" onClick={handleRemovePassword} className={btnOutline}>
                Disable Password
              </button>
            </div>

            <hr className="border-line/60" />

            {/* Security Question Setup */}
            {settings.securityQuestion ? (
              <p className="text-xs text-muted">Security Question Recovery is configured.</p>
            ) : !showQuestionForm ? (
              <button
                type="button"
                onClick={() => setShowQuestionForm(true)}
                className={`${btnOutline} w-fit`}
              >
                Configure Security Question Recovery
              </button>
            ) : (
              <form onSubmit={handleSetSecurityQuestion} className="flex flex-col gap-4 pt-2">
                <p className="text-xs font-medium text-ink">Set Recovery Question</p>
                <select
                  value={questionInput}
                  onChange={(e) => setQuestionInput(e.target.value)}
                  className={selectCls}
                  required
                >
                  <option value="">Choose a security question...</option>
                  <option value="mother">What is your mother's maiden name?</option>
                  <option value="birthplace">What city were you born in?</option>
                  <option value="school">What was the name of your first school?</option>
                  <option value="pet">What was your first pet's name?</option>
                  <option value="book">What is your favorite Islamic book?</option>
                  <option value="masjid">What is the name of your local masjid?</option>
                  <option value="teacher">Who was your favorite teacher?</option>
                </select>
                <input
                  type="text"
                  placeholder="Your answer..."
                  value={answerInput}
                  onChange={(e) => setAnswerInput(e.target.value)}
                  className={inputCls}
                  required
                />
                <div className="flex gap-2">
                  <button type="submit" className={btnPrimary}>
                    Save Question
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowQuestionForm(false)}
                    className={btnOutline}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
export default ProtectionPanel;
