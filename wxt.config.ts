import { defineConfig } from "wxt";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  srcDir: "src",
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: "Amn Shield - Islamic Productivity Tool",
    description: "Blocks harmful sites with custom filters, focus schedules, password lock, and a faith-based dashboard (Qur'an, prayer times).",
    version: "0.7.13.2026",
    permissions: ["storage", "tabs", "alarms", "declarativeNetRequest", "webNavigation"],
    host_permissions: ["<all_urls>"],
    chrome_url_overrides: {
      newtab: "DeenTab/deen-tab.html",
    },
    web_accessible_resources: [
      {
        resources: ["fonts/*", "DeenTab/*"],
        matches: ["<all_urls>"],
      },
    ],
  },
});
