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
    description: "Blocks harmful sites with custom filters, focus schedules, password lock, and mindful breathing pause screen.",
    version: "0.7.13.2026",
    permissions: ["storage", "tabs", "alarms", "declarativeNetRequest", "webNavigation"],
    host_permissions: ["<all_urls>"],
    web_accessible_resources: [
      {
        resources: ["fonts/*"],
        matches: ["<all_urls>"],
      },
    ],
  },
});
