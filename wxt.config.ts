import { defineConfig } from "wxt";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  srcDir: "src",
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: "Amn Shield - Website Content Blocker",
    description: "Blocks harmful and distracting websites using custom domain lists, keyword filters, and scheduled blocking rules.",
    version: "29.7.2026",
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
