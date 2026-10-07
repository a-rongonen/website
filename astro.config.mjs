import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://rongonen.fi',
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'file' },
});
