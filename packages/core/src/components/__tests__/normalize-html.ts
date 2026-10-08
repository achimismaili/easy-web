/**
 * Normalise rendered HTML for baseline snapshots.
 *
 * - `data-astro-cid-*` scope hashes depend on the component file's path, so
 *   they change when a component moves package. They carry no rendering
 *   meaning and are stripped.
 * - Dev-mode `data-astro-source-file/loc` debug attributes embed absolute machine paths
 *   and source positions; they are stripped for the same reason.
 * - Dev-mode hoisted `<script type="module" src="...">` tags point at the
 *   component's absolute file path (machine checkout + package directory).
 *   Only the directory is stripped; the component file name, script index and
 *   query stay, so a script that appears, disappears or moves still fails.
 * - Whitespace is collapsed so indentation changes never fail a snapshot.
 *
 * Duplicated in packages/seo and packages/easy-web-cms-adapters on purpose:
 * those packages do not depend on this one. Their baselines contain no hoisted
 * scripts, so they do not carry the script-path rule.
 */
export function normalizeHtml(html: string): string {
  return html
    .replace(/\sdata-astro-(?:cid-[a-z0-9]+|source-file|source-loc)(?:="[^"]*")?/g, '')
    .replace(/(<script type="module" src=")[^"]*\/([^/"]+\.astro\?astro&type=script)/g, '$1$2')
    .replace(/\s+/g, ' ')
    .replace(/>\s+</g, '><')
    .trim();
}
