/**
 * Pull the page body out of an SSR document.
 *
 * Default layouts contribute a shared header/footer, so the template keeps
 * the layout `<main>`'s children. A page that owns its document (blank
 * layout) rendered the shell itself — splitting it drops the client tree
 * that ties the shell to the page (scroll state, enter animations, refs).
 *
 * A page component may itself root at `<main>`. A non-greedy match stops at
 * that inner closer, leaves the page island unclosed, and the shared footer
 * is then parsed as a child of the island. Hydration replaces the island's
 * children with the page component, which does not render the layout footer.
 *
 * @param {string} markup
 * @param {string} [header]
 * @param {string} [footer]
 * @param {{ ownsShell?: boolean }} [options]
 * @returns {string}
 */
export function extractTemplateContent(markup, header, footer, options = {}) {
  if (!markup) return '';
  const ownsShell =
    options.ownsShell === true ||
    /<forgewp-content-boundary\b[^>]*\bdata-forgewp-owns-shell="true"/.test(
      markup,
    );
  const boundaryMatch = markup.match(
    /<forgewp-content-boundary\b[^>]*>([\s\S]*?)<\/forgewp-content-boundary>/i,
  );
  let res = boundaryMatch ? boundaryMatch[1] : markup;

  if (ownsShell) return res;

  const main = findBalancedElement(res, 'main');
  if (main) {
    const outside = res.slice(0, main.openIndex) + res.slice(main.closeEnd);
    // Header/footer beside <main> are the shared layout shell. Take the
    // balanced children so a nested page <main> stays closed. A <main> with
    // no shell beside it is the page itself — keep its island wrapper.
    if (/<(header|footer)\b/i.test(outside)) return main.inner;
    return res;
  }

  if (header) {
    const replaced = res.replace(header, '');
    res =
      replaced !== res
        ? replaced
        : res.replace(/<header\b[^>]*>([\s\S]*?)<\/header>/i, '');
  }
  if (footer) {
    const replaced = res.replace(footer, '');
    res =
      replaced !== res
        ? replaced
        : res.replace(/<footer\b[^>]*>([\s\S]*?)<\/footer>/i, '');
  }
  return res;
}

/**
 * First balanced element named `tag`, including nested copies of that tag.
 * @param {string} html
 * @param {string} tag
 * @returns {{ openIndex: number, openEnd: number, closeIndex: number, closeEnd: number, inner: string } | null}
 */
function findBalancedElement(html, tag) {
  const openRe = new RegExp(`<${tag}\\b[^>]*>`, 'i');
  const open = openRe.exec(html);
  if (!open) return null;
  const tokenRe = new RegExp(`<(/?)${tag}\\b[^>]*>`, 'gi');
  tokenRe.lastIndex = open.index;
  let depth = 0;
  let match;
  while ((match = tokenRe.exec(html))) {
    if (match[0].endsWith('/>')) continue;
    depth += match[1] === '/' ? -1 : 1;
    if (depth === 0) {
      const openEnd = open.index + open[0].length;
      return {
        openIndex: open.index,
        openEnd,
        closeIndex: match.index,
        closeEnd: match.index + match[0].length,
        inner: html.slice(openEnd, match.index),
      };
    }
  }
  return null;
}
