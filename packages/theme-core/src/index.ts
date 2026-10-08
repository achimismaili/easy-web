/**
 * @easy-web/theme-core is a compatibility package. Everything it exports now
 * lives in `@easy-web/core/theme`; each symbol is re-exported here as a
 * `@deprecated` alias so editors flag the old import path.
 */
import {
  applyTheme as coreApplyTheme,
  breakpoints as coreBreakpoints,
  getPreferredTheme as coreGetPreferredTheme,
  noFlashScript as coreNoFlashScript,
  subscribeToSystem as coreSubscribeToSystem,
  tokens as coreTokens,
  type Breakpoint as CoreBreakpoint,
  type Theme as CoreTheme,
  type Tokens as CoreTokens,
} from '@easy-web/core/theme';

/** @deprecated Import from `@easy-web/core/theme` instead. */
export const applyTheme = coreApplyTheme;
/** @deprecated Import from `@easy-web/core/theme` instead. */
export const getPreferredTheme = coreGetPreferredTheme;
/** @deprecated Import from `@easy-web/core/theme` instead. */
export const noFlashScript = coreNoFlashScript;
/** @deprecated Import from `@easy-web/core/theme` instead. */
export const subscribeToSystem = coreSubscribeToSystem;
/** @deprecated Import from `@easy-web/core/theme` instead. */
export const tokens = coreTokens;
/** @deprecated Import from `@easy-web/core/theme` instead. */
export const breakpoints = coreBreakpoints;

/** @deprecated Import from `@easy-web/core/theme` instead. */
export type Theme = CoreTheme;
/** @deprecated Import from `@easy-web/core/theme` instead. */
export type Tokens = CoreTokens;
/** @deprecated Import from `@easy-web/core/theme` instead. */
export type Breakpoint = CoreBreakpoint;
