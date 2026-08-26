import type { ReactNode } from "react";
import { btnPrimary, btnOutline } from "./components";

const LINKS = {
  website: "https://alhaq.uk",
  initiative: "https://alhaq.uk",
  support: "https://alhaq.uk/support.html",
  legal: "https://alhaq.uk/legal/index.html",
  deleteAccount: "https://alhaq.uk/legal/delete-account.html",
  github: "https://github.com/alhaq-studio/amnshield-extension",
  email: "support@alhaq.uk",
  patreon: "https://www.patreon.com/alhaq",
  buymeacoffee: "https://www.buymeacoffee.com/alhaq",
  kofi: "https://ko-fi.com/alhaq",
  windowsApp: "https://github.com/alhaq-studio/amnishield-windows/releases/latest",
  windowsRepo: "https://github.com/alhaq-studio/amnishield-windows",
  androidApp: "https://amnishield.com/download",
  downloadPage: "https://amnishield.com/download",
};

function ArrowLink({ href, children, className }: { href: string; children: ReactNode; className: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer noopener" className={className}>
      {children}
    </a>
  );
}

export function AboutPanel({ onStartTour }: { onStartTour?: () => void }) {
  return (
    <div className="flex flex-col gap-6">
      {/* Companion Apps Download Card */}
      <section className="card p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <p className="label mb-0">🖥️ Get AmniShield Companion Apps</p>
          {onStartTour && (
            <button
              onClick={onStartTour}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-purple-500/15 to-indigo-500/15 border border-purple-500/30 px-3 py-1.5 text-xs font-semibold text-ink hover:opacity-80 transition-all cursor-pointer"
            >
              <span>Revisit Guided Tour</span>
            </button>
          )}
        </div>

        {/* Windows App */}
        <div className="rounded-xl border border-blue-500/20 bg-gradient-to-r from-blue-500/5 to-indigo-500/5 p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">💻</span>
            <div className="flex-1">
              <p className="font-semibold text-sm text-ink">AmnShield Windows Guardian</p>
              <p className="text-xs text-muted mt-1 leading-normal">
                Desktop app blocker, web domain filter engine, usage tracker, and real-time extension sync.
                Auto-connects with this browser extension via local HTTP API.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <ArrowLink href={LINKS.windowsApp} className={`${btnPrimary} text-xs`}>
                  ⬇️ Download for Windows
                </ArrowLink>
                <ArrowLink href={LINKS.windowsRepo} className={`${btnOutline} text-xs`}>
                  Source Code ↗
                </ArrowLink>
              </div>
            </div>
          </div>
        </div>

        {/* Android App */}
        <div className="rounded-xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/5 to-teal-500/5 p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">📱</span>
            <div className="flex-1">
              <p className="font-semibold text-sm text-ink">AmnShield Android</p>
              <p className="text-xs text-muted mt-1 leading-normal">
                App blocker, keyword filter, Reels blocker, and focus mode for Android.
                Pair with this extension for cross-device cloud sync.
              </p>
              <div className="mt-3">
                <ArrowLink href={LINKS.downloadPage} className={`${btnOutline} text-xs`}>
                  Get on Android ↗
                </ArrowLink>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="card p-6">
        <p className="label mb-3">About the Developer</p>
        <p className="text-sm leading-relaxed text-ink">
          AmniShield is developed by <strong>Al-Haq Studio</strong> for the <strong>Al-Haq Initiative</strong>.
          We are a specialized Islamic technology organization dedicated to creating digital solutions that
          align with Islamic values and serve the Muslim community worldwide. Our tools help Muslims maintain
          spiritual wellness, stay productive, and browse the web safely.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <ArrowLink href={LINKS.github} className={btnOutline}>
            View on GitHub ↗
          </ArrowLink>
          <ArrowLink href={LINKS.website} className={btnOutline}>
            Al-Haq Studio Website ↗
          </ArrowLink>
        </div>
      </section>

      <section className="card p-6">
        <p className="label mb-3">Support & Feedback</p>
        <p className="text-sm leading-relaxed text-muted">
          Need help, found a bug, or want to suggest a new feature? Get in touch with our team at Al-Haq Studio. We are constantly improving our content blocker and would love to hear from you.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <ArrowLink href={LINKS.support} className={btnPrimary}>
            Contact Support
          </ArrowLink>
          <ArrowLink href={LINKS.patreon} className={btnOutline}>
            Patreon ↗
          </ArrowLink>
          <ArrowLink href={LINKS.buymeacoffee} className={btnOutline}>
            Buy Me a Coffee ↗
          </ArrowLink>
          <ArrowLink href={LINKS.kofi} className={btnOutline}>
            Ko-fi ↗
          </ArrowLink>
        </div>
      </section>

      <section className="card p-6 flex flex-col gap-4">
        <h3 className="font-semibold text-sm">🤲 Support AmniShield</h3>
        <p className="text-xs text-muted leading-normal">
          Help us continue developing Islamic technology solutions for the Ummah. Your support enables us to keep this extension free, open-source, and beneficial for all Muslims.
        </p>
        <div className="flex flex-col gap-3">
          <ArrowLink
            href="https://amnishield.com"
            className={`${btnPrimary} w-fit text-center`}
          >
            💝 Donate (Sadaqah)
          </ArrowLink>
          <p className="text-[11px] italic text-faint leading-normal">
            "The believer's shade on the Day of Resurrection will be his charity" - Hadith
          </p>
        </div>
      </section>
    </div>
  );
}
export default AboutPanel;
