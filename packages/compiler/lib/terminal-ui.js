/**
 * ForgeWP terminal UI: one visual language for `create-forgewp` and the `forgewp` CLI.
 *
 * Dependency-free on purpose: create-forgewp ships an identical copy
 * (packages/create-forgewp/lib/terminal-ui.js, kept in sync by a test).
 *
 * Colour: brand orange #f97316 in truecolor, nearest 256-colour fallback, then
 * plain 16-colour. NO_COLOR, FORCE_COLOR=0 and non-TTY output (CI logs, pipes)
 * get plain text with no escape codes.
 */
import os from 'node:os';

/** @returns {0 | 1 | 2 | 3} 0 = no colour, 1 = 16, 2 = 256, 3 = truecolor */
export function detectColorLevel(stream = process.stdout, env = process.env) {
  if ('NO_COLOR' in env && env.NO_COLOR !== '') return 0;
  if (env.FORCE_COLOR !== undefined) {
    const forced = env.FORCE_COLOR === '' || env.FORCE_COLOR === 'true' ? 1 : Number(env.FORCE_COLOR);
    if (forced === 0 || env.FORCE_COLOR === 'false') return 0;
    if (forced >= 1 && forced <= 3) return /** @type {1 | 2 | 3} */ (forced);
  }
  if (!stream || !stream.isTTY) return 0;
  if (env.TERM === 'dumb') return 0;
  if (/^(truecolor|24bit)$/i.test(env.COLORTERM || '')) return 3;
  if (env.WT_SESSION || ['vscode', 'iTerm.app', 'WezTerm', 'ghostty'].includes(env.TERM_PROGRAM || '')) return 3;
  if (process.platform === 'win32') {
    // Windows 10 build 14931+ consoles support 24-bit colour.
    const build = Number(os.release().split('.')[2] || 0);
    return build >= 14931 ? 3 : 1;
  }
  if (/-256(color)?$/i.test(env.TERM || '')) return 2;
  return 1;
}

function supportsUnicode(env = process.env) {
  if (env.FORGEWP_ASCII) return false;
  if (process.platform !== 'win32') return env.TERM !== 'linux';
  return true; // Windows Terminal, VS Code, and modern conhost all render these glyphs
}

/**
 * Build a styled-output kit for a stream. Every function is a no-op wrapper
 * when colour is off, so callers never branch on colour support.
 */
export function createUi({ stream = process.stdout, env = process.env } = {}) {
  const level = detectColorLevel(stream, env);
  const unicode = supportsUnicode(env);
  const sgr = (open, close) => (text) => (level === 0 ? String(text) : `\x1b[${open}m${text}\x1b[${close}m`);

  const orangeOpen = level === 3 ? '38;2;249;115;22' : level === 2 ? '38;5;208' : '33';
  const c = {
    bold: sgr('1', '22'),
    dim: sgr('2', '22'),
    italic: sgr('3', '23'),
    underline: sgr('4', '24'),
    orange: sgr(orangeOpen, '39'),
    green: sgr('32', '39'),
    yellow: sgr('33', '39'),
    red: sgr('31', '39'),
    cyan: sgr('36', '39'),
    gray: sgr('90', '39'),
  };

  const symbols = unicode
    ? { step: '◇', active: '◆', done: '✔', warn: '▲', error: '✖', info: '●', bar: '│', start: '┌', end: '└', arrow: '→' }
    : { step: 'o', active: '*', done: '√', warn: '!', error: 'x', info: '*', bar: '|', start: '+', end: '+', arrow: '->' };

  /** The ForgeWP mark: three stepped bars and the brand-orange dot. */
  function mark() {
    if (!unicode) return null;
    const bar = (n) => '▀'.repeat(n) + '▘';
    return [bar(9), `${bar(5)}   ${c.orange('●')}`, bar(3)];
  }

  /**
   * Full banner for first-impression moments (create-forgewp, forgewp --help).
   * @param {{ version?: string, tagline?: string }} [opts]
   */
  function banner({ version, tagline } = {}) {
    const title = `${c.bold('ForgeWP')}${version ? `  ${c.dim(`v${version}`)}` : ''}`;
    const glyph = mark();
    if (level === 0 || !glyph) {
      return [`ForgeWP${version ? ` v${version}` : ''}${tagline ? ` - ${tagline}` : ''}`, ''].join('\n');
    }
    const pad = (s) => s + ' '.repeat(Math.max(0, 14 - visibleLength(s)));
    return [
      '',
      `  ${pad(glyph[0])}`,
      `  ${pad(glyph[1])}${title}`,
      `  ${pad(glyph[2])}${tagline ? c.dim(tagline) : ''}`,
      '',
    ].join('\n');
  }

  /** Quiet one-line header for everyday commands: `● ForgeWP export`. */
  function header(command, detail) {
    if (level === 0) return `ForgeWP ${command}${detail ? ` - ${detail}` : ''}`;
    return `\n  ${c.orange(symbols.info)} ${c.bold('ForgeWP')} ${command}${detail ? `  ${c.dim(detail)}` : ''}\n`;
  }

  const line = (symbol, color, text, meta) =>
    `  ${color(symbol)} ${text}${meta ? `  ${c.dim(meta)}` : ''}`;

  /**
   * Spinner for slow steps. Interactive terminals get an animated orange frame;
   * CI and pipes get one plain line per step. While spinning, console output from
   * anywhere else is printed cleanly above the spinner instead of mangling it.
   */
  function spinner() {
    const interactive = Boolean(stream.isTTY) && level > 0;
    const frames = unicode ? ['◒', '◐', '◓', '◑'] : ['-', '\\', '|', '/'];
    let timer = null;
    let index = 0;
    let message = '';
    let startedAt = 0;
    let pending = false;
    let restoreConsole = null;

    const clearLine = () => stream.write('\r\x1b[2K');
    const draw = () => {
      clearLine();
      stream.write(`  ${c.orange(frames[index])} ${message}`);
      index = (index + 1) % frames.length;
    };
    const patchConsole = () => {
      const originals = { log: console.log, warn: console.warn, error: console.error, info: console.info };
      for (const method of Object.keys(originals)) {
        console[method] = (...args) => {
          clearLine();
          originals[method](...args);
          draw();
        };
      }
      return () => Object.assign(console, originals);
    };
    const end = () => {
      if (timer) clearInterval(timer);
      timer = null;
      if (restoreConsole) restoreConsole();
      restoreConsole = null;
      if (interactive) {
        clearLine();
        stream.write('\x1b[?25h');
      }
    };

    return {
      start(msg) {
        // A new step implicitly completes the previous one.
        if (pending) this.stop();
        pending = true;
        message = msg;
        startedAt = Date.now();
        if (!interactive) return;
        stream.write('\x1b[?25l');
        restoreConsole = patchConsole();
        draw();
        timer = setInterval(draw, 120);
      },
      update(msg) {
        message = msg;
      },
      /** Finish successfully; the step's own duration is appended automatically. */
      stop(msg = message, meta) {
        if (!pending) return;
        pending = false;
        const elapsed = formatDuration(Date.now() - startedAt);
        end();
        stream.write(`${line(symbols.done, c.green, msg, meta ? `${meta}  ${elapsed}` : elapsed)}\n`);
      },
      fail(msg = message, meta) {
        pending = false;
        end();
        stream.write(`${line(symbols.error, c.red, msg, meta)}\n`);
      },
      get active() {
        return pending;
      },
    };
  }

  return {
    level,
    unicode,
    spinner,
    c,
    symbols,
    banner,
    header,
    step: (text, meta) => line(symbols.step, c.orange, text, meta),
    done: (text, meta) => line(symbols.done, c.green, text, meta),
    warn: (text, meta) => line(symbols.warn, c.yellow, text, meta),
    error: (text, meta) => line(symbols.error, c.red, text, meta),
    info: (text, meta) => line(symbols.info, c.cyan, text, meta),
    /** Indented continuation line under a status line. */
    detail: (text) => `    ${c.dim(text)}`,
    /** A command the user should run, styled consistently everywhere. */
    command: (text) => c.cyan(text),
    /** Result line for generators: `✔ Created block Hero  src/blocks/Hero.tsx`. */
    created: (kind, name, file) => line(symbols.done, c.green, `Created ${kind} ${c.bold(name)}`, file),
    /**
     * Full error block for CLI failures: the problem, then indented detail and fix lines.
     * `console.error(ui.errorBlock('No ForgeWP project found', 'Run it from your theme folder.'))`
     */
    errorBlock: (message, ...details) =>
      [
        '',
        line(symbols.error, c.red, message),
        ...details.flatMap((d) => String(d).split(/\r?\n/)).map((d) => `    ${c.dim(d)}`),
        '',
      ].join('\n'),
    /** A helpful aside: `💡 Change when it hydrates: …` (plain `Tip:` without Unicode). */
    tip: (text) => `    ${unicode ? '💡' : c.dim('Tip:')} ${text}`,
    /** Labelled follow-up line under a result: `Next  pnpm forgewp export`. */
    hint: (label, text) => `    ${c.dim(label.padEnd(5))} ${text}`,
  };
}

/** Human-friendly duration: 420ms, 3.2s, 1m 04s. */
export function formatDuration(ms) {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`;
  const m = Math.floor(ms / 60_000);
  const s = Math.round((ms % 60_000) / 1000);
  return `${m}m ${String(s).padStart(2, '0')}s`;
}

/** Length of a string as displayed (ANSI escape codes removed). */
export function visibleLength(text) {
  // eslint-disable-next-line no-control-regex
  return String(text).replace(/\x1b\[[0-9;]*m/g, '').length;
}
