#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { createUi } from '../lib/terminal-ui.js';

import { findWpConfigPath } from '../lib/project-language.js';

const ui = createUi();
const { c } = ui;

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log(`${ui.header('make:mail', 'plain-text email template')}  ${c.bold('Usage')}  ${ui.command('pnpm forgewp make:mail <name>')}\n${ui.detail('Creates cms/mail/<name>.json with a plain-text subject and body.')}\n`);
} else {
  const name = args[0];
  if (!name || !/^[a-z][a-z0-9-]*$/.test(name) || args.length !== 1) {
    console.error(ui.errorBlock('Invalid template name.', `Use a lowercase name, e.g. ${ui.command('pnpm forgewp make:mail contact-receipt')}`));
    process.exitCode = 1;
  } else if (!findWpConfigPath(process.cwd())) {
    console.error(ui.errorBlock('No ForgeWP project found here.', 'Run make:mail from a theme folder (one with wp.config.ts or wp.config.js).'));
    process.exitCode = 1;
  } else {
    const file = path.resolve('cms/mail', `${name}.json`);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    try {
      fs.writeFileSync(file, JSON.stringify({ subject: 'New form submission', body: 'A new submission has been received.' }, null, 2) + '\n', { flag: 'wx' });
      console.log(`\n${ui.created('mail template', name, `cms/mail/${name}.json`)}`);
      console.log(`${ui.tip(`Use it in a form: ${ui.command(`notificationTemplate: '${name}'`)} or ${ui.command(`confirmation.template: '${name}'`)}`)}\n`);
    } catch (error) {
      console.error(ui.errorBlock(`Could not create cms/mail/${name}.json`, error.code === 'EEXIST' ? 'A template with that name already exists.' : error.message));
      process.exitCode = 1;
    }
  }
}
