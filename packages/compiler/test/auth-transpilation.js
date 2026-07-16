import { processMarkup } from '../lib/markup-processor.js';
import { buildFunctionsPhp } from '../lib/functions-builder.js';
import { forgewpPageConfigPlugin } from '../lib/index.js';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createJiti } from 'jiti';

function assert(condition, message) {
  if (!condition) {
    console.error('Assertion failed:', message);
    process.exit(1);
  }
}

function testMarkupProcessor() {
  console.log('Testing auth gate markup transpilation...');
  
  const input = `
    <div>
      <forgewp-auth-gate-start />
      <p>Welcome back, user!</p>
      <forgewp-auth-gate-fallback />
      <p>Please log in.</p>
      <forgewp-auth-gate-end />

      <forgewp-capability-gate-start allowed="edit_posts" />
      <button>Edit Post</button>
      <forgewp-capability-gate-fallback />
      <span>View Only</span>
      <forgewp-capability-gate-end />
    </div>
  `;

  const output = processMarkup(input);

  assert(output.includes('<?php if ( is_user_logged_in() ) : ?>'), 'Should contain is_user_logged_in conditional start');
  assert(output.includes('<?php else : ?>'), 'Should contain else conditional');
  assert(output.includes('<?php endif; ?>'), 'Should contain endif closing tag');
  assert(output.includes("<?php if ( current_user_can( 'edit_posts' ) ) : ?>"), 'Should contain current_user_can conditional check');
  
  console.log('✅ Markup processor transpilation check passed!');
}

function testFunctionsBuilderWithAuth() {
  console.log('Testing buildFunctionsPhp with @forgewp/auth package dependency...');

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  
  // Create a temporary mock project dir
  const tempProjectDir = path.join(__dirname, 'temp-auth-test-project');
  if (!fs.existsSync(tempProjectDir)) {
    fs.mkdirSync(tempProjectDir, { recursive: true });
  }

  // Create package.json with @forgewp/auth dependency
  fs.writeFileSync(
    path.join(tempProjectDir, 'package.json'),
    JSON.stringify({
      dependencies: {
        '@forgewp/auth': 'workspace:*'
      }
    }),
    'utf8'
  );

  // Run functions builder
  const config = {
    version: '1.0.0',
    textDomain: 'mytheme',
    seo: {},
    settings: {},
    headless: {
      apiUrl: 'https://decoupled-backend.wp',
      jwtAuth: true
    }
  };
  const assets = {
    cssFile: 'assets/index.css',
  };

  const functionsPhp = buildFunctionsPhp(
    config,
    assets,
    [],
    tempProjectDir,
    [],
    {},
    {
      mainJsFile: 'assets/index.js',
      mapping: {
        'some-component': 'assets/some-component.js'
      }
    }
  );

  console.log('Generated functions.php length:', functionsPhp.length);
  console.log('Contains login controller?', functionsPhp.includes("register_rest_route( 'forgewp/v1/auth', '/login'"));
  console.log('Contains currentUser?', functionsPhp.includes('window.forgeWpHydration.currentUser'));

  // Verify that the custom rest controllers and hydration user mapping are outputted
  assert(functionsPhp.includes("register_rest_route( 'forgewp/v1/auth', '/login'"), 'Should register login REST endpoint');
  assert(functionsPhp.includes("register_rest_route( 'forgewp/v1/auth', '/logout'"), 'Should register logout REST endpoint');
  assert(functionsPhp.includes("register_rest_route( 'forgewp/v1/auth', '/register'"), 'Should register register REST endpoint');
  assert(functionsPhp.includes("register_rest_route( 'forgewp/v1/auth', '/lost-password'"), 'Should register lost-password REST endpoint');
  assert(functionsPhp.includes("register_rest_route( 'forgewp/v1/auth', '/verify-email'"), 'Should register verify-email REST endpoint');
  assert(functionsPhp.includes("register_rest_route( 'forgewp/v1/auth', '/config'"), 'Should register config GET REST endpoint');
  assert(functionsPhp.includes("forgewp_register_auth_settings"), 'Should register authentication Settings API hooks');
  assert(functionsPhp.includes("forgewp_enforce_login_field_policy"), 'Should enforce login policy via authenticate filter');
  assert(functionsPhp.includes("forgewp_auth_admin_menu"), 'Should register settings admin submenu page');
  assert(functionsPhp.includes("forgewp_intercept_mail"), 'Should register local dev mail logger filter');
  assert(functionsPhp.includes("Reserved usernames validation"), 'Should include reserved usernames blocklist validation');
  assert(functionsPhp.includes("window.forgeWpHydration ="), 'Should include forgeWpHydration');

  // Verify that headless scripts are generated when headless config exists
  assert(functionsPhp.includes("window.FORGEWP_API_URL ="), 'Should include FORGEWP_API_URL in inline script');
  assert(functionsPhp.includes("window.FORGEWP_JWT_AUTH = true"), 'Should include FORGEWP_JWT_AUTH in inline script');

  // Clean up
  fs.unlinkSync(path.join(tempProjectDir, 'package.json'));
  fs.rmdirSync(tempProjectDir);

  console.log('✅ functions.php auth controller generation check passed!');
}

async function testPageProtectIntegration() {
  console.log('Testing pageConfig compiler integration...');

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);
  
  // Create a temporary mock project dir
  const tempProjectDir = path.join(__dirname, 'temp-protect-test-project');
  if (!fs.existsSync(tempProjectDir)) {
    fs.mkdirSync(tempProjectDir, { recursive: true });
  }

  // Create package.json with @forgewp/auth dependency
  fs.writeFileSync(
    path.join(tempProjectDir, 'package.json'),
    JSON.stringify({
      name: 'temp-protect-test-project',
      version: '1.0.0',
      dependencies: {
        '@forgewp/auth': 'workspace:*'
      }
    }),
    'utf8'
  );

  // Create wp.config.ts
  fs.writeFileSync(
    path.join(tempProjectDir, 'wp.config.ts'),
    `export default {
      name: 'Temp Project',
      slug: 'temp-project',
      version: '1.0.0',
      description: 'Temp',
      textDomain: 'temp-project',
      configVersion: 1
    };`,
    'utf8'
  );

  // Create index.html
  fs.writeFileSync(
    path.join(tempProjectDir, 'index.html'),
    '<html><body><div id="root"></div></body></html>',
    'utf8'
  );

  // Create src and src/app directories and mock files
  const srcAppDir = path.join(tempProjectDir, 'src', 'app');
  fs.mkdirSync(srcAppDir, { recursive: true });
  fs.writeFileSync(path.join(tempProjectDir, 'src', 'main.tsx'), '// mock main.tsx', 'utf8');
  fs.writeFileSync(path.join(srcAppDir, 'layout.tsx'), "import React from 'react';\nexport default function Layout({ children }) { return <div>{children}</div>; }", 'utf8');
  fs.writeFileSync(path.join(srcAppDir, 'routes.tsx'), '// mock routes.tsx', 'utf8');
  fs.writeFileSync(
    path.join(srcAppDir, 'page.tsx'),
    "import React from 'react';\nexport default function Page() { return <div>Home</div>; }",
    'utf8'
  );

  // Create dist/assets and manifest.json
  const distDir = path.join(tempProjectDir, 'dist');
  const distAssetsDir = path.join(distDir, 'assets');
  fs.mkdirSync(distAssetsDir, { recursive: true });
  fs.writeFileSync(
    path.join(distDir, 'manifest.json'),
    JSON.stringify({
      'index.html': {
        file: 'assets/index.js',
        css: ['assets/index.css'],
        isEntry: true,
      },
    }),
    'utf8'
  );
  fs.writeFileSync(path.join(distAssetsDir, 'index.css'), '/* mock css */', 'utf8');
  fs.writeFileSync(path.join(distAssetsDir, 'index.js'), '// mock js', 'utf8');

  // Create node_modules junction to the starter package node_modules
  const { execSync } = await import('node:child_process');
  const workspaceNodeModules = path.resolve(__dirname, '../../starter/node_modules');
  const tempNodeModules = path.join(tempProjectDir, 'node_modules');
  execSync(`cmd /c mklink /j "${tempNodeModules}" "${workspaceNodeModules}"`);

  // Create .forgewp directory
  const forgewpDir = path.join(tempProjectDir, '.forgewp');
  if (!fs.existsSync(forgewpDir)) {
    fs.mkdirSync(forgewpDir, { recursive: true });
  }

  // Create template-protected.html
  fs.writeFileSync(
    path.join(forgewpDir, 'template-protected.html'),
    `<div><forgewp-require-auth allowed="edit_posts" redirect="/login-custom" />Protected Content</div>`,
    'utf8'
  );

  // Import exportTheme
  const { exportTheme } = await import('../lib/index.js');

  // Run exporter
  const { outDir } = await exportTheme({
    themeRoot: tempProjectDir,
    skipBuild: true,
    zip: false,
  });

  const generatedPhpPath = path.join(outDir, 'page-protected.php');
  assert(fs.existsSync(generatedPhpPath), 'page-protected.php template file should be generated');

  const phpContent = fs.readFileSync(generatedPhpPath, 'utf8');

  // Verify redirects are present
  assert(phpContent.includes("wp_safe_redirect( home_url('/login-custom') );"), 'Should include redirect to /login-custom');
  assert(phpContent.includes("current_user_can( 'edit_posts' )"), 'Should include current_user_can edit_posts check');

  // Verify the require-auth tag was stripped from static html output
  const staticHtmlPath = path.join(outDir, 'forgewp-static/template-protected.html');
  assert(fs.existsSync(staticHtmlPath), 'Static HTML template should be generated');
  const staticHtml = fs.readFileSync(staticHtmlPath, 'utf8');
  assert(!staticHtml.includes('forgewp-require-auth'), 'The custom require-auth tag should be stripped from static HTML');

  // Clean up
  fs.rmdirSync(tempNodeModules);
  fs.rmSync(tempProjectDir, { recursive: true, force: true });
  
  // Clean outDir
  if (fs.existsSync(outDir)) {
    fs.rmSync(outDir, { recursive: true, force: true });
  }

  console.log('✅ Page protect redirect compilation integration check passed!');
}

function testJwtTemplateInjection() {
  console.log('Testing JWT token headers injection in wordpress.tsx template...');
  
  const templatePath = path.join(path.dirname(fileURLToPath(import.meta.url)), '../templates/wordpress.tsx');
  const templateContent = fs.readFileSync(templatePath, 'utf8');

  // Verify fetchWpApi token injection
  assert(templateContent.includes('const token = window.localStorage.getItem(\'forgewp_jwt_token\')'), 'wordpress.tsx should read forgewp_jwt_token from localStorage');
  assert(templateContent.includes('headers[\'Authorization\'] = `Bearer ${token}`'), 'wordpress.tsx should inject Bearer token into Authorization headers');

  console.log('✅ JWT template injection check passed!');
}

function testJwtAuthPackageSource() {
  console.log('Testing JWT source implementation in @forgewp/auth...');
  
  const authPath = path.join(path.dirname(fileURLToPath(import.meta.url)), '../../auth/src/components.tsx');
  const authContent = fs.readFileSync(authPath, 'utf8');

  assert(authContent.includes('function decodeJwt'), 'components.tsx should declare decodeJwt helper');
  assert(authContent.includes('function isJwtAuthEnabled'), 'components.tsx should declare isJwtAuthEnabled detector');
  assert(authContent.includes('isJwtAuthEnabled()'), 'WpAuthProvider should check isJwtAuthEnabled()');
  assert(authContent.includes('jwt-auth/v1/token'), 'WpAuthProvider should reference jwt-auth/v1/token endpoints');

  console.log('✅ @forgewp/auth source checks passed!');
}

async function testReactAuthGatesSSR() {
  console.log('Testing React auth gates SSR rendering...');

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const { createRequire } = await import('node:module');
  const starterRequire = createRequire(path.resolve(__dirname, '../../starter/package.json'));
  
  const reactResolvedPath = starterRequire.resolve('react');
  const reactDomServerResolvedPath = starterRequire.resolve('react-dom/server');

  console.log('Aliasing React to:', reactResolvedPath);
  console.log('Aliasing ReactDOMServer to:', reactDomServerResolvedPath);

  const jiti = createJiti(import.meta.url, {
    jsx: true,
    alias: {
      'react': reactResolvedPath,
      'react-dom/server': reactDomServerResolvedPath
    }
  });

  const ReactModule = await jiti.import('react');
  const ReactDOMServerModule = await jiti.import('react-dom/server');
  const React = ReactModule.default || ReactModule;
  const ReactDOMServer = ReactDOMServerModule.default || ReactDOMServerModule;

  // Set compile time global
  globalThis.window = {
    _forgeWpCompileTime: true,
    location: { pathname: '/' }
  };

  const { WpAuthGate, WpCapabilityGate } = await jiti.import('../../auth/src/components.tsx');

  // 1. WpAuthGate SSR
  const authGateHtml = ReactDOMServer.renderToStaticMarkup(
    React.createElement(
      WpAuthGate,
      { fallback: React.createElement('span', null, 'Please Login') },
      React.createElement('div', null, 'Welcome User!')
    )
  );

  console.log('WpAuthGate rendered HTML:', authGateHtml);
  assert(authGateHtml.includes('<forgewp-auth-gate-start'), 'Auth gate start tag should be in output');
  assert(authGateHtml.includes('<forgewp-auth-gate-fallback'), 'Auth gate fallback tag should be in output');
  assert(authGateHtml.includes('<forgewp-auth-gate-end'), 'Auth gate end tag should be in output');
  assert(authGateHtml.includes('Welcome User!'), 'Auth gate children should be in output');
  assert(authGateHtml.includes('Please Login'), 'Auth gate fallback children should be in output');

  const processedAuth = processMarkup(authGateHtml);
  console.log('Processed WpAuthGate PHP:', processedAuth);
  assert(processedAuth.includes('<?php if ( is_user_logged_in() ) : ?>'), 'PHP output should start the condition');
  assert(processedAuth.includes('<?php else : ?>'), 'PHP output should have else condition');
  assert(processedAuth.includes('<?php endif; ?>'), 'PHP output should end the condition');

  // 2. WpCapabilityGate SSR
  const capGateHtml = ReactDOMServer.renderToStaticMarkup(
    React.createElement(
      WpCapabilityGate,
      { allowed: 'manage_options', fallback: React.createElement('span', null, 'Denied') },
      React.createElement('div', null, 'Admin Panel')
    )
  );

  console.log('WpCapabilityGate rendered HTML:', capGateHtml);
  assert(capGateHtml.includes('<forgewp-capability-gate-start'), 'Cap gate start tag should be in output');
  assert(capGateHtml.includes('allowed="manage_options"'), 'Cap gate allowed attribute should be in output');
  assert(capGateHtml.includes('<forgewp-capability-gate-fallback'), 'Cap gate fallback tag should be in output');
  assert(capGateHtml.includes('<forgewp-capability-gate-end'), 'Cap gate end tag should be in output');
  assert(capGateHtml.includes('Admin Panel'), 'Cap gate children should be in output');
  assert(capGateHtml.includes('Denied'), 'Cap gate fallback children should be in output');

  const processedCap = processMarkup(capGateHtml);
  console.log('Processed WpCapabilityGate PHP:', processedCap);
  assert(processedCap.includes("<?php if ( current_user_can( 'manage_options' ) ) : ?>"), 'PHP output should check capabilities');
  assert(processedCap.includes('<?php else : ?>'), 'PHP output should have else condition');
  assert(processedCap.includes('<?php endif; ?>'), 'PHP output should end the condition');

  // Reset compile time global
  globalThis.window = undefined;

  console.log('✅ React auth gates SSR rendering and compilation passed!');
}

function testPageConfigPlugin() {
  console.log('Testing forgewpPageConfigPlugin...');
  const plugin = forgewpPageConfigPlugin();

  const id = 'C:/Users/hp/Desktop/ForgeWP/forgewp-auth/src/app/pages/DashboardPage.tsx';

  // 1. If no "export const pageConfig", it should return null
  const codeNoPage = `export function DashboardPage() { return <div>Dashboard</div>; }`;
  assert(plugin.transform(codeNoPage, id) === null, 'Should return null if no pageConfig export');

  // 2. If not a page file, it should return null
  const codeWithPage = `export const pageConfig = { protected: true }; export function DashboardPage() { return <div>Dashboard</div>; }`;
  const invalidId = 'C:/Users/hp/Desktop/ForgeWP/forgewp-auth/src/components/MyComponent.tsx';
  assert(plugin.transform(codeWithPage, invalidId) === null, 'Should return null if not in src/app/pages/');

  // 3. Functional component matching
  const funcCode = `export const pageConfig = { protected: true };\nexport function DashboardPage() {\n  return <div>Dashboard</div>;\n}`;
  const funcRes = plugin.transform(funcCode, id);
  assert(funcRes !== null, 'Should transform functional component');
  assert(funcRes.code.includes("import { useWpPageProtect as _useWpPageProtect } from '@forgewp/auth';"), 'Should prepend import');
  assert(funcRes.code.includes("export function DashboardPage() {\n  _useWpPageProtect(pageConfig);"), 'Should inject useWpPageProtect call inside functional component');

  // 4. Default functional component matching
  const defaultFuncCode = `export const pageConfig = { protected: true };\nexport default function DashboardPage() {\n  return <div>Dashboard</div>;\n}`;
  const defaultFuncRes = plugin.transform(defaultFuncCode, id);
  assert(defaultFuncRes !== null, 'Should transform default functional component');
  assert(defaultFuncRes.code.includes("export default function DashboardPage() {\n  _useWpPageProtect(pageConfig);"), 'Should inject useWpPageProtect call inside default functional component');

  // 5. Arrow component matching
  const arrowCode = `export const pageConfig = { protected: true };\nexport const DashboardPage = () => {\n  return <div>Dashboard</div>;\n}`;
  const arrowRes = plugin.transform(arrowCode, id);
  assert(arrowRes !== null, 'Should transform arrow component');
  assert(arrowRes.code.includes("export const DashboardPage = () => {\n  _useWpPageProtect(pageConfig);"), 'Should inject useWpPageProtect call inside arrow component');

  console.log('✅ forgewpPageConfigPlugin checks passed!');
}

async function testAutoWrappingAndProviderWiring() {
  console.log('Testing automatic island detection and provider wiring...');
  const plugin = forgewpPageConfigPlugin();

  const tempDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'temp-auto-wrap-test');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  // Create an interactive component file that uses state
  const compDir = path.join(tempDir, 'src', 'components');
  fs.mkdirSync(compDir, { recursive: true });

  const interactiveCompPath = path.join(compDir, 'InteractiveWidget.tsx');
  fs.writeFileSync(
    interactiveCompPath,
    `import { useState } from "react";\nexport default function InteractiveWidget() { const [x] = useState(0); return <div>{x}</div>; }`,
    'utf8'
  );

  // Create an interactive component file that uses auth hooks
  const authCompPath = path.join(compDir, 'AuthWidget.tsx');
  fs.writeFileSync(
    authCompPath,
    `import { useWpUser } from "@forgewp/auth";\nexport default function AuthWidget() { const user = useWpUser(); return <div>{user?.displayName}</div>; }`,
    'utf8'
  );

  // Create a static parent component file that imports them
  const parentId = path.join(tempDir, 'src', 'app', 'pages', 'TestPage.tsx');
  fs.mkdirSync(path.dirname(parentId), { recursive: true });
  
  const parentCode = `import React from 'react';
import InteractiveWidget from '../../components/InteractiveWidget';
import AuthWidget from '../../components/AuthWidget';

export default function TestPage() {
  return (
    <div>
      <h1>Static Title</h1>
      <InteractiveWidget val={10} />
      <AuthWidget />
    </div>
  );
}`;

  // Run the plugin transformation
  const res = plugin.transform(parentCode, parentId);
  assert(res !== null, 'Transformed code should not be null');

  // Assertions
  assert(res.code.includes('import { Hydrate } from "@forgewp/react";'), 'Should import Hydrate');
  assert(res.code.includes('import { WpAuthProvider } from "@forgewp/auth";'), 'Should import WpAuthProvider');
  
  assert(res.code.includes('<Hydrate id="interactive-widget"><InteractiveWidget val={10} /></Hydrate>'), 'InteractiveWidget should be wrapped in Hydrate');
  assert(res.code.includes('<Hydrate id="auth-widget"><WpAuthProvider><AuthWidget /></WpAuthProvider></Hydrate>'), 'AuthWidget should be wrapped in Hydrate and WpAuthProvider');

  // Clean up
  fs.rmSync(tempDir, { recursive: true, force: true });
  console.log('✅ Automatic island detection and provider wiring checks passed!');
}

async function main() {
  console.log('--- STARTING AUTH TRANSPIALTION UNIT TESTS ---');
  testPageConfigPlugin();
  await testAutoWrappingAndProviderWiring();
  testMarkupProcessor();
  testFunctionsBuilderWithAuth();
  testJwtTemplateInjection();
  testJwtAuthPackageSource();
  await testReactAuthGatesSSR();
  await testPageProtectIntegration();
  console.log('🎉 ALL AUTH TRANSPIALTION UNIT TESTS PASSED! 🎉');
}

main();
