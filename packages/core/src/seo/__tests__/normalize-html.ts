/**
 * Normalise rendered HTML for baseline snapshots.
 *
 * - `data-astro-cid-*` scope hashes depend on the component file's path, so
 *   they change when a component moves package. They carry no rendering
 *   meaning and are stripped.
 * - Dev-mode `data-astro-source-file/loc` debug attributes embed absolute machine paths
 *   and source positions; they are stripped for the same reason.
 * - Whitespace is collapsed so indentation changes never fail a snapshot.
 *
 * Duplicated verbatim in packages/easy-web-content-blocks and
 * packages/easy-web-cms-adapters on purpose: packages do not depend on each other.
 */
export function normalizeHtml(html: string): string {
  return html
    .replace(/\sdata-astro-(?:cid-[a-z0-9]+|source-file|source-loc)(?:="[^"]*")?/g, '')
    .replace(/\s+/g, ' ')
    .replace(/>\s+</g, '><')
    .trim();
}
