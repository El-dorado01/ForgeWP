/**
 * ForgeWP Native Forms — generates the REST submission endpoint, the
 * forgewp_submission CPT, the wp-admin "Forms" field editor, and the
 * hydration payload helper for every form declared in wp.config.ts's
 * `forms` key.
 *
 * See forgewp_forms_spec.md §4 for the full design. Emits nothing when
 * config.forms is absent/empty, so themes without forms get byte-identical
 * functions.php output.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';

const VALID_FIELD_TYPES = [
  'text',
  'email',
  'tel',
  'number',
  'textarea',
  'select',
  'checkbox',
];
const FORM_NAME_PATTERN = /^[a-z][a-z0-9-]*$/;

/**
 * Config-shape diagnostics (Principle 10 — fail at compile time, not at
 * runtime in a visitor's browser). Throws with an actionable message so a
 * bad `forms` config never silently produces broken PHP.
 */
export function isShortcodeModeForm(formConfig) {
  return formConfig.mode === 'shortcode';
}

export function validateFormsConfig(forms) {
  if (!forms) return;

  for (const [name, formConfig] of Object.entries(forms)) {
    if (!FORM_NAME_PATTERN.test(name)) {
      throw new Error(
        `[ForgeWP Forms] Invalid form name "${name}" in wp.config.ts's \`forms\` key. ` +
          `Form names become REST route segments and option-name suffixes — they must match /^[a-z][a-z0-9-]*$/ (e.g. "contact", "hotel-inquiry").`,
      );
    }

    if (isShortcodeModeForm(formConfig)) {
      if (!formConfig.shortcode || typeof formConfig.shortcode !== 'string') {
        throw new Error(
          `[ForgeWP Forms] forms.${name} has mode: 'shortcode' but no \`shortcode\` string. ` +
            `Provide the plugin's default shortcode, e.g. shortcode: '[contact-form-7 id="58" title="Contact Form"]'.`,
        );
      }
      continue;
    }

    if (!formConfig.mailTo) {
      throw new Error(
        `[ForgeWP Forms] forms.${name} is missing \`mailTo\` (required in 'native' mode — the default). ` +
          `Set mailTo: 'admin', an 'option:key', or a literal email — or set mode: 'shortcode' if this form is managed by a WordPress plugin instead.`,
      );
    }
    if (!formConfig.fields || Object.keys(formConfig.fields).length === 0) {
      throw new Error(
        `[ForgeWP Forms] forms.${name} is missing \`fields\` (required in 'native' mode — the default). ` +
          `Declare at least one dev-owned field, or set mode: 'shortcode' if this form is managed by a WordPress plugin instead.`,
      );
    }

    if (formConfig.confirmation?.enabled) {
      const confirmation = formConfig.confirmation;
      const recipientField = formConfig.fields[confirmation.emailField];
      if (!recipientField || recipientField.type !== 'email') {
        throw new Error(
          `[ForgeWP Forms] forms.${name}.confirmation.emailField must name a developer-owned field declared with type: 'email'.`,
        );
      }
      if (
        typeof confirmation.subject !== 'string' ||
        typeof confirmation.body !== 'string'
      ) {
        throw new Error(
          `[ForgeWP Forms] forms.${name}.confirmation requires plain-text subject and body strings when enabled.`,
        );
      }
      const templateText = `${confirmation.subject}\n${confirmation.body}`;
      for (const [, mergeField] of templateText.matchAll(
        /\{([a-zA-Z0-9_-]+)\}/g,
      )) {
        if (
          !Object.prototype.hasOwnProperty.call(formConfig.fields, mergeField)
        ) {
          throw new Error(
            `[ForgeWP Forms] forms.${name}.confirmation references undeclared developer-owned field "${mergeField}".`,
          );
        }
      }
    }

    if (formConfig.retentionDays !== undefined) {
      if (
        !Number.isSafeInteger(formConfig.retentionDays) ||
        formConfig.retentionDays < 1
      ) {
        throw new Error(
          `[ForgeWP Forms] forms.${name}.retentionDays must be a positive integer when configured.`,
        );
      }
      if (formConfig.storeSubmissions === false) {
        throw new Error(
          `[ForgeWP Forms] forms.${name}.retentionDays requires storeSubmissions to be enabled.`,
        );
      }
    }

    const devFieldNames = new Set(Object.keys(formConfig.fields || {}));
    const rawSeed = formConfig.clientFields?.enabled
      ? formConfig.clientFields.seed || []
      : [];
    const seedFields = Array.isArray(rawSeed)
      ? rawSeed
      : Object.values(rawSeed).flat();
    for (const field of seedFields) {
      if (devFieldNames.has(field.name)) {
        throw new Error(
          `[ForgeWP Forms] forms.${name}.clientFields.seed has a field named "${field.name}", which collides with a dev-owned field of the same name in forms.${name}.fields. ` +
            `Field ownership must be exclusive — rename one of them.`,
        );
      }
    }
  }
}

/**
 * Best-effort source scan for two common misuses that a config-only check
 * can't catch: calling submitWpForm() with a name that isn't declared, and
 * using <WpFormFields> on a form that doesn't have clientFields enabled.
 * Warns only — never throws, since this is a plain regex scan and false
 * positives are possible (e.g. a dynamically-built form name).
 */
export function lintFormsUsage(themeRoot, config) {
  const forms = config.forms || {};
  const declaredNames = Object.keys(forms);
  const shortcodeModeNames = new Set(
    declaredNames.filter((n) => isShortcodeModeForm(forms[n])),
  );
  const clientEnabledNames = new Set(
    declaredNames.filter(
      (n) => !shortcodeModeNames.has(n) && forms[n].clientFields?.enabled,
    ),
  );

  const srcDir = path.join(themeRoot, 'src');
  if (!existsSync(srcDir)) return [];

  const warnings = [];
  const skipDirs = new Set([
    'node_modules',
    '.forgewp',
    '.forgewp-islands',
    'dist',
  ]);
  const shortcodeUsageFound = new Set();

  function walk(dir) {
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!skipDirs.has(entry.name)) walk(path.join(dir, entry.name));
        continue;
      }
      if (!/\.(tsx|ts)$/.test(entry.name)) continue;

      const filePath = path.join(dir, entry.name);
      const relPath = path.relative(themeRoot, filePath);
      let content;
      try {
        content = readFileSync(filePath, 'utf8');
      } catch {
        continue;
      }

      for (const match of content.matchAll(
        /submitWpForm\(\s*['"]([a-zA-Z0-9_-]+)['"]/g,
      )) {
        const name = match[1];
        if (!declaredNames.includes(name)) {
          warnings.push(
            `[ForgeWP Forms] ${relPath}: submitWpForm('${name}', …) — "${name}" is not declared in wp.config.ts's \`forms\` key. ` +
              `Declared forms: ${declaredNames.length ? declaredNames.join(', ') : '(none)'}.`,
          );
        } else if (shortcodeModeNames.has(name)) {
          warnings.push(
            `[ForgeWP Forms] ${relPath}: submitWpForm('${name}', …) — "${name}" has mode: 'shortcode', so no REST endpoint was generated for it. Use <WpShortcode> instead, or switch its mode to 'native'.`,
          );
        }
      }

      for (const match of content.matchAll(
        /<WpFormFields\s+[^>]*\bform=["']([a-zA-Z0-9_-]+)["']/g,
      )) {
        const name = match[1];
        if (declaredNames.includes(name) && shortcodeModeNames.has(name)) {
          warnings.push(
            `[ForgeWP Forms] ${relPath}: <WpFormFields form="${name}"> — "${name}" has mode: 'shortcode', which has no client-field concept (the plugin manages its own fields). Remove this usage.`,
          );
        } else if (
          declaredNames.includes(name) &&
          !clientEnabledNames.has(name)
        ) {
          warnings.push(
            `[ForgeWP Forms] ${relPath}: <WpFormFields form="${name}"> — "${name}" does not have clientFields.enabled in wp.config.ts, so it will never render any fields.`,
          );
        }
      }

      // Dev-owned field name cross-check — catches a hand-typed <input
      // name="..."> that doesn't match any declared forms.X.fields key
      // (typo, or a field added in the component but never declared), and
      // the inverse (a required field declared but never rendered). Scoped
      // to the common, unambiguous case only — exactly one submitWpForm()
      // call and exactly one <form> block in the file — rather than trying
      // to associate inputs with forms in a file that has several of each.
      // Client-owned fields (rendered via name={field.name}, an expression,
      // never a string literal) never match this regex, so they're never
      // flagged either way.
      const submitCalls = [
        ...content.matchAll(/submitWpForm\(\s*['"]([a-zA-Z0-9_-]+)['"]/g),
      ];
      const formBlocks = [...content.matchAll(/<form\b[^>]*>/g)];
      if (submitCalls.length === 1 && formBlocks.length === 1) {
        const formName = submitCalls[0][1];
        const formConfig = forms[formName];
        if (
          formConfig &&
          !isShortcodeModeForm(formConfig) &&
          formConfig.fields
        ) {
          const formStart = formBlocks[0].index;
          const formEndIdx = content.indexOf('</form>', formStart);
          const formBlockContent =
            formEndIdx === -1
              ? content.slice(formStart)
              : content.slice(formStart, formEndIdx);

          const declaredFields = formConfig.fields;
          const declaredFieldNames = new Set(Object.keys(declaredFields));
          const foundNames = new Set();
          for (const m of formBlockContent.matchAll(
            /\sname=["']([a-zA-Z0-9_-]+)["']/g,
          )) {
            foundNames.add(m[1]);
          }

          for (const foundName of foundNames) {
            if (!declaredFieldNames.has(foundName)) {
              warnings.push(
                `[ForgeWP Forms] ${relPath}: name="${foundName}" inside the "${formName}" form doesn't match any dev-owned field declared in forms.${formName}.fields (${[...declaredFieldNames].join(', ') || '(none)'}). ` +
                  `If this is a typo, the field is silently treated as empty on submit — a required field would fail validation even though the user filled it in. If it's intentional, add it to forms.${formName}.fields.`,
              );
            }
          }

          for (const declaredName of declaredFieldNames) {
            if (
              declaredFields[declaredName].required &&
              !foundNames.has(declaredName)
            ) {
              warnings.push(
                `[ForgeWP Forms] ${relPath}: forms.${formName}.fields.${declaredName} is required, but no name="${declaredName}" was found in this form. If it's rendered dynamically (not a literal name="..." attribute), ignore this warning — otherwise every submission will fail validation.`,
              );
            }
          }
        }
      }

      if (shortcodeModeNames.size > 0 && /<WpShortcode\b/.test(content)) {
        for (const name of shortcodeModeNames) shortcodeUsageFound.add(name);
      }
    }
  }

  walk(srcDir);

  for (const name of shortcodeModeNames) {
    if (!shortcodeUsageFound.has(name)) {
      warnings.push(
        `[ForgeWP Forms] forms.${name} has mode: 'shortcode', but no <WpShortcode> usage was found anywhere in src/. This form is declared but not rendered anywhere.`,
      );
    }
  }

  for (const w of warnings) {
    console.warn(w);
  }
  return warnings;
}

function phpString(str) {
  return `'${String(str == null ? '' : str)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")}'`;
}

function safeFormSlug(name) {
  return name.replace(/[^a-z0-9_]/gi, '_');
}

function templateToPhpExpression(template) {
  const parts = template
    .split(/(\{[a-zA-Z0-9_-]+\})/g)
    .filter((part) => part !== '');
  return parts
    .map((part) => {
      const match = part.match(/^\{([a-zA-Z0-9_-]+)\}$/);
      return match
        ? `(isset($values[${phpString(match[1])}]) ? $values[${phpString(match[1])}] : '')`
        : phpString(part);
    })
    .join(' . ');
}

/**
 * @param {object} [opts]
 * @param {string} [opts.textDomain] - when set, the label is wrapped in
 *   __() for translation. Only appropriate for DEV-owned fields, whose
 *   label text is a compile-time-known string like any other themed
 *   string (matches the __() precedent used for CPT/taxonomy labels
 *   elsewhere in this codebase). Client-owned field labels are runtime
 *   content typed into wp-admin — wrapping those in __() would be wrong
 *   (gettext only ever translates literal source strings) and they get
 *   proper per-locale storage instead (see buildFormsPhp's isMultilingual path).
 */
function fieldDefToPhpArray(name, field, opts = {}) {
  const type = VALID_FIELD_TYPES.includes(field.type) ? field.type : 'text';
  const label =
    field.label ||
    name.replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const labelPhp = opts.textDomain
    ? `__(${phpString(label)}, ${phpString(opts.textDomain)})`
    : phpString(label);
  const required = field.required ? 'true' : 'false';
  const maxLength = field.maxLength
    ? parseInt(field.maxLength, 10)
    : type === 'textarea'
      ? 5000
      : 200;
  const optionsPhp = Array.isArray(field.options)
    ? `array(${field.options.map((o) => phpString(o)).join(', ')})`
    : 'array()';
  const placeholderPhp =
    opts.textDomain && field.placeholder
      ? `__(${phpString(field.placeholder)}, ${phpString(opts.textDomain)})`
      : phpString(field.placeholder || '');
  return `array(
            'name'        => ${phpString(name)},
            'label'       => ${labelPhp},
            'type'        => ${phpString(type)},
            'required'    => ${required},
            'maxLength'   => ${Number.isFinite(maxLength) ? maxLength : 200},
            'options'     => ${optionsPhp},
            'placeholder' => ${placeholderPhp},
        )`;
}

function devFieldsPhpArray(fields, textDomain) {
  const entries = Object.entries(fields || {});
  if (entries.length === 0) return 'array()';
  return `array(\n${entries.map(([name, field]) => `        ${fieldDefToPhpArray(name, field, { textDomain })},`).join('\n')}\n    )`;
}

function seedFieldsPhpArray(seed) {
  if (!Array.isArray(seed) || seed.length === 0) return 'array()';
  return `array(\n${seed.map((field) => `        ${fieldDefToPhpArray(field.name, field)},`).join('\n')}\n    )`;
}

/**
 * Normalizes a clientFields.seed value (flat array OR per-locale map) into
 * a PHP array literal keyed by locale, e.g. array('en' => array(...), 'de' => array(...)).
 * A flat array is used as-is for every configured locale.
 */
function seedByLocalePhpArray(seed, locales) {
  const perLocale = Array.isArray(seed)
    ? Object.fromEntries(locales.map((l) => [l, seed]))
    : seed || {};
  const entries = locales.map(
    (l) =>
      `        ${phpString(l)} => ${seedFieldsPhpArray(perLocale[l] || [])},`,
  );
  return `array(\n${entries.join('\n')}\n    )`;
}

/**
 * Shared runtime helpers, emitted once regardless of how many forms exist.
 */
function buildSharedHelpersPhp(defaultLocale) {
  const fallbackLangPhp = phpString(defaultLocale || '');
  return `
if (!function_exists('forgewp_forms_rate_limit_ok')) {
    /**
     * Max 5 submissions per 10 minutes per IP, across all forms. Uses
     * REMOTE_ADDR only — X-Forwarded-For is attacker-controlled and would
     * let a bot trivially reset its own limit.
     */
    function forgewp_forms_rate_limit_ok() {
        $ip = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '';
        $key = 'forgewp_form_rl_' . md5($ip);
        $count = (int) get_transient($key);
        if ($count >= 5) {
            return false;
        }
        set_transient($key, $count + 1, 10 * MINUTE_IN_SECONDS);
        return true;
    }
}

if (!function_exists('forgewp_forms_strip_header_injection')) {
    function forgewp_forms_strip_header_injection($value) {
        if (!is_string($value)) {
            return $value;
        }
        return str_replace(array("\\r", "\\n"), '', $value);
    }
}

if (!function_exists('forgewp_forms_sanitize_field')) {
    function forgewp_forms_sanitize_field($value, $field_def) {
        $type = isset($field_def['type']) ? $field_def['type'] : 'text';
        $max_length = isset($field_def['maxLength']) ? (int) $field_def['maxLength'] : 200;

        if ($type === 'checkbox') {
            return (!empty($value) && $value !== '0' && $value !== 'false') ? '1' : '';
        }

        $value = is_scalar($value) ? (string) $value : '';
        $value = forgewp_forms_strip_header_injection($value);

        if ($type === 'email') {
            $value = sanitize_email($value);
        } elseif ($type === 'textarea') {
            $value = sanitize_textarea_field($value);
        } else {
            $value = sanitize_text_field($value);
        }

        if ($max_length > 0 && function_exists('mb_substr')) {
            $value = mb_substr($value, 0, $max_length);
        } elseif ($max_length > 0) {
            $value = substr($value, 0, $max_length);
        }

        return $value;
    }
}

if (!function_exists('forgewp_forms_validate_and_sanitize')) {
    /**
     * Validates $submitted against $field_defs (the merged dev-owned +
     * client-owned allowlist). Only keys present in $field_defs are ever
     * read from $submitted — everything else is silently ignored, which is
     * the field-ownership boundary that makes client-added/dropped fields
     * safe without any theme code changes.
     *
     * @return array{values: array, errors: array}
     */
    function forgewp_forms_validate_and_sanitize($submitted, $field_defs) {
        $values = array();
        $errors = array();

        foreach ($field_defs as $field_def) {
            $name = $field_def['name'];
            $type = isset($field_def['type']) ? $field_def['type'] : 'text';
            $required = !empty($field_def['required']);
            $raw = isset($submitted[$name]) ? $submitted[$name] : '';

            if ($type === 'select' && $raw !== '' && !empty($field_def['options']) && !in_array($raw, $field_def['options'], true)) {
                $errors[$name] = __('Please choose a valid option.', 'forgewp');
                continue;
            }

            $clean = forgewp_forms_sanitize_field($raw, $field_def);

            if ($required && ($clean === '' || $clean === null)) {
                $errors[$name] = __('This field is required.', 'forgewp');
                continue;
            }

            if ($type === 'email' && $clean !== '' && !is_email($clean)) {
                $errors[$name] = __('Please enter a valid email address.', 'forgewp');
                continue;
            }

            $values[$name] = $clean;
        }

        return array('values' => $values, 'errors' => $errors);
    }
}

if (!function_exists('forgewp_forms_resolve_lang')) {
    /**
     * Same resolution order used for menus/translations elsewhere in
     * generated functions.php: explicit request param, then Polylang/WPML,
     * then the site locale. An explicit $requested_lang (from a submitted
     * form's own 'lang' param) always wins — REST requests don't reliably
     * carry the visited page's Polylang context the way a normal page
     * load does.
     */
    function forgewp_forms_resolve_lang($requested_lang = null) {
        if (!empty($requested_lang)) {
            return sanitize_key($requested_lang);
        }
        if (function_exists('pll_current_language')) {
            $lang = pll_current_language();
            if (!empty($lang)) {
                return $lang;
            }
        } elseif (defined('ICL_LANGUAGE_CODE')) {
            return ICL_LANGUAGE_CODE;
        }
        if (function_exists('pll_default_language')) {
            $lang = pll_default_language();
            if (!empty($lang)) {
                return $lang;
            }
        }
        $locale = get_locale();
        if (strpos($locale, '_') !== false) {
            $locale = explode('_', $locale)[0];
        }
        return $locale ?: 'en';
    }
}

if (!function_exists('forgewp_forms_get_client_fields')) {
    /**
     * Reads the currently stored client-owned field definitions for a form,
     * falling back to its config-baked seed if the option was never
     * initialized (should not normally happen — after_switch_theme/init
     * seeds it — but production sites may have skipped that hook, e.g.
     * after a manual DB import).
     *
     * $seed's own shape decides single- vs multi-locale behavior — the
     * compiler passes a flat list for single-locale themes (unchanged
     * behavior) or a locale-keyed map (array('en' => array(...), …)) for
     * themes with more than one configured locale. Client-owned labels are
     * runtime content typed into wp-admin, not compiled strings, so they
     * can't go through __()/translations.json — they need this per-locale
     * storage instead.
     */
    function forgewp_forms_get_client_fields($form_name, $seed, $lang = null) {
        $option_name = 'forgewp_form_fields_' . $form_name;
        $stored = get_option($option_name, null);
        $is_multilingual_seed = is_array($seed) && !isset($seed[0]);

        if (!$is_multilingual_seed) {
            // Single-locale theme — unchanged flat-list behavior.
            return is_array($stored) ? $stored : $seed;
        }

        $resolved_lang = forgewp_forms_resolve_lang($lang);

        if (is_array($stored)) {
            $stored_is_legacy_flat = isset($stored[0]) && is_array($stored[0]) && isset($stored[0]['name']);
            if ($stored_is_legacy_flat) {
                // Data saved before this form went multilingual — same
                // content for every locale until the client re-saves a
                // specific language tab, which splits storage per-locale.
                return $stored;
            }
            if (isset($stored[$resolved_lang]) && is_array($stored[$resolved_lang])) {
                return $stored[$resolved_lang];
            }
        }

        if (isset($seed[$resolved_lang])) {
            return $seed[$resolved_lang];
        }

        // $resolved_lang isn't a locale this form actually has fields for
        // (e.g. a forged/unrecognized 'lang' request param on a REST
        // submission) — degrade to a REAL locale's field set instead of an
        // empty array, so required client-owned fields still get validated
        // rather than silently vanishing from validation entirely. Falls
        // back to the theme's configured default locale, then to whichever
        // locale the seed actually has.
        $fallback_lang = ${fallbackLangPhp};
        if ($fallback_lang !== '' && isset($seed[$fallback_lang])) {
            return $seed[$fallback_lang];
        }
        if (is_array($seed) && !empty($seed)) {
            return reset($seed);
        }
        return array();
    }
}
`;
}

function buildSubmissionCptPhp(textDomain, formNames, adminCapability) {
  const formNamesPhpArray = `array(${formNames.map((n) => phpString(n)).join(', ')})`;
  const submissionCapabilities = [
    'edit_post',
    'read_post',
    'delete_post',
    'edit_posts',
    'edit_others_posts',
    'publish_posts',
    'read_private_posts',
    'delete_posts',
    'delete_private_posts',
    'delete_published_posts',
    'delete_others_posts',
    'edit_private_posts',
    'edit_published_posts',
  ]
    .map(
      (capability) =>
        `                '${capability}' => ${phpString(adminCapability)},`,
    )
    .join('\n');

  return `
if (!function_exists('forgewp_register_submission_cpt')) {
    function forgewp_register_submission_cpt() {
        register_post_type('forgewp_submission', array(
            'labels' => array(
                'name'          => __('Form Submissions', '${textDomain}'),
                'singular_name' => __('Submission', '${textDomain}'),
                'menu_name'     => __('Form Submissions', '${textDomain}'),
                'all_items'     => __('All Submissions', '${textDomain}'),
                'not_found'     => __('No submissions yet.', '${textDomain}'),
            ),
            'public'       => false,
            'show_ui'      => true,
            'show_in_menu' => true,
            'menu_icon'    => 'dashicons-email-alt',
            'supports'     => array('title'),
            'capability_type' => 'forgewp_submission',
            'capabilities' => array(
${submissionCapabilities}
                'create_posts' => 'do_not_allow',
            ),
            // The configured Forms capability is primitive; do not register it as a global meta-cap alias.
            'map_meta_cap' => false,
        ));
    }
    add_action('init', 'forgewp_register_submission_cpt');
}

if (!function_exists('forgewp_submission_columns')) {
    /**
     * Adds a "Form" column so the submissions list stays legible once a
     * theme has more than one form — without this, the list is just
     * "contact — 2026-07-17" / "hotel-inquiry — 2026-07-17" rows with no
     * way to tell forms apart at a glance or filter to just one.
     */
    function forgewp_submission_columns($columns) {
        $new_columns = array();
        foreach ($columns as $key => $label) {
            $new_columns[$key] = $label;
            if ($key === 'title') {
                $new_columns['forgewp_form'] = __('Form', '${textDomain}');
            }
        }
        return $new_columns;
    }
    add_filter('manage_forgewp_submission_posts_columns', 'forgewp_submission_columns');

    function forgewp_submission_column_content($column, $post_id) {
        if ($column === 'forgewp_form') {
            $form_name = get_post_meta($post_id, '_form_name', true);
            echo esc_html($form_name ? $form_name : '\\u2014');
        }
    }
    add_action('manage_forgewp_submission_posts_custom_column', 'forgewp_submission_column_content', 10, 2);

    function forgewp_submission_sortable_columns($columns) {
        $columns['forgewp_form'] = 'forgewp_form';
        return $columns;
    }
    add_filter('manage_edit-forgewp_submission_sortable_columns', 'forgewp_submission_sortable_columns');
}

if (!function_exists('forgewp_submission_filter_dropdown')) {
    /**
     * "Filter by form" dropdown above the submissions list — only worth
     * showing once a theme actually has more than one form.
     */
    function forgewp_submission_filter_dropdown() {
        global $typenow;
        if ($typenow !== 'forgewp_submission') {
            return;
        }
        $forms = ${formNamesPhpArray};
        if (count($forms) < 2) {
            return;
        }
        $current = isset($_GET['forgewp_form']) ? sanitize_text_field($_GET['forgewp_form']) : '';
        echo '<select name="forgewp_form">';
        echo '<option value="">' . esc_html__('All forms', '${textDomain}') . '</option>';
        foreach ($forms as $form) {
            echo '<option value="' . esc_attr($form) . '"' . selected($current, $form, false) . '>' . esc_html($form) . '</option>';
        }
        echo '</select>';
    }
    add_action('restrict_manage_posts', 'forgewp_submission_filter_dropdown');

    function forgewp_submission_filter_query($query) {
        global $pagenow, $typenow;
        if (!is_admin() || $pagenow !== 'edit.php' || $typenow !== 'forgewp_submission' || !$query->is_main_query()) {
            return;
        }
        if (!empty($_GET['forgewp_form'])) {
            $query->set('meta_key', '_form_name');
            $query->set('meta_value', sanitize_text_field($_GET['forgewp_form']));
        }
        if ($query->get('orderby') === 'forgewp_form') {
            $query->set('meta_key', '_form_name');
            $query->set('orderby', 'meta_value');
        }
    }
    add_action('pre_get_posts', 'forgewp_submission_filter_query');
}

if (!function_exists('forgewp_submission_meta_box')) {
    function forgewp_submission_meta_box() {
        add_meta_box(
            'forgewp_submission_fields',
            __('Submission Details', '${textDomain}'),
            'forgewp_render_submission_meta_box',
            'forgewp_submission',
            'normal',
            'high'
        );
    }

      add_action('add_meta_boxes', 'forgewp_submission_meta_box');
    }

    if (!function_exists('forgewp_render_submission_meta_box')) {
      function forgewp_render_submission_meta_box($post) {
        $meta = get_post_meta($post->ID);
        echo '<table class="widefat"><tbody>';
        foreach ($meta as $key => $values) {
          if (strpos($key, 'field_') !== 0) {
            continue;
          }
          $label = ucwords(str_replace(array('field_', '_'), array('', ' '), $key));
          $value = isset($values[0]) ? $values[0] : '';
          echo '<tr><th style="text-align:left;width:180px">' . esc_html($label) . '</th><td>' . esc_html($value) . '</td></tr>';
        }
        $form_name = get_post_meta($post->ID, '_form_name', true);
        $submitted_at = get_post_meta($post->ID, '_submitted_at', true);
        echo '<tr><th style="text-align:left">' . esc_html__('Form', '${textDomain}') . '</th><td>' . esc_html($form_name) . '</td></tr>';
        echo '<tr><th style="text-align:left">' . esc_html__('Submitted', '${textDomain}') . '</th><td>' . esc_html($submitted_at) . '</td></tr>';
        echo '</tbody></table>';
      }
    }

    if (!function_exists('forgewp_store_submission')) {
      function forgewp_store_submission($form_name, $values, $field_defs, $language = '') {
        $ip = isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '';
        $post_id = wp_insert_post(array(
          'post_type'   => 'forgewp_submission',
          'post_status' => 'publish',
          'post_title'  => sprintf('%s — %s', $form_name, current_time('mysql')),
        ));
        if (is_wp_error($post_id) || !$post_id) {
          return false;
        }
        foreach ($values as $key => $value) {
          update_post_meta($post_id, 'field_' . $key, $value);
        }
        foreach ($field_defs as $field_def) {
          $email_field = isset($field_def['name']) ? $field_def['name'] : '';
          if (
            isset($field_def['type']) &&
            $field_def['type'] === 'email' &&
            $email_field !== '' &&
            !empty($values[$email_field]) &&
            is_email($values[$email_field])
          ) {
            $normalized_email = strtolower(trim((string) $values[$email_field]));
            add_post_meta(
              $post_id,
              '_privacy_email_hash',
              hash_hmac('sha256', $normalized_email, wp_salt('auth')),
            );
          }
        }
        update_post_meta($post_id, '_form_name', $form_name);
        update_post_meta($post_id, '_submitted_at', current_time('mysql'));
        if (!empty($language)) {
          update_post_meta($post_id, '_form_lang', sanitize_key($language));
        }
        update_post_meta($post_id, '_ip_hash', md5($ip));
        return $post_id;
      }
    }
    `;
}

function buildSubmissionToolsPhp(forms, textDomain, adminCapability, locales) {
  const entries = Object.entries(forms);
  const storedNamesPhp = `array(${entries.map(([name]) => phpString(name)).join(', ')})`;
  const emailFields = entries
    .map(([name, form]) => [
      name,
      Object.entries(form.fields || {})
        .filter(([, field]) => field.type === 'email')
        .map(([fieldName]) => fieldName),
    ])
    .filter(([, fieldNames]) => fieldNames.length > 0);
  const emailFieldsPhp = `array(
        ${emailFields
          .map(
            ([name, fieldNames]) =>
              `        ${phpString(name)} => array(${fieldNames.map(phpString).join(', ')}),`,
          )
          .join('\n')}
          )`;
  const privacyForms = entries;
  const staticLabelsPhp = `array(
        ${entries
          .map(([name, form]) => {
            const fields = Object.entries(form.fields || {}).map(
              ([fieldName, field]) => {
                const label =
                  field.label ||
                  fieldName
                    .replace(/[_-]/g, ' ')
                    .replace(/\b\w/g, (letter) => letter.toUpperCase());
                return `            ${phpString(fieldName)} => __( ${phpString(label)}, ${phpString(textDomain)} ),`;
              },
            );
            const clientSeed = form.clientFields?.enabled
              ? Array.isArray(form.clientFields.seed)
                ? form.clientFields.seed
                : Object.values(form.clientFields.seed || {}).flat()
              : [];
            fields.push(
              ...clientSeed.map(
                (field) =>
                  `            ${phpString(field.name)} => ${phpString(field.label || field.name)},`,
              ),
            );
            return `        ${phpString(name)} => array(\n${fields.join('\n')}\n        ),`;
          })
          .join('\n')}
          )`;
  const clientSeeds = entries.filter(([, form]) => form.clientFields?.enabled);
  const clientSeedsPhp = `array(
        ${clientSeeds
          .map(([name, form]) => {
            const seedPhp =
              locales.length > 1
                ? seedByLocalePhpArray(form.clientFields.seed, locales)
                : seedFieldsPhpArray(
                    Array.isArray(form.clientFields.seed)
                      ? form.clientFields.seed
                      : Object.values(form.clientFields.seed || {}).flat(),
                  );
            return `        ${phpString(name)} => ${seedPhp},`;
          })
          .join('\n')}
          )`;
  const retentionRules = entries.filter(
    ([, form]) => form.retentionDays !== undefined,
  );
  const retentionRulesPhp = `array(${retentionRules
    .map(([name, form]) => `${phpString(name)} => ${form.retentionDays}`)
    .join(', ')})`;
  const langPhp =
    locales.length > 1 ? '        $lang = forgewp_forms_resolve_lang();\n' : '';
  const retentionPhp =
    retentionRules.length > 0
      ? `
        if (!function_exists('forgewp_forms_retention_cleanup')) {
          function forgewp_forms_retention_cleanup() {
            $retention_days = ${retentionRulesPhp};
            $deleted = 0;
            foreach ($retention_days as $form_name => $days) {
              $cutoff = current_datetime()->modify('-' . (int) $days . ' days')->format('Y-m-d H:i:s');
              do {
                $ids = get_posts(array(
                  'post_type' => 'forgewp_submission',
                  'post_status' => 'any',
                  'posts_per_page' => 100,
                  'fields' => 'ids',
                  'orderby' => 'ID',
                  'order' => 'ASC',
                  'meta_query' => array(
                    'relation' => 'AND',
                    array('key' => '_form_name', 'value' => $form_name, 'compare' => '='),
                    array('key' => '_submitted_at', 'value' => $cutoff, 'compare' => '<', 'type' => 'DATETIME'),
                  ),
                ));
                $batch_deleted = 0;
                foreach ($ids as $submission_id) {
                  if (wp_delete_post($submission_id, true)) {
                    $batch_deleted++;
                    $deleted++;
                  }
                }
              } while (count($ids) === 100 && $batch_deleted > 0);
            }
            if ($deleted > 0) {
              error_log('[ForgeWP Forms] Retention cleanup permanently deleted ' . $deleted . ' expired submission(s).');
            }
          }
          add_action('forgewp_forms_retention_cleanup', 'forgewp_forms_retention_cleanup');
          add_action('init', function () {
            if (!wp_next_scheduled('forgewp_forms_retention_cleanup')) {
              $scheduled = wp_schedule_event(time() + HOUR_IN_SECONDS, 'daily', 'forgewp_forms_retention_cleanup');
              if (is_wp_error($scheduled) || $scheduled === false) {
                error_log('[ForgeWP Forms] Could not schedule retention cleanup.');
              }
            }
          });
        }
        `
      : `
        add_action('init', function () {
          wp_clear_scheduled_hook('forgewp_forms_retention_cleanup');
        });
        `;

  return `
        if (!function_exists('forgewp_forms_submission_field_labels')) {
          function forgewp_forms_submission_field_labels() {
            $labels = ${staticLabelsPhp};
            $client_seeds = ${clientSeedsPhp};
        ${langPhp}        foreach ($client_seeds as $form_name => $seed) {
              $client_fields = forgewp_forms_get_client_fields($form_name, $seed${locales.length > 1 ? ', $lang' : ''});
              foreach ($client_fields as $field) {
                if (isset($field['name'])) {
                  $labels[$form_name][$field['name']] = isset($field['label']) ? $field['label'] : $field['name'];
                }
              }
            }
            return $labels;
          }
        }

        if (!function_exists('forgewp_forms_csv_safe_value')) {
          function forgewp_forms_csv_safe_value($value) {
            $value = is_scalar($value) ? (string) $value : '';
            $first = substr($value, 0, 1);
            if (in_array($first, array('=', '+', '-', '@', chr(9), chr(13)), true)) {
              return "'" . $value;
            }
            return $value;
          }
        }

        if (!function_exists('forgewp_forms_render_export_page')) {
          function forgewp_forms_render_export_page() {
            if (!current_user_can(${phpString(adminCapability)})) {
              wp_die(__('You do not have permission to export form submissions.', '${textDomain}'));
            }
            $forms = ${storedNamesPhp};
            $field_labels = forgewp_forms_submission_field_labels();
            ?>
            <div class="wrap">
              <h1><?php esc_html_e('Export form submissions', '${textDomain}'); ?></h1>
              <p><?php esc_html_e('Exports include submitted personal data. Store the file securely and delete it when it is no longer needed. IP hashes are never exported.', '${textDomain}'); ?></p>
              <form method="post" action="<?php echo esc_url( admin_url('admin-post.php') ); ?>">
                <input type="hidden" name="action" value="forgewp_forms_export_csv" />
                <?php wp_nonce_field('forgewp_forms_export_csv'); ?>
                <table class="form-table"><tbody>
                  <tr><th scope="row"><label for="forgewp-export-form"><?php esc_html_e('Form', '${textDomain}'); ?></label></th><td>
                    <select id="forgewp-export-form" name="forgewp_form">
                      <option value="all"><?php esc_html_e('All stored forms', '${textDomain}'); ?></option>
                      <?php foreach ($forms as $form_name) : ?><option value="<?php echo esc_attr($form_name); ?>"><?php echo esc_html($form_name); ?></option><?php endforeach; ?>
                    </select>
                  </td></tr>
                  <tr><th scope="row"><label for="forgewp-export-from"><?php esc_html_e('From date', '${textDomain}'); ?></label></th><td><input id="forgewp-export-from" type="date" name="forgewp_from" /></td></tr>
                  <tr><th scope="row"><label for="forgewp-export-to"><?php esc_html_e('To date', '${textDomain}'); ?></label></th><td><input id="forgewp-export-to" type="date" name="forgewp_to" /></td></tr>
                </tbody></table>
                <fieldset class="forgewp-export-fields">
                  <legend><?php esc_html_e('Personal-data fields to include', '${textDomain}'); ?></legend>
                  <p><?php esc_html_e('Fields are unchecked by default. Select only the columns required for this export.', '${textDomain}'); ?></p>
                  <?php foreach ($field_labels as $form_name => $fields) : ?>
                    <fieldset class="forgewp-export-form-fields" data-export-form="<?php echo esc_attr($form_name); ?>">
                      <legend><?php echo esc_html($form_name); ?></legend>
                      <?php foreach ($fields as $field_name => $field_label) : ?>
                        <label><input type="checkbox" name="forgewp_fields[]" value="<?php echo esc_attr($form_name . '|' . $field_name); ?>" /> <?php echo esc_html($field_label); ?></label>
                      <?php endforeach; ?>
                    </fieldset>
                  <?php endforeach; ?>
                </fieldset>
                <?php submit_button( __('Download CSV', '${textDomain}') ); ?>
              </form>
            </div>
            <?php
          }
          add_action('admin_menu', function () {
            add_submenu_page(
              'edit.php?post_type=forgewp_submission',
              __('Export form submissions', '${textDomain}'),
              __('Export CSV', '${textDomain}'),
              ${phpString(adminCapability)},
              'forgewp-submission-export',
              'forgewp_forms_render_export_page'
            );
          });
        }

        if (!function_exists('forgewp_forms_export_csv')) {
          function forgewp_forms_export_csv() {
            if (!current_user_can(${phpString(adminCapability)})) {
              wp_die(__('You do not have permission to export form submissions.', '${textDomain}'));
            }
            check_admin_referer('forgewp_forms_export_csv');
            $allowed_forms = ${storedNamesPhp};
            $selected_form = isset($_POST['forgewp_form']) ? sanitize_key(wp_unslash($_POST['forgewp_form'])) : 'all';
            if ($selected_form !== 'all' && !in_array($selected_form, $allowed_forms, true)) {
              wp_die(__('Invalid form filter.', '${textDomain}'));
            }
            $from = isset($_POST['forgewp_from']) ? sanitize_text_field(wp_unslash($_POST['forgewp_from'])) : '';
            $to = isset($_POST['forgewp_to']) ? sanitize_text_field(wp_unslash($_POST['forgewp_to'])) : '';
            foreach (array($from, $to) as $date) {
              if ($date !== '') {
                $parsed = DateTime::createFromFormat('!Y-m-d', $date);
                if (!$parsed || $parsed->format('Y-m-d') !== $date) {
                  wp_die(__('Dates must use the YYYY-MM-DD format.', '${textDomain}'));
                }
              }
            }
            if ($from !== '' && $to !== '' && $from > $to) {
              wp_die(__('The start date must not be after the end date.', '${textDomain}'));
            }

            $meta_query = array('relation' => 'AND');
            if ($selected_form !== 'all') {
              $meta_query[] = array('key' => '_form_name', 'value' => $selected_form, 'compare' => '=');
            }
            if ($from !== '') {
              $meta_query[] = array('key' => '_submitted_at', 'value' => $from . ' 00:00:00', 'compare' => '>=', 'type' => 'DATETIME');
            }
            if ($to !== '') {
              $meta_query[] = array('key' => '_submitted_at', 'value' => $to . ' 23:59:59', 'compare' => '<=', 'type' => 'DATETIME');
            }

            $labels = forgewp_forms_submission_field_labels();
            $requested_fields = isset($_POST['forgewp_fields']) && is_array($_POST['forgewp_fields'])
              ? array_map('sanitize_text_field', wp_unslash($_POST['forgewp_fields']))
              : array();
            $columns = array();
            foreach ($requested_fields as $field_key) {
              $separator = strpos($field_key, '|');
              if ($separator === false) {
                continue;
              }
              $field_form = substr($field_key, 0, $separator);
              $field_name = substr($field_key, $separator + 1);
              if (
                ($selected_form !== 'all' && $selected_form !== $field_form) ||
                !isset($labels[$field_form][$field_name])
              ) {
                continue;
              }
              $columns[] = array(
                'form' => $field_form,
                'field' => $field_name,
                'label' => $selected_form === 'all'
                  ? $field_form . ' / ' . $labels[$field_form][$field_name]
                  : $labels[$field_form][$field_name],
              );
            }
            if (empty($columns)) {
              wp_die(__('Select at least one valid field to export.', '${textDomain}'));
            }

            nocache_headers();
            header('Content-Type: text/csv; charset=utf-8');
            header('Content-Disposition: attachment; filename="forgewp-submissions-' . gmdate('Y-m-d') . '.csv"');
            $output = fopen('php://output', 'w');
            fwrite($output, chr(239) . chr(187) . chr(191));
                $header = array(__('Form', '${textDomain}'), __('Language', '${textDomain}'), __('Submitted at', '${textDomain}'));
            foreach ($columns as $column) {
              $header[] = forgewp_forms_csv_safe_value($column['label']);
            }
            fputcsv($output, $header);

            $offset = 0;
            $exported = 0;
            do {
              $posts = get_posts(array(
                'post_type' => 'forgewp_submission',
                'post_status' => 'any',
                'posts_per_page' => 200,
                'offset' => $offset,
                'orderby' => 'ID',
                'order' => 'ASC',
                'meta_query' => count($meta_query) > 1 ? $meta_query : array(),
              ));
              foreach ($posts as $submission) {
                $form_name = get_post_meta($submission->ID, '_form_name', true);
                if (!in_array($form_name, $allowed_forms, true)) {
                  continue;
                }
                $row = array(
                  forgewp_forms_csv_safe_value($form_name),
                  forgewp_forms_csv_safe_value(get_post_meta($submission->ID, '_form_lang', true)),
                  forgewp_forms_csv_safe_value(get_post_meta($submission->ID, '_submitted_at', true)),
                );
                foreach ($columns as $column) {
                  $value = $column['form'] === $form_name
                    ? get_post_meta($submission->ID, 'field_' . $column['field'], true)
                    : '';
                  $row[] = forgewp_forms_csv_safe_value($value);
                }
                fputcsv($output, $row);
                $exported++;
              }
              $offset += count($posts);
            } while (count($posts) === 200);

            fclose($output);
            error_log('[ForgeWP Forms] CSV export completed (user ID: ' . get_current_user_id() . ', form: ' . $selected_form . ', rows: ' . $exported . ').');
            exit;
          }
          add_action('admin_post_forgewp_forms_export_csv', 'forgewp_forms_export_csv');
        }

        ${
          privacyForms.length > 0
            ? `
        if (!function_exists('forgewp_forms_privacy_email_fields')) {
          function forgewp_forms_privacy_email_fields() {
              $email_fields = ${emailFieldsPhp};
              $client_seeds = ${clientSeedsPhp};
  ${langPhp}            foreach ($client_seeds as $form_name => $seed) {
                if (!isset($email_fields[$form_name])) {
                  $email_fields[$form_name] = array();
                }
                $fields = forgewp_forms_get_client_fields($form_name, $seed${locales.length > 1 ? ', $lang' : ''});
                foreach ($fields as $field) {
                  if (isset($field['name'], $field['type']) && $field['type'] === 'email') {
                    $email_fields[$form_name][] = $field['name'];
                  }
                }
                $email_fields[$form_name] = array_values(array_unique($email_fields[$form_name]));
              }
              return $email_fields;
          }
        }

        if (!function_exists('forgewp_forms_privacy_submission_ids')) {
          function forgewp_forms_privacy_submission_ids($email_address, $page = 1) {
            $email_address = sanitize_email($email_address);
            if (!is_email($email_address)) {
              return array();
            }
            $normalized_email = strtolower(trim($email_address));
            $meta_query = array(
              'relation' => 'OR',
              array(
                'key' => '_privacy_email_hash',
                'value' => hash_hmac('sha256', $normalized_email, wp_salt('auth')),
                'compare' => '=',
              ),
            );
            foreach (forgewp_forms_privacy_email_fields() as $form_name => $field_names) {
              foreach ($field_names as $field_name) {
                $meta_query[] = array(
                  'relation' => 'AND',
                  array('key' => '_form_name', 'value' => $form_name, 'compare' => '='),
                  array('key' => 'field_' . $field_name, 'value' => $email_address, 'compare' => '='),
                );
              }
            }
            if (count($meta_query) < 2) {
              return array();
            }
            return get_posts(array(
              'post_type' => 'forgewp_submission',
              'post_status' => 'any',
              'posts_per_page' => 100,
              'offset' => max(0, ((int) $page - 1) * 100),
              'fields' => 'ids',
              'orderby' => 'ID',
              'order' => 'ASC',
              'meta_query' => $meta_query,
            ));
          }
        }

        if (!function_exists('forgewp_forms_privacy_export')) {
          function forgewp_forms_privacy_export($email_address, $page = 1) {
            $ids = forgewp_forms_privacy_submission_ids($email_address, $page);
            $labels = forgewp_forms_submission_field_labels();
            $data = array();
            foreach ($ids as $submission_id) {
              $form_name = get_post_meta($submission_id, '_form_name', true);
              $submitted_at = get_post_meta($submission_id, '_submitted_at', true);
              $fields = get_post_meta($submission_id);
              $item_data = array(
                array('name' => __('Form', '${textDomain}'), 'value' => $form_name),
                array('name' => __('Submitted at', '${textDomain}'), 'value' => $submitted_at),
              );
              foreach ($fields as $key => $values) {
                if (strpos($key, 'field_') !== 0) {
                  continue;
                }
                $field_name = substr($key, 6);
                $label = isset($labels[$form_name][$field_name]) ? $labels[$form_name][$field_name] : $field_name;
                $item_data[] = array('name' => $label, 'value' => isset($values[0]) ? $values[0] : '');
              }
              $data[] = array(
                'group_id' => 'forgewp-submissions',
                'group_label' => __('Form submissions', '${textDomain}'),
                'item_id' => 'forgewp-submission-' . (int) $submission_id,
                'data' => $item_data,
              );
            }
            return array(
              'data' => $data,
              'done' => count($ids) < 100,
            );
          }
        }

        if (!function_exists('forgewp_forms_privacy_erase')) {
          function forgewp_forms_privacy_erase($email_address) {
            $removed = 0;
            do {
              $ids = forgewp_forms_privacy_submission_ids($email_address, 1);
              $batch_removed = 0;
              foreach ($ids as $submission_id) {
                if (wp_delete_post($submission_id, true)) {
                  $batch_removed++;
                  $removed++;
                }
              }
            } while (count($ids) === 100 && $batch_removed > 0);
            return array(
              'items_removed' => $removed > 0,
              'items_retained' => false,
              'messages' => array(),
              'done' => true,
            );
          }
        }

        add_filter('wp_privacy_personal_data_exporters', function ($exporters) {
          $exporters['forgewp-form-submissions'] = array(
            'exporter_friendly_name' => __('ForgeWP form submissions', '${textDomain}'),
            'callback' => 'forgewp_forms_privacy_export',
          );
          return $exporters;
        });
        add_filter('wp_privacy_personal_data_erasers', function ($erasers) {
          $erasers['forgewp-form-submissions'] = array(
            'eraser_friendly_name' => __('ForgeWP form submissions', '${textDomain}'),
            'callback' => 'forgewp_forms_privacy_erase',
          );
          return $erasers;
        });
        `
            : ''
        }
        ${retentionPhp}
        `;
}

function buildFormHandlerPhp(name, formConfig, textDomain, locales) {
  const slug = safeFormSlug(name);
  const isMultilingual = locales.length > 1;
  const devFieldsPhp = devFieldsPhpArray(formConfig.fields, textDomain);
  const rawSeed = formConfig.clientFields?.enabled
    ? formConfig.clientFields.seed
    : [];
  const seedPhp = isMultilingual
    ? seedByLocalePhpArray(rawSeed, locales)
    : seedFieldsPhpArray(rawSeed);
  const storeSubmissions = formConfig.storeSubmissions !== false;

  let mailToPhp;
  if (formConfig.mailTo === 'admin') {
    mailToPhp = `get_option('admin_email')`;
  } else if (
    typeof formConfig.mailTo === 'string' &&
    formConfig.mailTo.startsWith('option:')
  ) {
    mailToPhp = `get_option(${phpString(formConfig.mailTo.slice('option:'.length))})`;
  } else {
    mailToPhp = phpString(formConfig.mailTo || 'admin_email');
  }

  const subjectTemplate = formConfig.subject || `New submission — ${name}`;
  const subjectPhp = templateToPhpExpression(subjectTemplate);
  const confirmationPhp = formConfig.confirmation?.enabled
    ? `
        $confirmation_to = $values[${phpString(formConfig.confirmation.emailField)}];
        $confirmation_subject = forgewp_forms_strip_header_injection(${templateToPhpExpression(formConfig.confirmation.subject)});
        $confirmation_body = ${templateToPhpExpression(formConfig.confirmation.body)};
        if (is_email($confirmation_to)) {
            $confirmation_sent = wp_mail($confirmation_to, $confirmation_subject, $confirmation_body, array());
            if (!$confirmation_sent) {
                error_log('[ForgeWP Forms] Submitter confirmation email failed (form: ${name}).');
            }
        }
`
    : '';

  const emailFieldName = Object.entries(formConfig.fields || {}).find(
    ([, f]) => f.type === 'email',
  )?.[0];

  return `
if (!function_exists('forgewp_handle_form_${slug}')) {
    function forgewp_handle_form_${slug}(WP_REST_Request $request) {
        if (!forgewp_forms_rate_limit_ok()) {
            return new WP_REST_Response(array(
                'ok'      => false,
                'message' => __('Too many submissions. Please try again later.', '${textDomain}'),
            ), 429);
        }

        if (is_user_logged_in()) {
            $nonce = $request->get_header('X-WP-Nonce');
            if (!$nonce || !wp_verify_nonce($nonce, 'wp_rest')) {
                return new WP_REST_Response(array(
                    'ok'      => false,
                    'message' => __('Security check failed. Please refresh and try again.', '${textDomain}'),
                ), 403);
            }
        }

        $params = $request->get_params();

        // Honeypot + time-trap: fail silently with an ok-shaped response so
        // spam bots never learn their submission was rejected.
        if (!empty($params['_forgewp_hp'])) {
            return new WP_REST_Response(array('ok' => true, 'message' => __('Thank you.', '${textDomain}')), 200);
        }
        $elapsed = isset($params['_forgewp_elapsed']) ? (int) $params['_forgewp_elapsed'] : 0;
        if ($elapsed < 3000) {
            return new WP_REST_Response(array('ok' => true, 'message' => __('Thank you.', '${textDomain}')), 200);
        }

        $dev_fields = ${devFieldsPhp};
        $seed_fields = ${seedPhp};
        $submitted_lang = isset($params['lang']) ? sanitize_key($params['lang']) : null;
        $client_fields = forgewp_forms_get_client_fields('${name}', $seed_fields, $submitted_lang);
        $field_defs = array_merge($dev_fields, is_array($client_fields) ? $client_fields : array());

        $result = forgewp_forms_validate_and_sanitize($params, $field_defs);
        if (!empty($result['errors'])) {
            return new WP_REST_Response(array(
                'ok'      => false,
                'errors'  => $result['errors'],
                'message' => __('Please correct the errors below.', '${textDomain}'),
            ), 400);
        }
        $values = $result['values'];

        $stored = false;
${storeSubmissions ? `        $stored = forgewp_store_submission('${name}', $values, $field_defs, forgewp_forms_resolve_lang($submitted_lang));\n` : ''}
        $to = ${mailToPhp};
        $subject = ${subjectPhp || `'New submission'`};
        $subject = forgewp_forms_strip_header_injection($subject);

        $body_lines = array();
        foreach ($field_defs as $field_def) {
            $fname = $field_def['name'];
            if (!isset($values[$fname]) || $values[$fname] === '') {
                continue;
            }
            $body_lines[] = $field_def['label'] . ': ' . $values[$fname];
        }
        $body = implode("\\n", $body_lines);

        $headers = array();
${emailFieldName ? `        if (!empty($values[${phpString(emailFieldName)}])) {\n            $headers[] = 'Reply-To: ' . forgewp_forms_strip_header_injection($values[${phpString(emailFieldName)}]);\n        }\n` : ''}
        $mail_sent = wp_mail($to, $subject, $body, $headers);
      ${confirmationPhp}

        if (!$mail_sent && !$stored) {
            return new WP_REST_Response(array(
                'ok'      => false,
                'message' => __('Something went wrong. Please try again later.', '${textDomain}'),
            ), 500);
        }

        if (!$mail_sent && $stored) {
            error_log('[ForgeWP Forms] Submission was stored but its notification email failed (form: ${name}, submission: ' . (int) $stored . ').');
            return new WP_REST_Response(array(
                'ok'      => true,
                'message' => __('Your submission was received.', '${textDomain}'),
            ), 200);
        }

${
  storeSubmissions
    ? `        if ($mail_sent && !$stored) {
            error_log('[ForgeWP Forms] Notification email was sent but the submission could not be stored (form: ${name}).');
        }

`
    : ''
}

        return new WP_REST_Response(array(
            'ok'      => true,
          'message' => __('Your submission was received.', '${textDomain}'),
        ), 200);
    }
}

if (!function_exists('forgewp_seed_form_fields_${slug}')) {
    function forgewp_seed_form_fields_${slug}() {
        $option_name = 'forgewp_form_fields_${name}';
        if (get_option($option_name, null) === null) {
            update_option($option_name, ${seedPhp});
        }
    }
    // after_switch_theme only fires on activation — it never re-runs when an
    // already-active theme's files are simply redeployed (e.g. a file sync
    // to a live site), so the seed would silently never apply there. init
    // is a cheap self-healing fallback: get_option() is cached, and the
    // is-null guard above means it only ever writes once regardless of how
    // many times either hook fires.
    add_action('after_switch_theme', 'forgewp_seed_form_fields_${slug}');
    add_action('init', 'forgewp_seed_form_fields_${slug}');
}
`;
}

/**
 * Admin "Forms" page: one field-editor table per form with clientFields
 * enabled. Add/remove/move-up/move-down rows via inline vanilla JS,
 * serialized to a hidden JSON field on submit. No drag-and-drop library —
 * keeps this self-contained and keyboard-accessible. When the theme has
 * more than one configured locale, each form gets a language-tab switcher
 * and edits/saves one language's field set at a time.
 */
function buildFormsAdminPagePhp(forms, textDomain, locales, adminCapability) {
  const editableForms = Object.entries(forms).filter(
    ([, f]) => f.clientFields?.enabled,
  );
  if (editableForms.length === 0) return '';

  const isMultilingual = locales.length > 1;
  const nonceAction = 'forgewp_forms_admin_save';
  const pageSlug = 'forgewp-forms';

  const formSectionsPhp = editableForms
    .map(([name, formConfig]) => {
      const rawSeed = formConfig.clientFields?.enabled
        ? formConfig.clientFields.seed
        : [];
      const seedPhp = isMultilingual
        ? seedByLocalePhpArray(rawSeed, locales)
        : seedFieldsPhpArray(rawSeed);
      // Must go through forgewp_forms_get_client_fields (not a raw get_option)
      // so the admin table always shows at least the seed data even if the
      // option row hasn't been written yet for any reason — the same
      // fallback the REST handler and hydration payload already rely on.
      const initialJsonPhp = isMultilingual
        ? `<?php
        $forgewp_seed_${safeFormSlug(name)} = ${seedPhp};
        $forgewp_initial_${safeFormSlug(name)} = array();
        foreach (array(${locales.map((l) => phpString(l)).join(', ')}) as $forgewp_lang) {
            $forgewp_initial_${safeFormSlug(name)}[$forgewp_lang] = forgewp_forms_get_client_fields( '${name}', $forgewp_seed_${safeFormSlug(name)}, $forgewp_lang );
        }
        echo esc_attr( wp_json_encode( $forgewp_initial_${safeFormSlug(name)} ) );
        ?>`
        : `<?php echo esc_attr( wp_json_encode( forgewp_forms_get_client_fields( '${name}', ${seedPhp} ) ) ); ?>`;

      const langTabsPhp = isMultilingual
        ? `
            <div class="forgewp-forms-lang-tabs" style="margin-bottom:10px">
${locales.map((l, i) => `                <button type="button" class="button forgewp-lang-tab${i === 0 ? ' active' : ''}" data-lang="${l}" aria-pressed="${i === 0 ? 'true' : 'false'}">${l.toUpperCase()}</button>`).join('\n')}
            </div>`
        : '';

      const developerFields = Object.entries(formConfig.fields || {})
        .map(([fieldName, field]) => {
          const label = field.label || fieldName.replace(/[_-]/g, ' ');
          const fieldType = field.type || 'text';
          const requiredLabel = field.required ? 'Required' : 'Optional';
          return `                <li class="forgewp-dev-field"><span><strong><?php echo esc_html( ${phpString(label)} ); ?></strong><code><?php echo esc_html( ${phpString(fieldName)} ); ?></code></span><span class="forgewp-dev-field-meta"><?php echo esc_html( ${phpString(fieldType)} ); ?> · <?php echo esc_html( ${phpString(requiredLabel)} ); ?></span></li>`;
        })
        .join('\n');
      const storageStatus =
        formConfig.storeSubmissions === false
          ? `<?php esc_html_e( 'Email delivery only', '${textDomain}' ); ?>`
          : `<?php esc_html_e( 'Submissions saved in WordPress', '${textDomain}' ); ?>`;

      return `
        <section class="forgewp-form-panel" aria-labelledby="forgewp-form-title-${name}">
          <header class="forgewp-form-panel-header">
            <div>
              <p class="forgewp-form-eyebrow"><?php esc_html_e( 'Native form', '${textDomain}' ); ?></p>
              <h2 id="forgewp-form-title-${name}">${name.replace(/</g, '&lt;')}</h2>
            </div>
            <span class="forgewp-form-storage-status">${storageStatus}</span>
          </header>
          <details class="forgewp-dev-fields">
            <summary><?php esc_html_e( 'Developer-owned fields', '${textDomain}' ); ?> <span><?php echo (int) ${Object.keys(formConfig.fields || {}).length}; ?> · <?php esc_html_e( 'read-only', '${textDomain}' ); ?></span></summary>
            <ul>${developerFields}</ul>
          </details>
          <div class="forgewp-forms-editor" data-form="${name}" data-multilingual="${isMultilingual ? 'true' : 'false'}" data-initial="${initialJsonPhp}">
            <div class="forgewp-client-fields-heading">
              <div>
                <h3><?php esc_html_e( 'Client-managed fields', '${textDomain}' ); ?></h3>
                <p><?php esc_html_e( 'These labels, types, and options can be changed without editing the theme code.', '${textDomain}' ); ?></p>
              </div>
              ${langTabsPhp}
            </div>
            <div class="forgewp-forms-rows" role="list" aria-label="<?php esc_attr_e( 'Client-managed form fields', '${textDomain}' ); ?>"></div>
            <div class="forgewp-form-actions">
              <button type="button" class="button forgewp-forms-add-row"><?php esc_html_e( 'Add field', '${textDomain}' ); ?></button>
              <button type="button" class="button button-primary forgewp-forms-save"><?php esc_html_e( 'Save changes', '${textDomain}' ); ?></button>
            </div>
            <div class="forgewp-forms-notice" style="display:none"></div>
          </div>
        </section>
`;
    })
    .join('\n');

  return `
if (!function_exists('forgewp_forms_admin_menu')) {
    function forgewp_forms_admin_menu() {
        add_menu_page(
            __('Forms', '${textDomain}'),
            __('Forms', '${textDomain}'),
            ${phpString(adminCapability)},
            '${pageSlug}',
            'forgewp_render_forms_admin_page',
            'dashicons-feedback',
            30
        );
    }
    add_action('admin_menu', 'forgewp_forms_admin_menu');
}

if (!function_exists('forgewp_forms_valid_field_shape')) {
    function forgewp_forms_valid_field_shape($field, $existing_names) {
        $valid_types = array('text', 'email', 'tel', 'number', 'textarea', 'select', 'checkbox');
        if (!is_array($field) || empty($field['label']) || !isset($field['type']) || !in_array($field['type'], $valid_types, true)) {
            return false;
        }
        if (isset($field['name']) && in_array($field['name'], $existing_names, true)) {
            // Name collides with a dev-owned field — reject.
            return false;
        }
        return true;
    }
}

if (!function_exists('forgewp_forms_admin_save_handler')) {
    function forgewp_forms_admin_save_handler() {
        if (!current_user_can(${phpString(adminCapability)})) {
            wp_send_json_error(__('Unauthorized', '${textDomain}'), 403);
        }
        check_ajax_referer('${nonceAction}', 'nonce');

        $form_name = isset($_POST['form']) ? sanitize_key($_POST['form']) : '';
        $known_forms = array(${editableForms.map(([n]) => phpString(n)).join(', ')});
        if (!in_array($form_name, $known_forms, true)) {
            wp_send_json_error(__('Unknown form.', '${textDomain}'), 400);
        }

        $lang = isset($_POST['lang']) ? sanitize_key($_POST['lang']) : null;
        $known_langs = array(${locales.map((l) => phpString(l)).join(', ')});
        $is_multilingual = ${isMultilingual ? 'true' : 'false'};
        if ($is_multilingual && !in_array($lang, $known_langs, true)) {
            wp_send_json_error(__('Unknown language.', '${textDomain}'), 400);
        }

        $raw = isset($_POST['fields']) ? wp_unslash($_POST['fields']) : '';
        $decoded = json_decode($raw, true);
        if (!is_array($decoded)) {
            wp_send_json_error(__('Invalid field data.', '${textDomain}'), 400);
        }

        $dev_field_names = apply_filters('forgewp_form_dev_field_names_' . $form_name, array());

        $clean = array();
        $used_names = array();
        // Names dropped for colliding with a dev-owned field or an earlier
        // field in this same save — reported back to the admin UI instead
        // of failing silently, so a site owner isn't left wondering why the
        // field they just added never showed up after saving.
        $skipped_names = array();
        foreach ($decoded as $field) {
            if (!forgewp_forms_valid_field_shape($field, $dev_field_names)) {
                if (!empty($field['name'])) {
                    $skipped_names[] = sanitize_key($field['name']);
                }
                continue;
            }
            $name = isset($field['name']) && $field['name'] !== ''
                ? sanitize_key($field['name'])
                : sanitize_key($field['label']) . '_' . substr(md5($field['label'] . microtime()), 0, 6);
            if (in_array($name, $used_names, true) || in_array($name, $dev_field_names, true)) {
                $skipped_names[] = $name;
                continue;
            }
            $used_names[] = $name;

            $options = array();
            if ($field['type'] === 'select' && !empty($field['options']) && is_array($field['options'])) {
                $options = array_values(array_filter(array_map(function ($o) {
                    return sanitize_text_field(trim((string) $o));
                }, $field['options'])));
            }

            $clean[] = array(
                'name'        => $name,
                'label'       => sanitize_text_field($field['label']),
                'type'        => $field['type'],
                'required'    => !empty($field['required']),
                'maxLength'   => $field['type'] === 'textarea' ? 5000 : 200,
                'options'     => $options,
                'placeholder' => isset($field['placeholder']) ? sanitize_text_field($field['placeholder']) : '',
            );
        }

        $option_name = 'forgewp_form_fields_' . $form_name;
        if ($is_multilingual && !empty($lang)) {
            $stored = get_option($option_name, array());
            $stored_is_legacy_flat = is_array($stored) && isset($stored[0]) && is_array($stored[0]) && isset($stored[0]['name']);
            if (!is_array($stored) || $stored_is_legacy_flat) {
                // First per-language save — this language becomes
                // authoritative going forward; other languages keep
                // falling back to their seed until they're saved too.
                $stored = array();
            }
            $stored[$lang] = $clean;
            update_option($option_name, $stored);
        } else {
            update_option($option_name, $clean);
        }

        wp_send_json_success(array(
            'fields'  => $clean,
            'skipped' => array_values(array_unique($skipped_names)),
        ));
    }
    add_action('wp_ajax_forgewp_forms_admin_save', 'forgewp_forms_admin_save_handler');
}

if (!function_exists('forgewp_render_forms_admin_page')) {
    function forgewp_render_forms_admin_page() {
        if (!current_user_can(${phpString(adminCapability)})) {
            wp_die(__('You do not have permission to access this page.', '${textDomain}'));
        }
        $nonce = wp_create_nonce('${nonceAction}');
        $ajax_url = admin_url('admin-ajax.php');
        ?>
        <div class="wrap">
            <h1><?php esc_html_e('Forms', '${textDomain}'); ?></h1>
            <p><?php esc_html_e('Add, remove, reorder, and configure the client-managed fields for each form below. Fields built directly into the theme are not shown here and cannot be changed.', '${textDomain}'); ?></p>
${formSectionsPhp}
        </div>
        <style>
            .forgewp-forms-lang-tabs .button.active { background: #2271b1; border-color: #2271b1; color: #fff; }
            .forgewp-form-panel { max-width: 1100px; margin: 20px 0 28px; border: 1px solid #c3c4c7; background: #fff; box-shadow: 0 1px 2px rgba(0,0,0,.04); }
            .forgewp-form-panel-header { display:flex; align-items:center; justify-content:space-between; gap:16px; padding:20px 24px; border-bottom:1px solid #dcdcde; }
            .forgewp-form-panel-header h2 { margin:4px 0 0; font-size:20px; }
            .forgewp-form-eyebrow { margin:0; color:#646970; font-size:11px; font-weight:600; letter-spacing:.06em; text-transform:uppercase; }
            .forgewp-form-storage-status { display:inline-flex; align-items:center; min-height:30px; padding:0 10px; border-radius:16px; background:#edfaef; color:#176b2c; font-size:12px; font-weight:600; }
            .forgewp-dev-fields { padding:14px 24px; border-bottom:1px solid #dcdcde; background:#f6f7f7; }
            .forgewp-dev-fields summary { cursor:pointer; font-weight:600; }
            .forgewp-dev-fields summary span { margin-left:8px; color:#646970; font-size:12px; font-weight:400; }
            .forgewp-dev-fields ul { display:grid; gap:8px; margin:14px 0 0; }
            .forgewp-dev-field { display:flex; flex-wrap:wrap; justify-content:space-between; gap:8px 16px; padding:8px 10px; border:1px solid #dcdcde; background:#fff; }
            .forgewp-dev-field code { margin-left:8px; color:#646970; }
            .forgewp-dev-field-meta { color:#646970; font-size:12px; }
            .forgewp-forms-editor { padding:20px 24px 24px; }
            .forgewp-client-fields-heading { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; margin-bottom:16px; }
            .forgewp-client-fields-heading h3 { margin:0; font-size:15px; }
            .forgewp-client-fields-heading p { margin:4px 0 0; color:#646970; }
            .forgewp-forms-rows { display:grid; gap:12px; }
            .forgewp-forms-row { min-width:0; margin:0; padding:16px; border:1px solid #dcdcde; border-radius:4px; background:#fff; }
            .forgewp-forms-row legend { padding:0 6px; font-size:14px; font-weight:600; }
            .forgewp-forms-row-grid { display:grid; grid-template-columns:minmax(180px, 2fr) minmax(140px, 1fr); gap:12px; }
            .forgewp-field-control { display:grid; align-content:start; gap:5px; min-width:0; color:#50575e; font-size:12px; font-weight:600; }
            .forgewp-field-control input, .forgewp-field-control select { max-width:100%; }
            .forgewp-field-machine-name { margin-top:8px; color:#646970; font-size:12px; }
            .forgewp-field-machine-name code { user-select:all; }
            .forgewp-field-required-control { display:inline-flex; align-items:center; gap:8px; min-height:30px; color:#50575e; font-size:12px; font-weight:600; }
            .forgewp-field-actions, .forgewp-form-actions { display:flex; flex-wrap:wrap; align-items:center; gap:8px; margin-top:14px; }
            .forgewp-field-error { margin:8px 0 0; color:#b32d2e; }
            .forgewp-forms-notice { max-width:100%; }
            .forgewp-field-options-chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 6px; min-height: 22px; }
            .forgewp-field-option-chip { display: inline-flex; align-items: center; gap: 4px; background: #f0f0f1; border: 1px solid #dcdcde; border-radius: 4px; padding: 3px 4px 3px 10px; font-size: 12px; line-height: 1.4; }
            .forgewp-field-option-chip button { border: none; background: none; cursor: pointer; font-size: 14px; line-height: 1; color: #787c82; padding: 2px 4px; }
            .forgewp-field-option-chip button:hover { color: #b32d2e; }
            .forgewp-field-options-add { display: flex; gap: 6px; }
            .forgewp-field-options-add input { flex: 1; min-width: 0; }
            @media (max-width: 782px) { .forgewp-forms-row-grid { grid-template-columns:minmax(0, 1fr); } .forgewp-forms-row { padding:12px; } .forgewp-form-panel-header, .forgewp-client-fields-heading { flex-direction:column; } .forgewp-forms-editor, .forgewp-form-panel-header, .forgewp-dev-fields { padding-left:14px; padding-right:14px; } }
        </style>
        <script>
        (function () {
            var AJAX_URL = <?php echo wp_json_encode( $ajax_url ); ?>;
            var NONCE = <?php echo wp_json_encode( $nonce ); ?>;
            var exportFormSelect = document.getElementById('forgewp-export-form');
            if (exportFormSelect) {
              var exportFieldGroups = document.querySelectorAll('.forgewp-export-form-fields');
              function updateExportFieldGroups() {
                exportFieldGroups.forEach(function (group) {
                  var hidden = exportFormSelect.value !== 'all' && group.dataset.exportForm !== exportFormSelect.value;
                  group.hidden = hidden;
                  if (hidden) {
                    group.querySelectorAll('input[type="checkbox"]').forEach(function (checkbox) {
                      checkbox.checked = false;
                    });
                  }
                });
              }
              exportFormSelect.addEventListener('change', updateExportFieldGroups);
              updateExportFieldGroups();
            }
            var TYPE_LABELS = { text: 'Text', email: 'Email', tel: 'Phone', number: 'Number', textarea: 'Textarea', select: 'Select', checkbox: 'Checkbox' };
            var TYPES = ['text', 'email', 'tel', 'number', 'textarea', 'select', 'checkbox'];

            function el(tag, attrs, children) {
                var node = document.createElement(tag);
                attrs = attrs || {};
                for (var key in attrs) {
                    if (key === 'class') { node.className = attrs[key]; }
                    else { node.setAttribute(key, attrs[key]); }
                }
                (children || []).forEach(function (child) {
                    node.appendChild(typeof child === 'string' ? document.createTextNode(child) : child);
                });
                return node;
            }

            function buildOptionsEditor(initialOptions) {
                var container = el('div', { 'class': 'forgewp-field-options' });
                var chips = el('div', { 'class': 'forgewp-field-options-chips' });
                var options = (initialOptions || []).slice();

                function renderChips() {
                    chips.innerHTML = '';
                    options.forEach(function (opt, idx) {
                        var removeBtn = el('button', { type: 'button', title: 'Remove option', 'aria-label': 'Remove option ' + opt }, ['\\u2715']);
                        removeBtn.addEventListener('click', function () {
                            options.splice(idx, 1);
                            renderChips();
                        });
                        var chip = el('span', { 'class': 'forgewp-field-option-chip' }, [opt, removeBtn]);
                        chips.appendChild(chip);
                    });
                }
                renderChips();

                var addInput = el('input', { type: 'text', placeholder: 'Add option\\u2026' });
                var addBtn = el('button', { type: 'button', 'class': 'button' }, ['Add']);
                function commitAdd() {
                    var val = addInput.value.trim();
                    if (val && options.indexOf(val) === -1) {
                        options.push(val);
                        addInput.value = '';
                        renderChips();
                    }
                }
                addBtn.addEventListener('click', commitAdd);
                addInput.addEventListener('keydown', function (e) {
                    if (e.key === 'Enter') { e.preventDefault(); commitAdd(); }
                });

                container.appendChild(chips);
                container.appendChild(el('div', { 'class': 'forgewp-field-options-add' }, [addInput, addBtn]));
                container.getOptions = function () { return options.slice(); };
                return container;
            }

            function buildRow(field) {
                field = field || { name: '', label: '', type: 'text', required: false, placeholder: '', options: [] };
              var card = el('fieldset', { 'class': 'forgewp-forms-row', role: 'listitem' });
              card.dataset.name = field.name || '';
              var legend = el('legend', {}, [field.label || 'New field']);
              card.appendChild(legend);

              function control(label, input, className) {
                return el('label', { 'class': 'forgewp-field-control ' + (className || '') }, [
                  el('span', {}, [label]),
                  input,
                ]);
              }

              function controlGroup(label, content, className) {
                return el('div', { 'class': 'forgewp-field-control ' + (className || '') }, [
                  el('span', {}, [label]),
                  content,
                ]);
              }

              var labelInput = el('input', { type: 'text', value: field.label || '', 'class': 'regular-text forgewp-field-label', 'aria-label': 'Field label' });
              labelInput.addEventListener('input', function () {
                legend.textContent = labelInput.value || 'New field';
              });

                var typeSelect = el('select', { 'class': 'forgewp-field-type' });
                TYPES.forEach(function (t) {
                    var opt = el('option', { value: t }, [TYPE_LABELS[t]]);
                    if (t === field.type) { opt.selected = true; }
                    typeSelect.appendChild(opt);
                });

                var requiredCheckbox = el('input', { type: 'checkbox', 'class': 'forgewp-field-required' });
                if (field.required) { requiredCheckbox.checked = true; }

                var placeholderInput = el('input', { type: 'text', value: field.placeholder || '', 'class': 'regular-text forgewp-field-placeholder' });

                var optionsEditor = buildOptionsEditor(field.options);
                optionsEditor.style.display = field.type === 'select' ? '' : 'none';

              card.appendChild(el('div', { 'class': 'forgewp-forms-row-grid' }, [
                control('Label', labelInput),
                control('Field type', typeSelect),
                el('label', { 'class': 'forgewp-field-required-control' }, [requiredCheckbox, 'Required']),
                control('Placeholder', placeholderInput),
                    controlGroup('Select options', optionsEditor, 'forgewp-field-options-control'),
              ]));
              card.appendChild(el('div', { 'class': 'forgewp-field-machine-name' }, [
                'Field key: ',
                el('code', {}, [field.name || 'Assigned on first save']),
              ]));

                typeSelect.addEventListener('change', function () {
                    optionsEditor.style.display = typeSelect.value === 'select' ? '' : 'none';
                });

              var upBtn = el('button', { type: 'button', 'class': 'button', 'aria-label': 'Move field up' }, ['Move up']);
              var downBtn = el('button', { type: 'button', 'class': 'button', 'aria-label': 'Move field down' }, ['Move down']);
              var removeBtn = el('button', { type: 'button', 'class': 'button-link-delete', 'aria-label': 'Remove field' }, ['Remove']);
                upBtn.addEventListener('click', function () {
                var prev = card.previousElementSibling;
                if (prev) { card.parentNode.insertBefore(card, prev); }
                });
                downBtn.addEventListener('click', function () {
                var next = card.nextElementSibling;
                if (next) { card.parentNode.insertBefore(next, card); }
                });
              removeBtn.addEventListener('click', function () { card.remove(); });
              card.appendChild(el('div', { 'class': 'forgewp-field-actions' }, [upBtn, downBtn, removeBtn]));

              var error = el('p', { 'class': 'forgewp-field-error', role: 'alert' });
              error.hidden = true;
              card.appendChild(error);

              return card;
            }

            function readRow(row) {
                var optionsEditorEl = row.querySelector('.forgewp-field-options');
                return {
                    name: row.dataset.name || '',
                    label: row.querySelector('.forgewp-field-label').value,
                    type: row.querySelector('.forgewp-field-type').value,
                    required: row.querySelector('.forgewp-field-required').checked,
                    placeholder: row.querySelector('.forgewp-field-placeholder').value,
                    options: (optionsEditorEl && optionsEditorEl.getOptions) ? optionsEditorEl.getOptions() : [],
                };
            }

            function showNotice(editorEl, success, message) {
                var noticeEl = editorEl.querySelector('.forgewp-forms-notice');
                noticeEl.innerHTML = '';
                noticeEl.className = 'forgewp-forms-notice notice ' + (success ? 'notice-success' : 'notice-error') + ' is-dismissible';
                noticeEl.style.display = 'block';
                noticeEl.style.marginTop = '12px';
                noticeEl.setAttribute('role', success ? 'status' : 'alert');
                noticeEl.setAttribute('aria-live', success ? 'polite' : 'assertive');

                var p = document.createElement('p');
                p.textContent = (success ? '\\u2713 ' : '\\u26a0 ') + message;
                noticeEl.appendChild(p);

                var dismissBtn = document.createElement('button');
                dismissBtn.type = 'button';
                dismissBtn.className = 'notice-dismiss';
                var srSpan = document.createElement('span');
                srSpan.className = 'screen-reader-text';
                srSpan.textContent = 'Dismiss this notice.';
                dismissBtn.appendChild(srSpan);
                dismissBtn.addEventListener('click', function () {
                    noticeEl.style.display = 'none';
                });
                noticeEl.appendChild(dismissBtn);
            }

            var editors = document.querySelectorAll('.forgewp-forms-editor');
            editors.forEach(function (editorEl) {
                var isMultilingual = editorEl.dataset.multilingual === 'true';
                var tbody = editorEl.querySelector('.forgewp-forms-rows');
                var raw = {};
                try { raw = JSON.parse(editorEl.dataset.initial || (isMultilingual ? '{}' : '[]')); } catch (e) { raw = isMultilingual ? {} : []; }

                var dataByLang = isMultilingual ? raw : { '_': Array.isArray(raw) ? raw : [] };
                var currentLang = '_';
                if (isMultilingual) {
                    var activeTab = editorEl.querySelector('.forgewp-lang-tab.active');
                    currentLang = activeTab ? activeTab.dataset.lang : Object.keys(dataByLang)[0];
                }

                function renderLang(lang) {
                    tbody.innerHTML = '';
                    (dataByLang[lang] || []).forEach(function (field) { tbody.appendChild(buildRow(field)); });
                }

                function captureCurrentRows() {
                    var fields = [];
                    tbody.querySelectorAll('.forgewp-forms-row').forEach(function (row) {
                        fields.push(readRow(row));
                    });
                    return fields;
                }

                renderLang(currentLang);

                if (isMultilingual) {
                    editorEl.querySelectorAll('.forgewp-lang-tab').forEach(function (tabBtn) {
                        tabBtn.addEventListener('click', function () {
                            if (tabBtn.dataset.lang === currentLang) { return; }
                            dataByLang[currentLang] = captureCurrentRows();
                            editorEl.querySelectorAll('.forgewp-lang-tab').forEach(function (b) {
                                b.classList.remove('active');
                                b.setAttribute('aria-pressed', 'false');
                            });
                            tabBtn.classList.add('active');
                            tabBtn.setAttribute('aria-pressed', 'true');
                            currentLang = tabBtn.dataset.lang;
                            renderLang(currentLang);
                        });
                    });
                }

                editorEl.querySelector('.forgewp-forms-add-row').addEventListener('click', function () {
                    tbody.appendChild(buildRow(null));
                });

                var saveButton = editorEl.querySelector('.forgewp-forms-save');
                saveButton.addEventListener('click', function () {
                    var fields = captureCurrentRows();
                  saveButton.disabled = true;
                  showNotice(editorEl, true, 'Saving…');

                    var body = new URLSearchParams();
                    body.set('action', 'forgewp_forms_admin_save');
                    body.set('nonce', NONCE);
                    body.set('form', editorEl.dataset.form);
                    body.set('fields', JSON.stringify(fields));
                    if (isMultilingual) { body.set('lang', currentLang); }

                    fetch(AJAX_URL, { method: 'POST', body: body })
                        .then(function (res) { return res.json(); })
                        .then(function (data) {
                            if (data.success) {
                                var payload = data.data || {};
                                var savedFields = Array.isArray(payload.fields) ? payload.fields : (Array.isArray(payload) ? payload : []);
                                var skipped = Array.isArray(payload.skipped) ? payload.skipped : [];
                                var count = savedFields.length;
                                var langNote = isMultilingual ? ' (' + currentLang.toUpperCase() + ')' : '';
                                var msg = 'Saved' + langNote + ' \\u2014 ' + count + ' field' + (count === 1 ? '' : 's') + ' updated.';
                                var skippedNames = new Set(skipped);
                                tbody.querySelectorAll('.forgewp-forms-row').forEach(function (row) {
                                  var fieldError = row.querySelector('.forgewp-field-error');
                                  if (fieldError && skippedNames.has(row.dataset.name || '')) {
                                    fieldError.textContent = 'This field key conflicts with a developer-owned or duplicate field and was not saved.';
                                    fieldError.hidden = false;
                                  } else if (fieldError) {
                                    fieldError.hidden = true;
                                  }
                                });
                                if (skipped.length > 0) {
                                    msg += ' ' + skipped.length + ' field' + (skipped.length === 1 ? '' : 's') + ' could not be saved (name already in use): ' + skipped.join(', ') + '.';
                                } else {
                                  dataByLang[currentLang] = savedFields;
                                  renderLang(currentLang);
                                }
                                showNotice(editorEl, skipped.length === 0, msg);
                            } else {
                                var errMsg = (data.data && typeof data.data === 'string') ? data.data : 'Could not save. Please check your changes and try again.';
                                showNotice(editorEl, false, errMsg);
                            }
                        })
                        .catch(function () {
                            showNotice(editorEl, false, 'Could not save \\u2014 check your connection and try again.');
                        })
                        .finally(function () {
                          saveButton.disabled = false;
                        });
                });
            });
        })();
        </script>
        <?php
    }
}
`;
}

/**
 * Emits the hydration payload helper used by hydration-enqueuer.js.
 * Returns per-form CLIENT-owned field descriptors only (never mailTo or
 * other server-only config), resolved for the CURRENT request's language
 * when the theme is multilingual.
 */
function buildFormsHydrationPayloadPhp(forms, locales) {
  const isMultilingual = locales.length > 1;
  const entries = Object.entries(forms)
    .map(([name, formConfig]) => {
      const rawSeed = formConfig.clientFields?.enabled
        ? formConfig.clientFields.seed
        : [];
      const seedPhp = isMultilingual
        ? seedByLocalePhpArray(rawSeed, locales)
        : seedFieldsPhpArray(rawSeed);
      const langArg = isMultilingual ? ', $forgewp_forms_current_lang' : '';
      return `        $payload[${phpString(name)}] = array('fields' => forgewp_forms_get_client_fields(${phpString(name)}, ${seedPhp}${langArg}));`;
    })
    .join('\n');

  const langResolutionPhp = isMultilingual
    ? `        $forgewp_forms_current_lang = forgewp_forms_resolve_lang();\n`
    : '';

  return `
if (!function_exists('forgewp_forms_hydration_payload')) {
    function forgewp_forms_hydration_payload() {
        $payload = array();
${langResolutionPhp}${entries}
        return $payload;
    }
}
`;
}

export function buildFormsPhp(config) {
  const forms = config.forms;
  if (!forms || Object.keys(forms).length === 0) return '';

  validateFormsConfig(forms);

  const textDomain = config.textDomain || 'forgewp';
  const locales =
    Array.isArray(config.i18n?.locales) && config.i18n.locales.length > 0
      ? config.i18n.locales
      : ['default'];
  // Shortcode-mode forms are a pure escape hatch — the developer renders
  // <WpShortcode> directly and the plugin (CF7/WPForms/…) owns everything.
  // ForgeWP generates no endpoint, no admin section, no storage for them.
  const nativeFormNames = Object.keys(forms).filter(
    (n) => !isShortcodeModeForm(forms[n]),
  );

  if (nativeFormNames.length === 0) return '';

  const adminCapability = config.formsAdminCapability ?? 'manage_options';
  if (
    typeof adminCapability !== 'string' ||
    !/^[A-Za-z][A-Za-z0-9_]*$/.test(adminCapability)
  ) {
    throw new Error(
      `[ForgeWP Forms] Invalid formsAdminCapability "${String(adminCapability)}". ` +
        `Provide a non-empty WordPress capability name such as "manage_options" or "edit_pages".`,
    );
  }

  const anyStoreSubmissions = nativeFormNames.some(
    (n) => forms[n].storeSubmissions !== false,
  );

  let php = `
/**
 * ── ForgeWP Native Forms ─────────────────────────────────────────────────
 * Generated from the \`forms\` key in wp.config.ts. See forgewp_forms_spec.md.
 */
`;

  php += buildSharedHelpersPhp(config.i18n?.defaultLocale);

  if (anyStoreSubmissions) {
    const storingFormNames = nativeFormNames.filter(
      (n) => forms[n].storeSubmissions !== false,
    );
    php += buildSubmissionCptPhp(textDomain, storingFormNames, adminCapability);
    const storingForms = Object.fromEntries(
      storingFormNames.map((name) => [name, forms[name]]),
    );
    php += buildSubmissionToolsPhp(
      storingForms,
      textDomain,
      adminCapability,
      locales,
    );
  }

  php += `
add_action('rest_api_init', function () {
${nativeFormNames
  .map(
    (
      name,
    ) => `    register_rest_route('forgewp/v1', '/forms/${name}/submit', array(
        'methods'             => 'POST',
        'callback'            => 'forgewp_handle_form_${safeFormSlug(name)}',
        'permission_callback' => '__return_true',
    ));`,
  )
  .join('\n')}
});
`;

  for (const name of nativeFormNames) {
    php += buildFormHandlerPhp(name, forms[name], textDomain, locales);

    // Expose this form's dev-owned field names to the admin-save handler's
    // collision check without re-parsing config inside the AJAX callback.
    const devFieldNamesPhp = Object.keys(forms[name].fields || {})
      .map((n) => phpString(n))
      .join(', ');
    php += `
add_filter('forgewp_form_dev_field_names_${name}', function () {
    return array(${devFieldNamesPhp});
});
`;
  }

  const nativeForms = Object.fromEntries(
    nativeFormNames.map((n) => [n, forms[n]]),
  );
  php += buildFormsAdminPagePhp(
    nativeForms,
    textDomain,
    locales,
    adminCapability,
  );
  php += buildFormsHydrationPayloadPhp(nativeForms, locales);

  return php;
}
