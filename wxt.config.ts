import { defineConfig } from "wxt";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  srcDir: "src",
  vite: () => ({
    plugins: [tailwindcss()],
    build: {
      modulePreload: false,
    },
  }),
  manifest: {
    name: "AmniShield - Website Content Blocker",
    description: "Blocks harmful and distracting websites using custom domain lists, keyword filters, and scheduled blocking rules.",
    version: "2026.8.22",
    permissions: ["storage", "tabs", "alarms", "declarativeNetRequest", "webNavigation"],
    host_permissions: ["<all_urls>"],
    options_ui: {
      open_in_tab: true,
      page: "options.html",
    },
    web_accessible_resources: [
      {
        resources: ["fonts/*"],
        matches: ["<all_urls>"],
      },
    ],
  },
});
