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
    version: "22.8.2026",
    key: "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAsFpnAfBzi6t8Ws/MtRXsnyZKio3jj3LKmxREqjRRilgTxig//m1P44t1YWXdTAJT3eHwIvjfZ3762lM80YzXntOrA4CGYoA4gN7xo34a5kvk2C429NbQmqmfmoezfMXXdgBKkbmXnE4PoA5G01qv8Y+7ym9sybFoeNQRqezjn2bUeVBLIKZRZk5aPlXp4jyBi0F9BiKAyEKYRz+xVP2GCKsm/DAHpsMgns5QKSbS8FeaAscAMzUrcqt9H97ZDJC+MgAjekCB2gA2gvPCVest0+9ozvHXu+hKVh6DlY4fzDin4E2Se3pYd9WOyXWE/NXiw4kty9qvG6xXp52C83n54QIDAQAB",
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
