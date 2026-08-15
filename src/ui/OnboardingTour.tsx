import { useState } from "react";
import type { Settings } from "../lib/types";

interface OnboardingTourProps {
  settings: Settings;
  onComplete: (updatedSettings: Settings) => void;
  onClose?: () => void;
}

export function OnboardingTour({ settings, onComplete, onClose }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [adultEnabled, setAdultEnabled] = useState<boolean>(settings.adultContentEnabled ?? true);
  const [safeSearchEnabled, setSafeSearchEnabled] = useState<boolean>(settings.safeSearchEnabled ?? true);

  const TOTAL_STEPS = 7;

  const handleNext = () => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep((prev) => prev + 1);
    } else {
      finishTour();
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const finishTour = () => {
    const updated: Settings = {
      ...settings,
      adultContentEnabled: adultEnabled,
      safeSearchEnabled: safeSearchEnabled,
      onboardingCompleted: true,
    };
    onComplete(updated);
    if (onClose) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#0b0716]/85 backdrop-blur-xl p-4 transition-all duration-300 font-sans">
      {/* Background Cosmic Glow Bloom */}
      <div className="pointer-events-none absolute h-[500px] w-[500px] rounded-full bg-gradient-to-tr from-purple-900/30 via-indigo-900/20 to-blue-900/30 blur-3xl" />

      {/* Main Cosmic Tour Container */}
      <div className="relative flex w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-[#34255c] bg-[#140d26]/95 text-[#f3ecff] shadow-[0_0_50px_rgba(200,184,255,0.12)]">
        {/* Cosmic Top Banner */}
        <div className="relative flex items-center justify-between border-b border-[#34255c] bg-[#241840]/60 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-[#c8b8ff] to-[#8b5cf6] text-[#140d26] shadow-[0_0_12px_rgba(200,184,255,0.4)]">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <h2 className="font-display text-lg leading-tight text-white tracking-wide">AmniShield Tour</h2>
              <p className="text-[10px] tracking-widest uppercase text-[#988baf]">Feature Walkthrough</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Progress Dots */}
            <div className="flex items-center gap-1.5">
              {Array.from({ length: TOTAL_STEPS }).map((_, idx) => {
                const stepNum = idx + 1;
                const isActive = stepNum === currentStep;
                const isCompleted = stepNum < currentStep;
                return (
                  <span
                    key={stepNum}
                    className={`h-2 rounded-full transition-all duration-300 ${
                      isActive
                        ? "w-6 bg-gradient-to-r from-[#c8b8ff] to-[#3b82f6] shadow-[0_0_8px_rgba(200,184,255,0.6)]"
                        : isCompleted
                        ? "w-2 bg-[#10b981]"
                        : "w-2 bg-[#34255c]"
                    }`}
                  />
                );
              })}
            </div>

            <button
              onClick={finishTour}
              className="text-xs text-[#988baf] hover:text-[#c8b8ff] transition-colors px-2 py-1 rounded-lg hover:bg-[#34255c]/50 cursor-pointer"
            >
              Skip
            </button>
          </div>
        </div>

        {/* Tour Step Content Area */}
        <div className="min-h-[380px] p-8 flex flex-col justify-between">
          {/* Step 1: Welcome */}
          {currentStep === 1 && (
            <div className="flex flex-col items-center text-center gap-5 my-auto animate-rise">
              <div className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-[#c8b8ff]/20 to-[#8b5cf6]/30 border border-[#c8b8ff]/30 shadow-[0_0_25px_rgba(200,184,255,0.25)]">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-[#c8b8ff]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div className="space-y-2">
                <span className="inline-block px-3 py-1 rounded-full bg-[#c8b8ff]/15 border border-[#c8b8ff]/30 text-[#c8b8ff] text-xs font-semibold uppercase tracking-wider">
                  Halal-First Browsing Protection
                </span>
                <h3 className="text-2xl font-bold text-white tracking-tight">Welcome to AmniShield</h3>
              </div>
              <p className="text-sm leading-relaxed text-[#988baf] max-w-md">
                AmniShield is your personal digital sanctuary. Built with an open-source, on-device ethos to help you guard your gaze, block digital distractions, and focus on what truly matters.
              </p>
            </div>
          )}

          {/* Step 2: Web & Keyword Blocker */}
          {currentStep === 2 && (
            <div className="flex flex-col gap-5 my-auto animate-rise">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#3b82f6]/20 border border-[#3b82f6]/40 text-[#60a5fa]">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                </div>
                <div>
                  <span className="text-xs uppercase tracking-wider text-[#60a5fa] font-medium">Core Feature</span>
                  <h3 className="text-xl font-bold text-white">Granular Website &amp; Keyword Filter</h3>
                </div>
              </div>

              <p className="text-sm text-[#988baf]">
                Block entire websites or pinpoint problematic subpaths effortlessly:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-[#241840] border border-[#34255c]">
                  <span className="text-[#c8b8ff] font-semibold block mb-1">Entire Domain</span>
                  <code className="text-emerald-400 font-mono">youtube.com</code>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#241840] border border-[#34255c]">
                  <span className="text-[#c8b8ff] font-semibold block mb-1">Specific Subpath</span>
                  <code className="text-emerald-400 font-mono">youtube.com/shorts</code>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#241840] border border-[#34255c]">
                  <span className="text-[#c8b8ff] font-semibold block mb-1">Subpath Across Sites</span>
                  <code className="text-emerald-400 font-mono">/shorts</code>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#241840] border border-[#34255c]">
                  <span className="text-[#c8b8ff] font-semibold block mb-1">Regex Pattern</span>
                  <code className="text-emerald-400 font-mono">r:shorts|reels</code>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Focus Mode */}
          {currentStep === 3 && (
            <div className="flex flex-col gap-5 my-auto animate-rise">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#8b5cf6]/20 border border-[#8b5cf6]/40 text-[#c8b8ff]">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <circle cx="12" cy="12" r="9" strokeWidth="2" />
                    <circle cx="12" cy="12" r="5" strokeWidth="2" />
                    <circle cx="12" cy="12" r="1.5" strokeWidth="2" fill="currentColor" />
                  </svg>
                </div>
                <div>
                  <span className="text-xs uppercase tracking-wider text-[#c8b8ff] font-medium">Deep Work</span>
                  <h3 className="text-xl font-bold text-white">Focus Mode &amp; Timed Sessions</h3>
                </div>
              </div>

              <p className="text-sm text-[#988baf]">
                Need dedicated study or work time? Enter Focus Sessions with flexible filtering rules:
              </p>

              <div className="space-y-3">
                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#241840] border border-[#34255c]">
                  <div className="h-2 w-2 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                  <div>
                    <span className="text-[#f3ecff] font-semibold text-xs block">"Block Selected" Mode</span>
                    <span className="text-[#988baf] text-xs">Blocks only chosen distracting sites while leaving the rest of the web open.</span>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-[#241840] border border-[#34255c]">
                  <div className="h-2 w-2 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                  <div>
                    <span className="text-[#f3ecff] font-semibold text-xs block">"Allow Only These" Mode</span>
                    <span className="text-[#988baf] text-xs">Strict focus lock! Only websites on your approved whitelist remain accessible.</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Safeguards */}
          {currentStep === 4 && (
            <div className="flex flex-col gap-5 my-auto animate-rise">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#ef4444]/20 border border-[#ef4444]/40 text-[#f87171]">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <div>
                  <span className="text-xs uppercase tracking-wider text-[#f87171] font-medium">Self &amp; Parental Control</span>
                  <h3 className="text-xl font-bold text-white">Impulsive Unblock Safeguards</h3>
                </div>
              </div>

              <p className="text-sm text-[#988baf]">
                Prevent weak-moment bypassing with customizable friction settings:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-[#241840] border border-[#34255c]">
                  <span className="text-[#f3ecff] font-semibold block mb-1">Passcode Lock</span>
                  <span className="text-[#988baf]">Lock settings with a master password &amp; recovery question.</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#241840] border border-[#34255c]">
                  <span className="text-[#f3ecff] font-semibold block mb-1">Mindful Typing Friction</span>
                  <span className="text-[#988baf]">Require typing a mindful commitment before unblocking.</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#241840] border border-[#34255c]">
                  <span className="text-[#f3ecff] font-semibold block mb-1">Pause Delay Timer</span>
                  <span className="text-[#988baf]">Force a mandatory waiting period before rules pause.</span>
                </div>
                <div className="p-3.5 rounded-2xl bg-[#241840] border border-[#34255c]">
                  <span className="text-[#f3ecff] font-semibold block mb-1">Daily Override Limit</span>
                  <span className="text-[#988baf]">Set maximum daily override limits.</span>
                </div>
              </div>
            </div>
          )}

          {/* Step 5: Ecosystem Sync */}
          {currentStep === 5 && (
            <div className="flex flex-col gap-5 my-auto animate-rise">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#10b981]/20 border border-[#10b981]/40 text-[#34d399]">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <div>
                  <span className="text-xs uppercase tracking-wider text-[#34d399] font-medium">Amn Ecosystem</span>
                  <h3 className="text-xl font-bold text-white">Cross-Device Guardian &amp; Sync</h3>
                </div>
              </div>

              <p className="text-sm text-[#988baf]">
                AmniShield seamlessly integrates across your devices for centralized protection:
              </p>

              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#241840] border border-[#34255c]">
                  <div className="flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#c8b8ff] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <div>
                      <span className="text-[#f3ecff] font-semibold block">AmniShield Windows Guardian</span>
                      <span className="text-[#988baf] text-[11px]">System-wide desktop process monitor &amp; hosts filtering.</span>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#10b981]/15 text-[#34d399] text-[10px] font-semibold">Active Sync</span>
                </div>

                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#241840] border border-[#34255c]">
                  <div className="flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-[#60a5fa] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <div>
                      <span className="text-[#f3ecff] font-semibold block">AmniShield Android Client</span>
                      <span className="text-[#988baf] text-[11px]">Accessibility Service node blocking &amp; focus mode.</span>
                    </div>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-[#3b82f6]/15 text-[#60a5fa] text-[10px] font-semibold">Ready</span>
                </div>
              </div>
            </div>
          )}

          {/* Step 6: Support / Sadaqah */}
          {currentStep === 6 && (
            <div className="flex flex-col gap-5 my-auto animate-rise">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 text-xl font-bold">
                  🤲
                </div>
                <div>
                  <span className="text-xs uppercase tracking-wider text-amber-400 font-medium">Community &amp; Sadaqah</span>
                  <h3 className="text-xl font-bold text-white">Support Our Work</h3>
                </div>
              </div>

              <p className="text-sm leading-relaxed text-[#988baf]">
                AmniShield is developed by <strong>Al-Haq Studio</strong> as a 100% free and open-source project for the Ummah. Your voluntary contribution helps keep our servers running and supports continuous development.
              </p>

              <div className="p-4 rounded-2xl bg-[#241840] border border-[#34255c] flex flex-col gap-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="text-sm font-semibold text-white block">Make a Sadaqah Contribution</span>
                    <span className="text-xs text-[#988baf]">Support development on our website or creator platforms.</span>
                  </div>
                  <a
                    href="https://amnishield.com"
                    target="_blank"
                    rel="noreferrer noopener"
                    className="px-4 py-2 rounded-xl text-xs font-bold text-[#140d26] bg-gradient-to-r from-amber-400 to-amber-500 hover:opacity-90 transition-all shadow-md cursor-pointer"
                  >
                    💝 Donate (Sadaqah)
                  </a>
                </div>
                <blockquote className="text-[11px] italic text-[#c8b8ff] border-l border-amber-500/40 pl-3 mt-1">
                  "The believer's shade on the Day of Resurrection will be his charity." — Hadith
                </blockquote>
              </div>
            </div>
          )}

          {/* Step 7: Quick Setup */}
          {currentStep === 7 && (
            <div className="flex flex-col gap-5 my-auto animate-rise">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#c8b8ff] to-[#3b82f6] text-[#140d26]">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <span className="text-xs uppercase tracking-wider text-[#c8b8ff] font-medium">Quick Configuration</span>
                  <h3 className="text-xl font-bold text-white">Enable Essential Protections</h3>
                </div>
              </div>

              <p className="text-sm text-[#988baf]">
                Toggle your baseline safety switches to get started immediately:
              </p>

              <div className="space-y-3">
                <label className="flex items-center justify-between p-4 rounded-2xl bg-[#241840] border border-[#34255c] cursor-pointer hover:border-[#c8b8ff]/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-400 shrink-0" />
                    <div>
                      <span className="text-sm font-semibold text-[#f3ecff] block">Adult &amp; Harmful Content Filter</span>
                      <span className="text-xs text-[#988baf]">Blocks known explicit domains and inappropriate content.</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={adultEnabled}
                    onChange={(e) => setAdultEnabled(e.target.checked)}
                    className="h-5 w-5 rounded accent-[#c8b8ff] cursor-pointer"
                  />
                </label>

                <label className="flex items-center justify-between p-4 rounded-2xl bg-[#241840] border border-[#34255c] cursor-pointer hover:border-[#c8b8ff]/40 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-2.5 w-2.5 rounded-full bg-blue-400 shrink-0" />
                    <div>
                      <span className="text-sm font-semibold text-[#f3ecff] block">Enforce SafeSearch</span>
                      <span className="text-xs text-[#988baf]">Forces SafeSearch mode on Google, Bing, DuckDuckGo &amp; YouTube.</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={safeSearchEnabled}
                    onChange={(e) => setSafeSearchEnabled(e.target.checked)}
                    className="h-5 w-5 rounded accent-[#c8b8ff] cursor-pointer"
                  />
                </label>
              </div>
            </div>
          )}

          {/* Footer Controls */}
          <div className="mt-8 flex items-center justify-between border-t border-[#34255c] pt-5">
            <button
              onClick={handleBack}
              disabled={currentStep === 1}
              className={`px-5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                currentStep === 1
                  ? "opacity-30 cursor-not-allowed text-[#988baf]"
                  : "bg-[#241840] text-[#f3ecff] hover:bg-[#34255c] border border-[#34255c]"
              }`}
            >
              ← Back
            </button>

            <span className="text-xs font-medium text-[#988baf]">
              Step <strong className="text-[#c8b8ff]">{currentStep}</strong> of {TOTAL_STEPS}
            </span>

            <button
              onClick={handleNext}
              className="px-6 py-2.5 rounded-xl text-xs font-bold text-[#140d26] bg-gradient-to-r from-[#c8b8ff] via-[#a890fe] to-[#3b82f6] hover:opacity-90 transition-all shadow-[0_0_20px_rgba(200,184,255,0.35)] cursor-pointer"
            >
              {currentStep === TOTAL_STEPS ? "Finish & Open Dashboard" : "Continue →"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OnboardingTour;
