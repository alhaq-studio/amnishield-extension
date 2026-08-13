import type { ReactNode } from "react";
import { btnPrimary, btnOutline } from "./components";

const LINKS = {
  website: "https://alhaq.uk",
  initiative: "https://alhaq-initiative.org",
  support: "https://alhaq-initiative.org/contact.html",
  github: "https://github.com/alhaq-studio/amnshield-extension",
  email: "support@alhaq.uk",
  patreon: "https://www.patreon.com/alhaq",
  buymeacoffee: "https://www.buymeacoffee.com/alhaq",
  kofi: "https://ko-fi.com/alhaq"
};

function ArrowLink({ href, children, className }: { href: string; children: ReactNode; className: string }) {
  return (
    <a href={href} target="_blank" rel="noreferrer noopener" className={className}>
      {children}
    </a>
  );
}

export function AboutPanel() {
  return (
    <div className="flex flex-col gap-6">
      <section className="card p-6">
        <p className="label mb-3">About the Developer</p>
        <p className="text-sm leading-relaxed text-ink">
          Amn Shield is developed by <strong>Al-Haq Studio</strong> for the <strong>Al-Haq Initiative</strong>.
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

      <section className="card p-6">
        <p className="label mb-3">Amn Shield App Integration</p>
        <p className="text-sm leading-relaxed text-muted">
          Did you know Amn Shield is also available as an Android application? You can pair the browser extension with our Android client for central policy management and cross-device protection.
        </p>
        <div className="mt-5">
          <ArrowLink href={LINKS.initiative} className={btnPrimary}>
            Learn More
          </ArrowLink>
        </div>
      </section>
    </div>
  );
}
export default AboutPanel;
