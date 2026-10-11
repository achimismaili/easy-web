import type { CliUiLocale } from './locale-inputs.js'

export type LocalizationInterviewLabels = {
    readonly cliUiLocale: string
    readonly contentLocales: string
    readonly defaultContentLocale: string
    readonly localizedLabels: string
    readonly localizedPaths: string
    readonly formatMode: string
    readonly sharedFormatLocale: string
    readonly perLanguageFormatLocales: string
    readonly timeZone: string
    readonly moneyCurrency: string
    readonly invalidInput: string
}

export const localizationInterviewCatalogs = {
    en: {
        cliUiLocale: 'Interview language',
        contentLocales: 'Site content languages (BCP47)',
        defaultContentLocale: 'Default content language',
        localizedLabels: 'Translated site labels',
        localizedPaths: 'Translated public routes (only differing slugs)',
        formatMode: 'Shared or per-language regional formatting',
        sharedFormatLocale: 'Shared format locale (for example en-GB)',
        perLanguageFormatLocales: 'Format locale for each content language',
        timeZone: 'IANA timezone (for example Europe/London)',
        moneyCurrency: 'Currency for money content (ISO 4217)',
        invalidInput: 'Invalid explicit localization input',
    },
    de: {
        cliUiLocale: 'Sprache des Interviews',
        contentLocales: 'Inhaltssprachen der Website (BCP47)',
        defaultContentLocale: 'Standard-Inhaltssprache',
        localizedLabels: 'Übersetzte Website-Beschriftungen',
        localizedPaths: 'Übersetzte öffentliche Routen (nur unterschiedliche Slugs)',
        formatMode: 'Gemeinsame oder sprachabhängige regionale Formatierung',
        sharedFormatLocale: 'Gemeinsames Format-Gebietsschema (zum Beispiel de-AT)',
        perLanguageFormatLocales: 'Format-Gebietsschema je Inhaltssprache',
        timeZone: 'IANA-Zeitzone (zum Beispiel Europe/Vienna)',
        moneyCurrency: 'Währung für Geldinhalte (ISO 4217)',
        invalidInput: 'Ungültige explizite Lokalisierungseingabe',
    },
} as const satisfies Readonly<Record<CliUiLocale, LocalizationInterviewLabels>>
