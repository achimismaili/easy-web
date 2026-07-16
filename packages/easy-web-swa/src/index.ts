import type { AstroIntegration } from 'astro';

/**
 * Options for {@link easyWebNotFound}.
 *
 * The final shape is defined in T6 when merge logic lands. This stub only
 * declares fields that the plan already committed to so consumers can compile
 * against the published 0.1.0 skeleton without recompiling on T6 release.
 */
export type Options = {
  /**
   * Absolute or repo-relative path to the sentinel-marked slice this
   * integration will merge into the instance's `staticwebapp.config.json`.
   *
   * NOTE: unused in 0.1.0 — merge logic ships in T6.
   */
  slicePath?: string;
};

/**
 * AstroIntegration that (in a future release) merges a sentinel-marked
 * `staticwebapp.config.json` slice for shared 404 handling on Azure Static
 * Web Apps.
 *
 * **Status:** 0.1.0 skeleton. The merge behaviour ships in T6; this stub
 * only reserves the module identity, the export shape, and the integration
 * name so downstream consumers can wire it into `astro.config.mjs` today.
 * Calling the returned integration is a safe no-op that logs its intent.
 */
export default function easyWebNotFound(options: Options = {}): AstroIntegration {
  return {
    name: '@achimismaili/easy-web-swa',
    hooks: {
      'astro:config:setup': ({ logger }) => {
        logger.info(
          '@achimismaili/easy-web-swa: 0.1.0 skeleton loaded. ' +
          'staticwebapp.config.json merge logic ships in T6 — this call is currently a no-op.' +
          (options.slicePath ? ` (slicePath="${options.slicePath}" recorded but unused)` : ''),
        );
      },
    },
  };
}
