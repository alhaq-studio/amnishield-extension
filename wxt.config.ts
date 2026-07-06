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
    description: "Blocks harmful & distracting sites. Custom filters, focus schedules, password lock, and optional DeenTab dashboard (Qur'an, adhkaar, prayer times).",
    version: "0.2.0",
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
