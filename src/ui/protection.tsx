import { Toggle } from "./components";
import type { Settings } from "../lib/types";

export function ProtectionPanel({
  settings,
  onChange,
}: {
  settings: Settings;
  onChange: (next: Settings) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <section className="card p-6">
        <h2 className="text-xl font-semibold mb-1">Amn Shield Protection</h2>
        <p className="text-sm text-muted">
          Configure baseline faith-protection and screen time controls.
        </p>
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

        <hr className="border-line" />

        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-sm">DeenTab (New Tab Override)</p>
            <p className="text-xs text-muted mt-1 leading-normal">
              Use DeenTab as your browser New Tab page (showing Qur'an, Adhkaar, and prayer times).
            </p>
          </div>
          <Toggle
            on={settings.deenTabEnabled}
            onChange={(v) => onChange({ ...settings, deenTabEnabled: v })}
          />
        </div>
      </section>
    </div>
  );
}
export default ProtectionPanel;
