import { spawn } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { exportTheme } from '../../lib/export-theme.js';
import * as nextAdapter from '../../lib/next-adapter.js';
import { readCompiledBlockIdentities } from '../../lib/next-export-experimental.js';
import {
  createWordPressContentClient,
  resolveBlockRenderNodes,
  verifyDeploymentSwitch,
} from '../../lib/next-decoupled-transport.js';
import introBlock from '../../../../projects/nextjs-adapter-fixture/src/blocks/IntroBlock.tsx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../../..');
const nextFixtureRoot = path.join(repoRoot, 'projects', 'nextjs-adapter-fixture');
const fixtureOutIndex = path.join(nextFixtureRoot, 'out', 'index.html');
const runLiveWp = process.env.FORGEWP_LIVE_WP_ACCEPTANCE === '1';

function getFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      const port = typeof addr === 'object' && addr ? addr.port : 0;
      server.close((err) => (err ? reject(err) : resolve(port)));
    });
    server.on('error', reject);
  });
}

function stopProcessGroup(child) {
  if (!child || !child.pid) return;
  try {
    process.kill(-child.pid, 'SIGTERM');
  } catch {}
  setTimeout(() => {
    try {
      process.kill(-child.pid, 'SIGKILL');
    } catch {}
  }, 1500).unref();
}

describe('Live disposable WordPress acceptance & native <-> decoupled round trip', () => {
  it.skipIf(!runLiveWp || !existsSync(fixtureOutIndex))(
    'exports via real exportTheme(nextAdapter), installs ZIP on real WordPress, proves Gutenberg edits, live decoupled Next.js App Router SSR server, draft auth boundary, renamed slugs, and native round trip',
    async () => {
      const tmp = mkdtempSync(path.join(os.tmpdir(), 'forgewp-live-wp-acceptance-'));
      const fixtureTsconfigPath = path.join(nextFixtureRoot, 'tsconfig.json');
      const originalTsconfig = existsSync(fixtureTsconfigPath)
        ? readFileSync(fixtureTsconfigPath, 'utf8')
        : null;
      let child = null;
      let nextChild = null;
      try {
        const fixtureCopy = path.join(tmp, 'fixture');
        cpSync(nextFixtureRoot, fixtureCopy, {
          recursive: true,
          filter: (src) => {
            const base = path.basename(src);
            return base !== 'node_modules' && base !== '.next' && base !== '.forgewp';
          },
        });
        const blueprintPath = path.join(tmp, 'blueprint.json');
        const port = await getFreePort();
        const wpUrl = `http://127.0.0.1:${port}`;

        // 1. Export the real Next.js fixture through the real exportTheme() pipeline using next-adapter.
        const exported = await exportTheme({
          themeRoot: fixtureCopy,
          adapter: nextAdapter,
          config: {
            name: 'ForgeWP Next Fixture',
            slug: 'forgewp-next-fixture',
            textDomain: 'forgewp-next-fixture',
            version: '1.0.0',
            description: 'Live disposable WordPress acceptance test',
          },
          skipBuild: true,
          validate: true,
          strict: true,
          zip: true,
        });
        const zipPath = path.join(tmp, 'forgewp-next-fixture.zip');
        cpSync(exported.zipPath, zipPath);
        const compiledBlocks = readCompiledBlockIdentities(exported.outDir);
        expect(existsSync(zipPath)).toBe(true);
        expect(compiledBlocks.some((b) => b.name === 'forgewp/next-intro')).toBe(true);

        // 2. Boot a disposable WordPress instance installing & activating the exported ZIP.
        const blueprint = {
          landingPage: '/',
          login: false,
          steps: [
            {
              step: 'installTheme',
              themeData: {
                resource: 'bundled',
                path: 'forgewp-next-fixture.zip',
              },
              options: {
                activate: true,
              },
            },
            {
              step: 'runPHP',
              code: `<?php
                require_once '/wordpress/wp-load.php';
                update_option('permalink_structure', '/%postname%/');
                do_action('after_switch_theme', 'twentytwentyfive');
                if (function_exists('forgewp_auto_create_pages_and_menus')) {
                  forgewp_auto_create_pages_and_menus();
                }
                flush_rewrite_rules(true);
                if (!is_dir('/wordpress/wp-content/mu-plugins')) {
                  mkdir('/wordpress/wp-content/mu-plugins', 0755, true);
                }
                file_put_contents(
                  '/wordpress/wp-content/mu-plugins/allow-local-app-pass.php',
                  "<?php\\nadd_filter('wp_is_application_passwords_available', '__return_true');\\n"
                );
                add_filter('wp_is_application_passwords_available', '__return_true');
                $admin = get_user_by('login', 'admin');
                if ($admin && class_exists('WP_Application_Passwords')) {
                  $created = WP_Application_Passwords::create_new_application_password($admin->ID, array('name' => 'forgewp-acceptance'));
                  if (!is_wp_error($created)) {
                    file_put_contents('/wordpress/wp-content/forgewp-acceptance-pass.txt', $created[0]);
                  }
                }
              `,
            },
          ],
        };
        writeFileSync(blueprintPath, JSON.stringify(blueprint, null, 2), 'utf8');

        let serverLogs = '';
        child = spawn(
          'npx',
          [
            '--yes',
            '@wp-playground/cli@3.1.65',
            'server',
            '--port',
            String(port),
            '--workers',
            '1',
            '--blueprint',
            blueprintPath,
            '--blueprint-may-read-adjacent-files',
            '--verbosity',
            'quiet',
          ],
          { cwd: tmp, detached: true, stdio: ['ignore', 'pipe', 'pipe'] },
        );
        child.stdout.on('data', (d) => {
          serverLogs += d.toString();
        });
        child.stderr.on('data', (d) => {
          serverLogs += d.toString();
        });

        const deadline = Date.now() + 120_000;
        let ready = false;
        while (Date.now() < deadline) {
          try {
            const probe = await fetch(`${wpUrl}/wp-json/`);
            if (probe.ok) {
              ready = true;
              break;
            }
          } catch {}
          await new Promise((r) => setTimeout(r, 750));
        }
        expect(ready, `WordPress Playground did not become ready:\n${serverLogs}`).toBe(true);

        const passRes = await fetch(`${wpUrl}/wp-content/forgewp-acceptance-pass.txt`);
        expect(passRes.ok).toBe(true);
        const appPass = (await passRes.text()).trim();
        const auth = { username: 'admin', applicationPassword: appPass };
        const authHeader =
          'Basic ' + Buffer.from(`${auth.username}:${auth.applicationPassword}`).toString('base64');

        // 3. NATIVE MODE VERIFICATION (no Next.js process running):
        //    Home route, packaged CSS, no _next JS chunks, live permalinks, About route, block registration.
        const homeRes = await fetch(`${wpUrl}/`);
        expect(homeRes.status).toBe(200);
        const homeHtml = await homeRes.text();
        expect(homeHtml).toContain('<header');
        expect(homeHtml).toContain('<footer');
        expect(homeHtml).toContain(exported.assets.cssFile);
        expect(homeHtml).not.toContain('/_next/');
        expect(homeHtml).toContain(`${wpUrl}/about/?from=home#details`);
        expect(homeHtml).toContain(`data-fixture="wordpress-link" href="${wpUrl}/about/"`);

        const cssRes = await fetch(
          `${wpUrl}/wp-content/themes/forgewp-next-fixture/${exported.assets.cssFile}`,
        );
        expect(cssRes.status).toBe(200);
        expect(cssRes.headers.get('content-type') || '').toContain('text/css');

        const aboutRes = await fetch(`${wpUrl}/about/`);
        expect(aboutRes.status).toBe(200);
        const aboutHtml = await aboutRes.text();
        expect(aboutHtml).toContain('id="details"');
        expect(aboutHtml).toContain('About the adapter fixture');

        const blockTypeRes = await fetch(`${wpUrl}/wp-json/wp/v2/block-types/forgewp/next-intro`, {
          headers: { Authorization: authHeader },
        });
        expect(blockTypeRes.status).toBe(200);
        const blockType = await blockTypeRes.json();
        expect(blockType.name).toBe('forgewp/next-intro');
        expect(blockType.attributes?.heading?.default).toBe('An editable introduction');
        expect(blockType.editor_style_handles).toContain('forgewp-next-intro-editor-style');

        // 4. GUTENBERG EDIT #1 (Native Mode — save, reload, live frontend update without rebuilding).
        const createRes = await fetch(`${wpUrl}/wp-json/wp/v2/pages`, {
          method: 'POST',
          headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Live Intro Page',
            slug: 'intro-live',
            status: 'publish',
            template: 'template-forgewp-builder.php',
            content: '<!-- wp:forgewp/next-intro {"heading":"Edit 1 saved in Gutenberg (native)"} /-->',
          }),
        });
        expect(createRes.status).toBe(201);
        const createdPage = await createRes.json();

        // Reload as Gutenberg editor does (?context=edit) and verify serialized block persistence.
        const reloadRes1 = await fetch(
          `${wpUrl}/wp-json/wp/v2/pages/${createdPage.id}?context=edit`,
          { headers: { Authorization: authHeader } },
        );
        expect(reloadRes1.status).toBe(200);
        const reloaded1 = await reloadRes1.json();
        expect(reloaded1.content?.raw).toContain(
          '<!-- wp:forgewp/next-intro {"heading":"Edit 1 saved in Gutenberg (native)"} /-->',
        );

        // Fetch live WordPress frontend URL (no rebuild, no Next process).
        const nativeFront1 = await fetch(`${wpUrl}/intro-live/`);
        expect(nativeFront1.status).toBe(200);
        const nativeHtml1 = await nativeFront1.text();
        expect(nativeHtml1).toContain('Edit 1 saved in Gutenberg (native)');

        // Verify wp-admin slug rename updates live native permalinks immediately without rebuilding.
        const routesBefore = await (await fetch(`${wpUrl}/wp-json/forgewp/v1/routes`)).json();
        const aboutRouteRecord = routesBefore.routes.find((r) => r.routeId === 'about');
        expect(aboutRouteRecord).toBeDefined();
        const renameRes = await fetch(`${wpUrl}/wp-json/wp/v2/pages/${aboutRouteRecord.id}`, {
          method: 'POST',
          headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug: 'our-story' }),
        });
        expect(renameRes.status).toBe(200);

        const homeAfterRename = await (await fetch(`${wpUrl}/`)).text();
        expect(homeAfterRename).toContain(`${wpUrl}/our-story/?from=home#details`);
        expect(homeAfterRename).toContain(`data-fixture="wordpress-link" href="${wpUrl}/our-story/"`);

        const renamedAboutRes = await fetch(`${wpUrl}/our-story/`);
        expect(renamedAboutRes.status).toBe(200);
        expect(await renamedAboutRes.text()).toContain('id="details"');

        // 5. DECOUPLED MODE (Reading the exact same live WordPress database).
        const switchCheck = await verifyDeploymentSwitch({
          wpUrl,
          auth,
          expectedBlocks: compiledBlocks,
          expectedRoutes: ['about'],
          probePageSlug: 'intro-live',
        });
        expect(switchCheck.ok, JSON.stringify(switchCheck, null, 2)).toBe(true);

        // Unauthenticated public decoupled client reads Edit 1 + renamed route.
        const publicClient = createWordPressContentClient({ wpUrl });
        expect(publicClient.getMode()).toBe('decoupled');

        const decoupledPage1 = await publicClient.getPageBySlug('intro-live');
        expect(decoupledPage1).toBeTruthy();
        expect(decoupledPage1.blocks).toEqual([
          {
            blockName: 'forgewp/next-intro',
            attrs: { heading: 'Edit 1 saved in Gutenberg (native)' },
            innerHTML: '',
            innerBlocks: [],
          },
        ]);

        // Render decoupled block tree with the EXACT SAME IntroBlock.tsx React component!
        const renderNodes1 = resolveBlockRenderNodes(decoupledPage1.blocks, {
          'forgewp/next-intro': introBlock,
        });
        const decoupledHtml1 = renderToStaticMarkup(
          React.createElement(renderNodes1[0].definition.save, {
            attributes: renderNodes1[0].attributes,
          }),
        );
        expect(decoupledHtml1).toBe(
          '<section class="intro"><h2>Edit 1 saved in Gutenberg (native)</h2></section>',
        );

        // Decoupled route resolution follows durable forgewp_route_id across wp-admin slug renames!
        const resolvedAboutHref = await publicClient.resolveRouteHref('about', '/about', {
          query: 'from=home',
          fragment: 'details',
        });
        expect(resolvedAboutHref).toBe('/our-story/?from=home#details');
        const decoupledAbout = await publicClient.getPageBySlug('about');
        expect(decoupledAbout?.slug).toBe('our-story');
        expect(decoupledAbout?.routeId).toBe('about');

        // 5b. LIVE DECOUPLED NEXT.JS APP ROUTER HTTP SERVER:
        //     Update the provisioned WordPress 'home' page (or create it if absent) with
        //     forgewp/next-intro, boot the real Next.js server pointed at WordPress, verify SSR
        //     reads Edit 1, save Edit 2 in WP, and verify the next Next.js HTTP response reflects
        //     Edit 2 with zero rebuild/restart!
        const existingHomeList = await (await fetch(`${wpUrl}/wp-json/wp/v2/pages?slug=home`)).json();
        const existingHomeId =
          Array.isArray(existingHomeList) && existingHomeList[0]?.id ? existingHomeList[0].id : null;
        const wpHomeCreateRes = await fetch(
          existingHomeId
            ? `${wpUrl}/wp-json/wp/v2/pages/${existingHomeId}`
            : `${wpUrl}/wp-json/wp/v2/pages`,
          {
            method: 'POST',
            headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              title: 'Live WordPress Home Title',
              slug: 'home',
              status: 'publish',
              content: '<!-- wp:forgewp/next-intro {"heading":"Next SSR Live Edit 1"} /-->',
            }),
          },
        );
        expect(wpHomeCreateRes.status).toBe(existingHomeId ? 200 : 201);
        const wpHomePage = await wpHomeCreateRes.json();

        const nextPort = await getFreePort();
        const nextUrl = `http://127.0.0.1:${nextPort}`;
        const nextBin = path.join(nextFixtureRoot, 'node_modules', '.bin', 'next');
        let nextLogs = '';
        nextChild = spawn(
          nextBin,
          ['dev', '--webpack', '--hostname', '127.0.0.1', '--port', String(nextPort)],
          {
            cwd: nextFixtureRoot,
            detached: true,
            env: {
              ...process.env,
              FORGEWP_DEPLOYMENT_MODE: 'decoupled',
              FORGEWP_WP_URL: wpUrl,
              NEXT_TELEMETRY_DISABLED: '1',
            },
            stdio: ['ignore', 'pipe', 'pipe'],
          },
        );
        nextChild.stdout.on('data', (d) => {
          nextLogs += d.toString();
        });
        nextChild.stderr.on('data', (d) => {
          nextLogs += d.toString();
        });

        const nextDeadline = Date.now() + 90_000;
        let nextHomeHtml1 = '';
        while (Date.now() < nextDeadline) {
          try {
            const res = await fetch(`${nextUrl}/`);
            if (res.ok) {
              nextHomeHtml1 = await res.text();
              if (nextHomeHtml1.includes('Next SSR Live Edit 1')) break;
            }
          } catch {}
          await new Promise((r) => setTimeout(r, 750));
        }
        expect(nextHomeHtml1, `Next.js decoupled server did not render live WP Edit 1:\n${nextLogs}`).toContain(
          'Live WordPress Home Title',
        );
        expect(nextHomeHtml1).toContain('Next SSR Live Edit 1');

        // Next.js /about route resolves the wp-admin-renamed 'our-story' page via forgewp_route_id!
        const nextAboutRes = await fetch(`${nextUrl}/about`);
        expect(nextAboutRes.status).toBe(200);
        const nextAboutHtml = await nextAboutRes.text();
        expect(nextAboutHtml).toContain('id="details"');

        // Update the WordPress 'home' page block without restarting Next.js -> live SSR updates immediately.
        const wpHomeEdit2 = await fetch(`${wpUrl}/wp-json/wp/v2/pages/${wpHomePage.id}`, {
          method: 'POST',
          headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: '<!-- wp:forgewp/next-intro {"heading":"Next SSR Live Edit 2"} /-->',
          }),
        });
        expect(wpHomeEdit2.status).toBe(200);
        const nextHomeHtml2 = await (await fetch(`${nextUrl}/`)).text();
        expect(nextHomeHtml2).toContain('Next SSR Live Edit 2');
        expect(nextHomeHtml2).not.toContain('Next SSR Live Edit 1');

        stopProcessGroup(nextChild);
        nextChild = null;

        // 6. GUTENBERG EDIT #2 (While in Decoupled Mode — reflected live without rebuilding).
        const edit2Res = await fetch(`${wpUrl}/wp-json/wp/v2/pages/${createdPage.id}`, {
          method: 'POST',
          headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content:
              '<!-- wp:forgewp/next-intro {"heading":"Edit 2 saved in Gutenberg (decoupled)"} /-->',
          }),
        });
        expect(edit2Res.status).toBe(200);

        const decoupledPage2 = await publicClient.getPageBySlug('intro-live');
        const renderNodes2 = resolveBlockRenderNodes(decoupledPage2.blocks, {
          'forgewp/next-intro': introBlock,
        });
        const decoupledHtml2 = renderToStaticMarkup(
          React.createElement(renderNodes2[0].definition.save, {
            attributes: renderNodes2[0].attributes,
          }),
        );
        expect(decoupledHtml2).toBe(
          '<section class="intro"><h2>Edit 2 saved in Gutenberg (decoupled)</h2></section>',
        );

        // 7. AUTHORIZATION BOUNDARY: Drafts are never leaked publicly, only via authenticated preview.
        const draftRes = await fetch(`${wpUrl}/wp-json/wp/v2/pages`, {
          method: 'POST',
          headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: 'Secret Draft',
            slug: 'secret-draft',
            status: 'draft',
            content: '<!-- wp:forgewp/next-intro {"heading":"Secret draft heading"} /-->',
          }),
        });
        expect(draftRes.status).toBe(201);
        expect(await publicClient.getPageBySlug('secret-draft')).toBeNull();
        await expect(publicClient.getPageBySlug('secret-draft', { preview: true })).rejects.toThrow(
          /FORGEWP_PREVIEW_AUTH_REQUIRED/,
        );
        const routesAfterDraft = await publicClient.getRoutes();
        expect(routesAfterDraft.routes.some((r) => r.slug === 'secret-draft')).toBe(false);

        const previewClient = createWordPressContentClient({ wpUrl, auth });
        const draftPreview = await previewClient.getPageBySlug('secret-draft', { preview: true });
        expect(draftPreview?.status).toBe('draft');
        expect(draftPreview?.blocks[0]).toMatchObject({
          blockName: 'forgewp/next-intro',
          attrs: { heading: 'Secret draft heading' },
        });

        // 8. SWITCH BACK TO NATIVE MODE + FAILURE/ROLLBACK VERIFICATION:
        //    Both edits and block identities survive with zero app source changes or DB migrations.
        const nativeFront2 = await fetch(`${wpUrl}/intro-live/`);
        expect(nativeFront2.status).toBe(200);
        const nativeHtml2 = await nativeFront2.text();
        expect(nativeHtml2).toContain('Edit 2 saved in Gutenberg (decoupled)');
        expect(nativeHtml2).not.toContain('Edit 1 saved in Gutenberg (native)');

        const reloadRes2 = await fetch(
          `${wpUrl}/wp-json/wp/v2/pages/${createdPage.id}?context=edit`,
          { headers: { Authorization: authHeader } },
        );
        expect((await reloadRes2.json()).content?.raw).toContain(
          '<!-- wp:forgewp/next-intro {"heading":"Edit 2 saved in Gutenberg (decoupled)"} /-->',
        );

        // Exercise switch failure & rollback without mutating WordPress content.
        const failedSwitch = await verifyDeploymentSwitch({
          wpUrl,
          auth,
          expectedBlocks: [{ name: 'forgewp/nonexistent-block', attributes: {} }],
          expectedRoutes: ['about'],
        });
        expect(failedSwitch.ok).toBe(false);
        expect(failedSwitch.rollback.required).toBe(true);
        expect(failedSwitch.errors[0]).toContain('forgewp/nonexistent-block');

        // Confirm WordPress content stayed intact after the failed deployment switch.
        const nativeAfterFailedSwitch = await (await fetch(`${wpUrl}/intro-live/`)).text();
        expect(nativeAfterFailedSwitch).toContain('Edit 2 saved in Gutenberg (decoupled)');
      } finally {
        stopProcessGroup(nextChild);
        stopProcessGroup(child);
        await new Promise((r) => setTimeout(r, 300));
        if (originalTsconfig !== null) {
          writeFileSync(fixtureTsconfigPath, originalTsconfig, 'utf8');
        }
        rmSync(tmp, { recursive: true, force: true });
      }
    },
    240_000,
  );
});
