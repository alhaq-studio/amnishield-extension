import { useState } from "react";
import { Toggle, btnPrimary, btnOutline, inputCls, selectCls } from "./components";
import { hashPassword, hashSecurityAnswer } from "../lib/password";
import type { Settings } from "../lib/types";

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
    if (window.confirm("Are you sure you want to remove password protection? This will allow anyone to modify blocking preferences or disable protection.")) {
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

  return (
    <div className="flex flex-col gap-6">
      <section className="card p-6">
        <h2 className="text-xl font-semibold mb-1">Amn Shield Protection</h2>
        <p className="text-sm text-muted">
          Configure baseline faith-protection and screen time controls.
        </p>
      </section>

      {/* Brand Theme Selector Card */}
      <section className="card p-6 flex flex-col gap-4">
        <h3 className="font-semibold text-sm">🎨 Interface Theme</h3>
        <p className="text-xs text-muted leading-normal">
          Customize the color scheme of the AmnShield extension dashboard.
        </p>
        <div className="flex flex-wrap gap-3 mt-1">
          {[
            { value: "sunset", label: "Sunset Glow", color: "#A45833" },
            { value: "emerald", label: "Emerald Calm", color: "#3C7A67" },
            { value: "cosmic", label: "Cosmic Night", color: "#C8B8FF" },
          ].map((themeOpt) => {
            const isSelected = (settings.theme || "emerald") === themeOpt.value;
            return (
              <button
                key={themeOpt.value}
                type="button"
                onClick={() => onChange({ ...settings, theme: themeOpt.value })}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all text-xs font-semibold ${
                  isSelected
                    ? "border-accent bg-accent/5 text-ink"
                    : "border-line bg-transparent hover:bg-state text-muted"
                }`}
              >
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: themeOpt.color }}
                />
                {themeOpt.label}
              </button>
            );
          })}
        </div>
      </section>

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

      </section>

      {/* Sync & Cloud Privacy Card */}
      <section className="card p-6 flex flex-col gap-5">
        <h3 className="font-semibold text-sm">☁️ Sync & Cloud Privacy</h3>
        <p className="text-xs text-muted leading-normal">
          Manage cloud synchronization, usage telemetry, and smart recommendations.
        </p>

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-sm">Sync Rules & Blocklists</p>
            <p className="text-xs text-muted mt-1 leading-normal">
              Synchronize blocklists and focus mode rules across devices via your cloud account.
            </p>
          </div>
          <Toggle
            on={settings.syncRulesEnabled ?? true}
            onChange={(v) => onChange({ ...settings, syncRulesEnabled: v })}
          />
        </div>

        <hr className="border-line" />

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-sm">Sync App Usage & Screentime</p>
            <p className="text-xs text-muted mt-1 leading-normal">
              Upload application usage stats to your cross-device parent dashboard.
            </p>
          </div>
          <Toggle
            on={settings.syncAppUsageEnabled ?? true}
            onChange={(v) => onChange({ ...settings, syncAppUsageEnabled: v })}
          />
        </div>

        <hr className="border-line" />

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-sm">Sync Website Browsing Metrics</p>
            <p className="text-xs text-muted mt-1 leading-normal">
              Sync web domain browsing duration to analyze time spent on productivity.
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
        <h3 className="font-semibold text-sm">🔑 Settings Password Protection</h3>
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
              <span className="text-xs text-teal-600 font-semibold">🛡️ Password Protection is Active</span>
              <button
                type="button"
                onClick={handleRemovePassword}
                className={btnOutline}
              >
                Disable Password
              </button>
            </div>

            <hr className="border-line/60" />

            {/* Security Question Setup */}
            {settings.securityQuestion ? (
              <p className="text-xs text-muted">
                Security Question Recovery is configured.
              </p>
            ) : !showQuestionForm ? (
              <button
                type="button"
                onClick={() => setShowQuestionForm(true)}
                className={`${btnOutline} w-fit`}
              >
                📝 Configure Security Question Recovery
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

      {/* Support / Donate Card */}
      <section className="card p-6 flex flex-col gap-4">
        <h3 className="font-semibold text-sm">🤲 Support Amn Shield</h3>
        <p className="text-xs text-muted leading-normal">
          Help us continue developing Islamic technology solutions for the Ummah. Your support enables us to keep this extension free, open-source, and beneficial for all Muslims.
        </p>
        <div className="flex flex-col gap-3">
          <a
            href="https://amnshield.com"
            target="_blank"
            rel="noreferrer noopener"
            className={`${btnPrimary} w-fit text-center`}
          >
            💝 Donate (Sadaqah)
          </a>
          <p className="text-[11px] italic text-faint leading-normal">
            "The believer's shade on the Day of Resurrection will be his charity" - Hadith
          </p>
        </div>
      </section>
    </div>
  );
}
export default ProtectionPanel;
