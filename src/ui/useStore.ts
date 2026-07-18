import { useEffect, useState } from "react";
import { get, set, watch, DEFAULT_SETTINGS } from "../lib/storage";
import type { FocusLogEntry, FocusSession, Settings, UsageHistory } from "../lib/types";

export interface AmnShieldState {
  usage: UsageHistory;
  settings: Settings;
  focus: FocusSession | null;
  focusLog: FocusLogEntry[];
  ready: boolean;
}

export function useAmnShield() {
  const [state, setState] = useState<AmnShieldState>({
    usage: {},
    settings: DEFAULT_SETTINGS,
    focus: null,
    focusLog: [],
    ready: false,
  });

  useEffect(() => {
    let alive = true;
    const load = async () => {
      const [usage, settings, focus, focusLog] = await Promise.all([
        get("usage"),
        get("settings"),
        get("focus"),
        get("focusLog"),
      ]);
      if (alive) setState({ usage, settings, focus, focusLog, ready: true });
    };
    void load();
    const stop = watch((changed) => {
      setState((prev) => ({
        usage: changed.usage ?? prev.usage,
        settings: changed.settings ?? prev.settings,
        focus: "focus" in changed ? (changed.focus ?? null) : prev.focus,
        focusLog: changed.focusLog ?? prev.focusLog,
        ready: true,
      }));
    });
    return () => {
      alive = false;
      stop();
    };
  }, []);

  useEffect(() => {
    if (!state.ready) return;
    const theme = state.settings.theme ?? "sunset";
    const root = document.documentElement;
    root.classList.remove("theme-sunset", "theme-emerald", "theme-cosmic");
    root.classList.add(`theme-${theme}`);
  }, [state.ready, state.settings.theme]);

  const saveSettings = (settings: Settings) => set("settings", settings);

  return { ...state, saveSettings };
}
