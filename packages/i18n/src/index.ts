/**
 * @easy-web/i18n is a compatibility package. Everything it exports now lives
 * in `@easy-web/core/i18n`; each symbol is re-exported here as a `@deprecated`
 * alias so editors flag the old import path.
 */
import {
  ambientTrailingSlash as coreAmbientTrailingSlash,
  createI18n as coreCreateI18n,
  findLocalizedGroup as coreFindLocalizedGroup,
  formatCurrency as coreFormatCurrency,
  formatDate as coreFormatDate,
  formatList as coreFormatList,
  formatNumber as coreFormatNumber,
  formatRelativeTime as coreFormatRelativeTime,
  getAlternateLinks as coreGetAlternateLinks,
  getCanonicalUrl as coreGetCanonicalUrl,
  getLocaleFromPath as coreGetLocaleFromPath,
  localizedHref as coreLocalizedHref,
  normalizeLocalizedPath as coreNormalizeLocalizedPath,
  stripQueryAndHash as coreStripQueryAndHash,
  toServedPath as coreToServedPath,
  validateLocalizedPaths as coreValidateLocalizedPaths,
  type AlternateLink as CoreAlternateLink,
  type I18nConfig as CoreI18nConfig,
  type LocalizedPathGroup as CoreLocalizedPathGroup,
  type TrailingSlash as CoreTrailingSlash,
} from '@easy-web/core/i18n';

/** @deprecated Import from `@easy-web/core/i18n` instead. */
export const createI18n = coreCreateI18n;
/** @deprecated Import from `@easy-web/core/i18n` instead. */
export const formatDate = coreFormatDate;
/** @deprecated Import from `@easy-web/core/i18n` instead. */
export const formatNumber = coreFormatNumber;
/** @deprecated Import from `@easy-web/core/i18n` instead. */
export const formatRelativeTime = coreFormatRelativeTime;
/** @deprecated Import from `@easy-web/core/i18n` instead. */
export const formatList = coreFormatList;
/** @deprecated Import from `@easy-web/core/i18n` instead. */
export const formatCurrency = coreFormatCurrency;
/** @deprecated Import from `@easy-web/core/i18n` instead. */
export const stripQueryAndHash = coreStripQueryAndHash;
/** @deprecated Import from `@easy-web/core/i18n` instead. */
export const ambientTrailingSlash = coreAmbientTrailingSlash;
/** @deprecated Import from `@easy-web/core/i18n` instead. */
export const toServedPath = coreToServedPath;
/** @deprecated Import from `@easy-web/core/i18n` instead. */
export const normalizeLocalizedPath = coreNormalizeLocalizedPath;
/** @deprecated Import from `@easy-web/core/i18n` instead. */
export const findLocalizedGroup = coreFindLocalizedGroup;
/** @deprecated Import from `@easy-web/core/i18n` instead. */
export const validateLocalizedPaths = coreValidateLocalizedPaths;
/** @deprecated Import from `@easy-web/core/i18n` instead. */
export const localizedHref = coreLocalizedHref;
/** @deprecated Import from `@easy-web/core/i18n` instead. */
export const getLocaleFromPath = coreGetLocaleFromPath;
/** @deprecated Import from `@easy-web/core/i18n` instead. */
export const getAlternateLinks = coreGetAlternateLinks;
/** @deprecated Import from `@easy-web/core/i18n` instead. */
export const getCanonicalUrl = coreGetCanonicalUrl;

/** @deprecated Import from `@easy-web/core/i18n` instead. */
export type I18nConfig<L extends string> = CoreI18nConfig<L>;
/** @deprecated Import from `@easy-web/core/i18n` instead. */
export type LocalizedPathGroup = CoreLocalizedPathGroup;
/** @deprecated Import from `@easy-web/core/i18n` instead. */
export type TrailingSlash = CoreTrailingSlash;
/** @deprecated Import from `@easy-web/core/i18n` instead. */
export type AlternateLink = CoreAlternateLink;
