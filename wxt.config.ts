import { defineConfig } from "wxt";

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: "src",
  modules: ["@wxt-dev/module-svelte"],
  svelte: {
    vite: {
      compilerOptions: {
        fragments: "tree",
      },
    },
  },
  zip: {
    name: "grody-github",
    artifactTemplate: "{{name}}-v{{version}}-{{browser}}.zip",
    sourcesTemplate: "{{name}}-v{{version}}-sources.zip",
  },
  manifest: {
    name: "Grody Github",
    permissions: ["storage", "alarms"],
    browser_specific_settings: {
      gecko: {
        id: "grody-github@cheefbird",
        // @ts-expect-error valid Firefox field, not yet typed by WXT
        data_collection_permissions: {
          required: ["browsingActivity"],
          optional: ["authenticationInfo"],
        },
      },
    },
  },
});
