import { defineConfig } from 'wxt';

// See https://wxt.dev/api/config.html
export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-svelte'],
  manifest: {
    name: 'Pause All Extensions',
    permissions: ['management', 'storage'],
  },
  webExt: {
    chromiumArgs: ['--user-data-dir=./.wxt/chrome-data'],
  },
});

