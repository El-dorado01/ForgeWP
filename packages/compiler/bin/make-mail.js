#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
if (args.includes('--help') || args.includes('-h')) {
  console.log('Usage: forgewp make:mail <name>\nCreates cms/mail/<name>.json with plain-text subject and body.');
} else {
  const name = args[0];
  if (!name || !/^[a-z][a-z0-9-]*$/.test(name) || args.length !== 1) {
    console.error('Use a lowercase template name, e.g. forgewp make:mail contact-receipt');
    process.exitCode = 1;
  } else if (!fs.existsSync(path.resolve('wp.config.ts'))) {
    console.error('Run make:mail from a theme containing wp.config.ts.');
    process.exitCode = 1;
  } else {
    const file = path.resolve('cms/mail', `${name}.json`);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    try {
      fs.writeFileSync(file, JSON.stringify({ subject: 'New form submission', body: 'A new submission has been received.' }, null, 2) + '\n', { flag: 'wx' });
      console.log(`Created cms/mail/${name}.json. Reference notificationTemplate: '${name}' or confirmation.template: '${name}'.`);
    } catch (error) {
      console.error(`Cannot create template: ${error.message}`);
      process.exitCode = 1;
    }
  }
}
