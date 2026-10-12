/**
 * @easy-web/i18n is a compatibility package. Everything it exports now lives
 * in `@easy-web/core/i18n`; each symbol is re-exported here as a `@deprecated`
 * alias so editors flag the old import path.
 */
import {
  UnselectedContentLocaleError as coreUnselectedContentLocaleError,
  ambientTrailingSlash as coreAmbientTrailingSlash,
  cliUiLocaleSchema as coreCliUiLocaleSchema,
  contentLocaleSchema as coreContentLocaleSchema,
  createExplicitFormatters as coreCreateExplicitFormatters,
  createI18n as coreCreateI18n,
  createLocalizationSchema as coreCreateLocalizationSchema,
  currencyCodeSchema as coreCurrencyCodeSchema,
  dateOnlySchema as coreDateOnlySchema,
  findLocalizedGroup as coreFindLocalizedGroup,
  formatCurrency as coreFormatCurrency,
  formatDate as coreFormatDate,
  formatList as coreFormatList,
  formatLocaleSchema as coreFormatLocaleSchema,
  formatLocalesSchema as coreFormatLocalesSchema,
  formatNumber as coreFormatNumber,
  formatRelativeTime as coreFormatRelativeTime,
  getAlternateLinks as coreGetAlternateLinks,
  getCanonicalUrl as coreGetCanonicalUrl,
  getLocaleFromPath as coreGetLocaleFromPath,
  ianaTimeZoneSchema as coreIanaTimeZoneSchema,
  localizationInterviewCatalogs as coreLocalizationInterviewCatalogs,
  localizedHref as coreLocalizedHref,
  normalizeLocalizedPath as coreNormalizeLocalizedPath,
  optionalCurrencyCodeSchema as coreOptionalCurrencyCodeSchema,
  parseCreateLocalization as coreParseCreateLocalization,
  resolveDetectedCliUiLocale as coreResolveDetectedCliUiLocale,
  resolveFormatContext as coreResolveFormatContext,
  stripQueryAndHash as coreStripQueryAndHash,
  toServedPath as coreToServedPath,
  validateLocalizedPaths as coreValidateLocalizedPaths,
  type AlternateLink as CoreAlternateLink,
  type CliUiLocale as CoreCliUiLocale,
  type ContentLocale as CoreContentLocale,
  type CreateLocalization as CoreCreateLocalization,
  type CurrencyCode as CoreCurrencyCode,
  type CurrencyFormatOptions as CoreCurrencyFormatOptions,
  type DateOnly as CoreDateOnly,
  type DateOnlyFormatOptions as CoreDateOnlyFormatOptions,
  type DecimalFormatOptions as CoreDecimalFormatOptions,
  type ExplicitFormatContext as CoreExplicitFormatContext,
  type FormatLocale as CoreFormatLocale,
  type FormatLocales as CoreFormatLocales,
  type I18nConfig as CoreI18nConfig,
  type IanaTimeZone as CoreIanaTimeZone,
  type InstantFormatOptions as CoreInstantFormatOptions,
  type LocalizationInterviewLabels as CoreLocalizationInterviewLabels,
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
export const UnselectedContentLocaleError = coreUnselectedContentLocaleError;
/** @deprecated Import from `@easy-web/core/i18n` instead. */
export const cliUiLocaleSchema = coreCliUiLocaleSchema;
/** @deprecated Import from `@easy-web/core/i18n` instead. */
export const contentLocaleSchema: typeof coreContentLocaleSchema = coreContentLocaleSchema;
/** @deprecated Import from `@easy-web/core/i18n` instead. */
export const createExplicitFormatters = coreCreateExplicitFormatters;
/** @deprecated Import from `@easy-web/core/i18n` instead. */
export const createLocalizationSchema: typeof coreCreateLocalizationSchema = coreCreateLocalizationSchema;
/** @deprecated Import from `@easy-web/core/i18n` instead. */
export const currencyCodeSchema: typeof coreCurrencyCodeSchema = coreCurrencyCodeSchema;
/** @deprecated Import from `@easy-web/core/i18n` instead. */
export const dateOnlySchema: typeof coreDateOnlySchema = coreDateOnlySchema;
/** @deprecated Import from `@easy-web/core/i18n` instead. */
export const formatLocaleSchema: typeof coreFormatLocaleSchema = coreFormatLocaleSchema;
/** @deprecated Import from `@easy-web/core/i18n` instead. */
export const formatLocalesSchema: typeof coreFormatLocalesSchema = coreFormatLocalesSchema;
/** @deprecated Import from `@easy-web/core/i18n` instead. */
export const ianaTimeZoneSchema: typeof coreIanaTimeZoneSchema = coreIanaTimeZoneSchema;
/** @deprecated Import from `@easy-web/core/i18n` instead. */
export const localizationInterviewCatalogs = coreLocalizationInterviewCatalogs;
/** @deprecated Import from `@easy-web/core/i18n` instead. */
export const optionalCurrencyCodeSchema: typeof coreOptionalCurrencyCodeSchema = coreOptionalCurrencyCodeSchema;
/** @deprecated Import from `@easy-web/core/i18n` instead. */
export const parseCreateLocalization = coreParseCreateLocalization;
/** @deprecated Import from `@easy-web/core/i18n` instead. */
export const resolveDetectedCliUiLocale = coreResolveDetectedCliUiLocale;
/** @deprecated Import from `@easy-web/core/i18n` instead. */
export const resolveFormatContext = coreResolveFormatContext;

/** @deprecated Import from `@easy-web/core/i18n` instead. */
export type I18nConfig<L extends string> = CoreI18nConfig<L>;
/** @deprecated Import from `@easy-web/core/i18n` instead. */
export type LocalizedPathGroup = CoreLocalizedPathGroup;
/** @deprecated Import from `@easy-web/core/i18n` instead. */
export type TrailingSlash = CoreTrailingSlash;
/** @deprecated Import from `@easy-web/core/i18n` instead. */
export type AlternateLink = CoreAlternateLink;
/** @deprecated Import from `@easy-web/core/i18n` instead. */
export type CliUiLocale = CoreCliUiLocale;
/** @deprecated Import from `@easy-web/core/i18n` instead. */
export type ContentLocale = CoreContentLocale;
/** @deprecated Import from `@easy-web/core/i18n` instead. */
export type FormatLocale = CoreFormatLocale;
/** @deprecated Import from `@easy-web/core/i18n` instead. */
export type IanaTimeZone = CoreIanaTimeZone;
/** @deprecated Import from `@easy-web/core/i18n` instead. */
export type CurrencyCode = CoreCurrencyCode;
/** @deprecated Import from `@easy-web/core/i18n` instead. */
export type FormatLocales = CoreFormatLocales;
/** @deprecated Import from `@easy-web/core/i18n` instead. */
export type CreateLocalization = CoreCreateLocalization;
/** @deprecated Import from `@easy-web/core/i18n` instead. */
export type LocalizationInterviewLabels = CoreLocalizationInterviewLabels;
/** @deprecated Import from `@easy-web/core/i18n` instead. */
export type ExplicitFormatContext = CoreExplicitFormatContext;
/** @deprecated Import from `@easy-web/core/i18n` instead. */
export type DateOnly = CoreDateOnly;
/** @deprecated Import from `@easy-web/core/i18n` instead. */
export type DateOnlyFormatOptions = CoreDateOnlyFormatOptions;
/** @deprecated Import from `@easy-web/core/i18n` instead. */
export type InstantFormatOptions = CoreInstantFormatOptions;
/** @deprecated Import from `@easy-web/core/i18n` instead. */
export type DecimalFormatOptions = CoreDecimalFormatOptions;
/** @deprecated Import from `@easy-web/core/i18n` instead. */
export type CurrencyFormatOptions = CoreCurrencyFormatOptions;
