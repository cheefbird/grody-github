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
    artifactTemplate:
      "{{name}}-v{{packageVersion}}-{{browser}}{{modeSuffix}}.zip",
    sourcesTemplate: "{{name}}-v{{packageVersion}}-sources{{modeSuffix}}.zip",
    includeSources: [
      "src",
      "public",
      "package.json",
      "pnpm-lock.yaml",
      "pnpm-workspace.yaml",
      "wxt.config.ts",
      "tsconfig.json",
      "wxt-env.d.ts",
      "README.md",
      "LICENSE",
    ],
  },
  manifest: {
    name: "Grody Github",
    permissions: ["storage", "alarms"],
    browser_specific_settings: {
      gecko: {
        id: "grody-github@cheefbird",
        data_collection_permissions: {
          required: ["browsingActivity"],
          optional: ["authenticationInfo"],
        },
      },
    },
  },
});
