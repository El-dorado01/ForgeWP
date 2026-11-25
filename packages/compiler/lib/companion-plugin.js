/**
 * ForgeWP Companion Plugin (Phase B, docs/dual-mode-portability-architecture.md §9).
 *
 * The backend half of functions.php (content types, REST contracts, forms,
 * auth, settings, theme state) is emitted twice from the same source:
 *  1. as a standalone plugin, <slug>-companion, for decoupled sites or any
 *     other active theme, so the data/REST contract survives a theme switch;
 *  2. embedded in the theme (companion/backend.php), loaded only when the
 *     plugin is not active, so a native site still installs as one theme ZIP.
 * Plugins load before the theme, so an active plugin always wins.
 */
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export function companionConstant(slug) {
  return `FORGEWP_COMPANION_${String(slug).toUpperCase().replace(/[^A-Z0-9]+/g, '_')}`;
}

export function companionPluginSlug(slug) {
  return `${slug}-companion`;
}

function phpString(value) {
  return `'${String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
}

function headerValue(value) {
  return String(value ?? '').replace(/[\r\n*]+/g, ' ').replace(/\s+/g, ' ').trim();
}

export function buildCompanionBackendFile(backendPhp) {
  return `<?php
/**
 * ForgeWP companion backend — generated, do not edit.
 * Loaded by the companion plugin, or by the theme when the plugin is inactive.
 */

if (!defined('ABSPATH')) {
    exit;
}
${backendPhp}
`;
}

/** Loader placed at the top of the theme's functions.php. */
export function companionEmbedsInTheme(config) {
  return !(config.companion && config.companion.embedInTheme === false);
}

export function buildThemeCompanionLoaderPhp(config) {
  const constant = companionConstant(config.slug);
  const version = config.version || '0.0.0';
  if (!companionEmbedsInTheme(config)) {
    return `
/**
 * Companion backend (content types, REST API, forms, auth, settings) comes only
 * from the ${companionPluginSlug(config.slug)} plugin (companion.embedInTheme: false).
 */
if (!defined('${constant}')) {
    add_action('admin_notices', function () {
        if (!current_user_can('activate_plugins')) {
            return;
        }
        echo '<div class="notice notice-error"><p>' . esc_html(sprintf(
            /* translators: 1: theme name, 2: plugin folder name */
            __('The %1$s theme needs its companion plugin (%2$s). Install and activate it from the same ForgeWP export.', ${phpString(config.textDomain || 'forgewp')}),
            ${phpString(headerValue(config.name))},
            ${phpString(companionPluginSlug(config.slug))}
        )) . '</p></div>';
    });
    // The templates need the backend: show a clear page instead of PHP errors.
    // 503 + Retry-After so search engines come back instead of dropping pages.
    add_action('template_redirect', function () {
        header('Retry-After: 3600');
        wp_die(
            esc_html(sprintf(
                /* translators: %s: plugin folder name */
                __('This site is being set up: its companion plugin (%s) is not active yet.', ${phpString(config.textDomain || 'forgewp')}),
                ${phpString(companionPluginSlug(config.slug))}
            )),
            esc_html__('Site temporarily unavailable', ${phpString(config.textDomain || 'forgewp')}),
            array('response' => 503)
        );
    }, 0);
    return;
}
`;
  }
  return `
/**
 * Companion backend (content types, REST API, forms, auth, settings).
 * The ${companionPluginSlug(config.slug)} plugin provides it when active, which is required
 * when this site runs decoupled or under another theme; otherwise the copy
 * bundled with this theme is used.
 */
if (!defined('${constant}')) {
    define('${constant}', 'theme');
    define('${constant}_VERSION', ${phpString(version)});
    require_once __DIR__ . '/companion/backend.php';
    // The theme's copy is the backend now: same activation event as the plugin.
    add_action('after_switch_theme', function () {
        do_action('forgewp_companion_activated');
    });
} elseif (${constant} === 'plugin' && defined('${constant}_VERSION') && ${constant}_VERSION !== ${phpString(version)}) {
    add_action('admin_notices', function () {
        if (!current_user_can('activate_plugins')) {
            return;
        }
        echo '<div class="notice notice-warning"><p>' . esc_html(sprintf(
            /* translators: 1: plugin version, 2: theme version */
            __('The %1$s companion plugin (version %2$s) does not match this theme (version %3$s). Install the theme and the plugin from the same ForgeWP export.', ${phpString(config.textDomain || 'forgewp')}),
            ${phpString(headerValue(config.name))},
            ${constant}_VERSION,
            ${phpString(version)}
        )) . '</p></div>';
    });
}
`;
}

export function buildCompanionPluginMainFile(config) {
  const constant = companionConstant(config.slug);
  const name = headerValue(config.name || config.slug);
  return `<?php
/**
 * Plugin Name: ${name} Companion
 * Description: ForgeWP backend for ${name}: content types, REST API, forms, sign-in and settings. Keep it active when the site runs decoupled or under another theme.
 * Version: ${headerValue(config.version || '0.0.0')}
 * Requires PHP: ${headerValue((config.companion && config.companion.requiresPhp) || '7.4')}${
    config.companion && Array.isArray(config.companion.requiresPlugins) && config.companion.requiresPlugins.length > 0
      ? `\n * Requires Plugins: ${headerValue(config.companion.requiresPlugins.join(', '))}`
      : ''
  }
 * Text Domain: ${headerValue(config.textDomain || 'forgewp')}
 *
 * Generated by ForgeWP — do not edit; re-export the project instead.
 */

if (!defined('ABSPATH')) {
    exit;
}

if (!defined('${constant}')) {
    define('${constant}', 'plugin');
    define('${constant}_VERSION', ${phpString(config.version || '0.0.0')});
    require_once __DIR__ . '/includes/backend.php';
}

// Registered even when the theme's built-in copy is already running (the usual
// case when the plugin is activated next to the ForgeWP theme): the handlers
// then come from that copy, which loads the same project code.
register_activation_hook(__FILE__, function () {
    do_action('forgewp_companion_activated');
    flush_rewrite_rules();
});
register_deactivation_hook(__FILE__, function () {
    do_action('forgewp_companion_deactivated');
});
`;
}

/**
 * Writes companion/backend.php into the theme and the standalone plugin next to it.
 * @returns {{ pluginDir: string }}
 */
export function writeCompanionPlugin({ outDir, config, backendPhp, writeTree, uninstallPhp }) {
  const backendFile = buildCompanionBackendFile(backendPhp);
  const themeCompanionDir = path.join(outDir, 'companion');
  rmSync(themeCompanionDir, { recursive: true, force: true });
  if (companionEmbedsInTheme(config)) {
    mkdirSync(themeCompanionDir, { recursive: true });
    writeFileSync(path.join(themeCompanionDir, 'backend.php'), backendFile, 'utf8');
    if (writeTree) writeTree(path.join(themeCompanionDir, 'project'));
  }

  const pluginSlug = companionPluginSlug(config.slug);
  const pluginDir = path.join(path.dirname(outDir), pluginSlug);
  rmSync(pluginDir, { recursive: true, force: true });
  mkdirSync(path.join(pluginDir, 'includes'), { recursive: true });
  writeFileSync(path.join(pluginDir, `${pluginSlug}.php`), buildCompanionPluginMainFile(config), 'utf8');
  writeFileSync(path.join(pluginDir, 'includes', 'backend.php'), backendFile, 'utf8');
  if (uninstallPhp) writeFileSync(path.join(pluginDir, 'uninstall.php'), uninstallPhp, 'utf8');
  if (writeTree) writeTree(path.join(pluginDir, 'project'));
  return { pluginDir };
}
