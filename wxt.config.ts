import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-svelte'],
  zip: {
    name: 'grody-github',
    artifactTemplate: '{{name}}-v{{version}}-{{browser}}.zip',
  },
  manifest: {
    permissions: ['storage'],
  },
});
