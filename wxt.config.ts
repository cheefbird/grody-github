import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: "src",
  modules: ["@wxt-dev/module-svelte"],
  zip: {
    name: "grody-github",
    artifactTemplate: "{{name}}-v{{version}}-{{browser}}.zip",
  },
  manifest: {
    name: "Grody Github",
    permissions: ["storage"],
    browser_specific_settings: {
      gecko: {
        id: "grody-github@cheefbird",
        data_collection_permissions: {
          required: ["browsingActivity", "authenticationInfo"],
        },
      },
    },
  },
});
