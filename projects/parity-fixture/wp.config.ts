import { defineConfig } from '@forgewp/compiler/define-config';
import { siteOptions } from './cms/site-options';
import { themeMods } from './cms/theme-mods';

export default defineConfig({
  configVersion: 1,
  name: 'ForgeWP Parity Fixture',
  slug: 'parity-fixture',
  version: '0.1.0',
  description: 'Phase D parity fixture: the same project exported natively and run decoupled must agree.',
  textDomain: 'parity-fixture',
  frameworkAdapter: 'nextjs',
  auth: {},
  options: siteOptions,
  themeMods,
  seed: { mockData: 'once', developmentOnly: false },
});
