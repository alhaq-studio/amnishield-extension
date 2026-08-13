import { defineBackground, browser } from "#imports";
import { get, watch } from "../lib/storage";
import { todayKey, nowMinutes } from "../lib/time";
import { parseLocation, type SiteLocation } from "../lib/url";
import type { BlockDecision, FocusSession } from "../lib/types";
import type { ContentMessage } from "../lib/messages";
import { sendToTab } from "../lib/messages";
import { evaluate, PASS } from "../core/blocker";
import { activeSession, endSession } from "../core/focus";
import { clearOnOpenGrants, pruneGrants, recordProceed } from "../core/grants";
import { persist, startTracking, stopTracking, setWindowFocused, setPageVisible } from "../core/usage";
import { pollGuardianStatus } from "../lib/guardianSync";
import { getSafeSearchRedirect } from "../lib/safeSearch";

let focusedTabId: number | null = null;

async function syncDeclarativeNetRequestRules(): Promise<void> {
  if (!browser.declarativeNetRequest) return;
  try {
    const [guardianDomains, blockedDomains] = await Promise.all([
      get("guardianDomains"),
      get("blockedDomains")
    ]);
    const domainsToBlock = new Set<string>();

    if (guardianDomains && guardianDomains.length > 0) {
      for (const d of guardianDomains) {
        const clean = d.toLowerCase().trim().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
        if (clean) domainsToBlock.add(clean);
      }
    }

    if (blockedDomains && blockedDomains.length > 0) {
      for (const d of blockedDomains) {
        const clean = d.toLowerCase().trim().replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];
        if (clean) domainsToBlock.add(clean);
      }
    }

    const existingRules = await browser.declarativeNetRequest.getDynamicRules();
    const removeRuleIds = existingRules.map((r) => r.id);

    const domainsList = Array.from(domainsToBlock).slice(0, 5000);
    const addRules: chrome.declarativeNetRequest.Rule[] = domainsList.map((domain, idx) => ({
      id: idx + 1,
      priority: 100,
      action: {
        type: "redirect" as chrome.declarativeNetRequest.RuleActionType,
        redirect: {
          url: browser.runtime.getURL(`/options.html#/blocked?domain=${encodeURIComponent(domain)}`),
        },
      },
      condition: {
        requestDomains: [domain],
        resourceTypes: ["main_frame" as chrome.declarativeNetRequest.ResourceType],
      },
    }));

    await browser.declarativeNetRequest.updateDynamicRules({
      removeRuleIds,
      addRules,
    });
  } catch (e) {
    console.warn("declarativeNetRequest rule sync error:", e);
  }
}

async function decide(location: SiteLocation): Promise<BlockDecision> {
  const [settings, usage, grants, proceeds, focus, guardianDomains, blockedDomains] = await Promise.all([
    get("settings"),
    get("usage"),
    get("grants"),
    get("proceeds"),
    activeSession(),
    get("guardianDomains"),
    get("blockedDomains"),
  ]);
  const now = new Date();
  const allGuardian = [...(guardianDomains ?? []), ...(blockedDomains ?? [])];
  return evaluate({
    location,
    settings,
    focus,
    todayUsage: usage[todayKey()] ?? {},
    weekday: now.getDay(),
    nowMinutes: nowMinutes(now),
    now: now.getTime(),
    grants,
    proceeds,
    guardianDomains: allGuardian,
  });
}

async function evaluateTab(tabId: number, url: string | undefined, makeActive: boolean): Promise<void> {
  if (!url) {
    if (makeActive) stopTracking();
    sendToTab(tabId, { type: "evaluate", decision: PASS });
    return;
  }

  // Check Safe Search redirect first
  const settings = await get("settings");
  if (settings.safeSearchEnabled) {
    const redirectUrl = getSafeSearchRedirect(url, true);
    if (redirectUrl && redirectUrl !== url) {
      void browser.tabs.update(tabId, { url: redirectUrl });
      return;
    }
  }

  const location = parseLocation(url);
  if (!location) {
    if (makeActive) stopTracking();
    sendToTab(tabId, { type: "evaluate", decision: PASS });
    return;
  }
  const decision = await decide(location);

  sendToTab(tabId, { type: "evaluate", decision });

  if (makeActive) {
    if (decision.blocked) stopTracking();
    else startTracking(tabId, location);
  }
}

async function evaluateFocused(): Promise<void> {
  if (focusedTabId == null) {
    const [tab] = await browser.tabs.query({ active: true, lastFocusedWindow: true });
    if (tab?.id == null) return;
    focusedTabId = tab.id;
  }
  try {
    const tab = await browser.tabs.get(focusedTabId);
    await evaluateTab(focusedTabId, tab.url, true);
  } catch {
    focusedTabId = null;
  }
}

async function evaluateAllTabs(): Promise<void> {
  const tabs = await browser.tabs.query({});
  await Promise.all(
    tabs.map((tab) => (tab.id != null ? evaluateTab(tab.id, tab.url, tab.id === focusedTabId) : Promise.resolve())),
  );
}

function scheduleFocusEnd(focus: FocusSession | null): void {
  void browser.alarms.clear("focus-end");
  if (focus) browser.alarms.create("focus-end", { when: focus.endsAt });
}

function scheduleGrantEnd(grants: Record<string, number>): void {
  void browser.alarms.clear("grant-end");
  const now = Date.now();
  const upcoming = Object.values(grants).filter((until) => until > now);
  if (upcoming.length > 0) browser.alarms.create("grant-end", { when: Math.min(...upcoming) });
}

export default defineBackground(() => {
  browser.alarms.create("tick", { periodInMinutes: 0.5 });
  browser.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "tick") {
      void persist();
      void evaluateFocused();
      void pollGuardianStatus().then(() => syncDeclarativeNetRequestRules());
    } else if (alarm.name === "focus-end") {
      void activeSession().then(() => evaluateAllTabs());
    } else if (alarm.name === "grant-end") {
      void pruneGrants().then(() => evaluateAllTabs());
    }
  });

  void activeSession().then(scheduleFocusEnd);
  void get("grants").then(scheduleGrantEnd);
  void pollGuardianStatus().then(() => syncDeclarativeNetRequestRules());

  // Fast 2-second polling interval for real-time Windows App rule updates
  setInterval(() => {
    void pollGuardianStatus().then(() => syncDeclarativeNetRequestRules());
  }, 2000);

  watch((changed) => {
    if ("focus" in changed) {
      scheduleFocusEnd(changed.focus ?? null);
      void evaluateAllTabs();
    }
    if ("settings" in changed) {
      void evaluateAllTabs();
      void syncDeclarativeNetRequestRules();
    }
    if ("guardianDomains" in changed || "blockedDomains" in changed) {
      void evaluateAllTabs();
      void syncDeclarativeNetRequestRules();
      if ("blockedDomains" in changed && Array.isArray(changed.blockedDomains)) {
        const domains = changed.blockedDomains;
        import("../lib/guardianSync").then(({ postUpdateDomainsToGuardian }) => {
          void postUpdateDomainsToGuardian(domains);
        });
      }
    }
    if ("grants" in changed) scheduleGrantEnd(changed.grants ?? {});
  });

  browser.tabs.onActivated.addListener(({ tabId }) => {
    focusedTabId = tabId;
    void browser.tabs.get(tabId).then((tab) => evaluateTab(tabId, tab.url, true));
  });

  browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url) {
      const location = parseLocation(changeInfo.url);
      if (location) {
        void clearOnOpenGrants(location).then(() => evaluateTab(tabId, tab.url, tabId === focusedTabId));
        return;
      }
    }
    if (changeInfo.status === "complete") {
      void evaluateTab(tabId, tab.url, tabId === focusedTabId);
    }
  });

  browser.windows.onFocusChanged.addListener((windowId) => {
    if (windowId === browser.windows.WINDOW_ID_NONE) {
      setWindowFocused(false);
      return;
    }
    setWindowFocused(true);
    void browser.tabs.query({ active: true, windowId }).then((tabs) => {
      const tab = tabs[0];
      if (tab?.id != null) {
        focusedTabId = tab.id;
        void evaluateTab(tab.id, tab.url, true);
      }
    });
  });

  browser.webNavigation.onBeforeNavigate.addListener(async (details) => {
    if (details.frameId !== 0) return;
    try {
      await pollGuardianStatus();
      await syncDeclarativeNetRequestRules();
      await evaluateTab(details.tabId, details.url, details.tabId === focusedTabId);
    } catch {}

    const settings = await get("settings");
    if (settings.safeSearchEnabled) {
      const redirectUrl = getSafeSearchRedirect(details.url, true);
      if (redirectUrl && redirectUrl !== details.url) {
        void browser.tabs.update(details.tabId, { url: redirectUrl });
      }
    }
  });

  browser.runtime.onMessage.addListener((message: ContentMessage, sender, sendResponse) => {
    const tabId = sender.tab?.id;
    if (message.type === "visibility") {
      if (tabId != null && tabId === focusedTabId) setPageVisible(message.visible);
      return;
    }
    if (message.type === "navigated") {
      if (tabId != null) {
        const location = parseLocation(message.url);
        const after = location ? clearOnOpenGrants(location) : Promise.resolve();
        void after.then(() => evaluateTab(tabId, message.url, tabId === focusedTabId));
      }
      return;
    }
    if (message.type === "endFocus") {
      void endSession();
      return;
    }
    if (message.type === "proceed") {
      void recordProceed(message.groupId, message.minutes).then(() => {
        if (tabId != null) void evaluateTab(tabId, sender.tab?.url, tabId === focusedTabId);
        sendResponse(true);
      });
      return true;
    }
  });
});
