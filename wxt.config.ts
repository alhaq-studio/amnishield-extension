import { defineConfig } from "wxt";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  srcDir: "src",
  suppressWarnings: {
    firefoxDataCollection: true,
  },
  vite: () => ({
    plugins: [tailwindcss()],
    build: {
      modulePreload: false,
    },
  }),
  manifest: {
    name: "AmniShield - Website Content Blocker",
    description: "Blocks harmful and distracting websites using custom domain lists, keyword filters, and scheduled blocking rules.",
    version: "0.3.0",
    permissions: ["storage", "tabs", "alarms", "declarativeNetRequest", "webNavigation"],
    host_permissions: ["<all_urls>"],
    options_ui: {
      open_in_tab: true,
      page: "options.html",
    },
    browser_specific_settings: {
      gecko: {
        id: "amnishield@alhaq.uk",
        data_collection_permissions: {
          required: ["none"],
        },
      },
    },
    web_accessible_resources: [
      {
        resources: ["fonts/*"],
        matches: ["<all_urls>"],
      },
    ],
  },
});
