export interface WpShortcodeProps {
  code: string;
}

/**
 * WpShortcode — Dev preview placeholder for WordPress shortcodes.
 *
 * In production the ForgeWP compiler replaces this with:
 *   <?php echo do_shortcode('[your-shortcode]'); ?>
 */
export function WpShortcode({ code }: WpShortcodeProps) {
  return (
    <div className="p-4 bg-zinc-100 border-2 border-dashed border-zinc-400 font-mono text-xs text-zinc-600 my-4">
      <span className="font-bold text-zinc-800">WordPress Shortcode Preview:</span>{" "}
      {code}
    </div>
  );
}
