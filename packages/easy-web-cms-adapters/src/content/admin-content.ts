import { field } from './fields.js';
import type { UiOptions } from './field-sets.js';
import type { Pattern } from './types.js';

const SAFE_PUBLIC_HREF_SOURCE = '^(?:/(?!/)[^\\s\\\\]*|https://[^\\s\\\\]+)$';
const SAFE_PUBLIC_HREF: Pattern = [
    SAFE_PUBLIC_HREF_SOURCE,
    'Use a root-relative path beginning with / or an https:// URL.',
] as const;

const ADMIN_COPY = {
    de: {
        notice: 'Editor-Hinweis',
        enabled: 'Hinweis anzeigen',
        level: 'Hinweisstufe',
        levels: { info: 'Information', warning: 'Warnung', critical: 'Kritisch' },
        message: 'Nachricht',
        link: 'Optionaler Hinweis-Link',
        linkLabel: 'Link-Beschriftung',
        href: 'Link-Ziel',
        footerLinks: 'Links in der Fußzeile',
        footerLink: 'Fußzeilen-Link',
        hint: 'Öffentliche Werte auf /admin. Sie sind nicht durch die CMS-Anmeldung geschützt: keine vertraulichen Informationen eingeben. Änderungen erscheinen nach der nächsten erfolgreichen Bereitstellung.',
        defaultMessage: 'Sie können diesen Editor-Hinweis und die Links in der Fußzeile unter Konfiguration ändern.',
        configuration: 'Konfiguration',
        website: 'Website',
        version: 'Version',
        decapFeatures: 'Decap-Funktionen',
    },
    en: {
        notice: 'Editor notice',
        enabled: 'Show notice',
        level: 'Notice level',
        levels: { info: 'Information', warning: 'Warning', critical: 'Critical' },
        message: 'Message',
        link: 'Optional notice link',
        linkLabel: 'Link label',
        href: 'Link destination',
        footerLinks: 'Footer links',
        footerLink: 'Footer link',
        hint: 'Public values on /admin. They are not protected by the CMS login: do not enter confidential information. Changes appear after the next successful deployment.',
        defaultMessage: 'You can change this editor notice and the footer links under Configuration.',
        configuration: 'Configuration',
        website: 'Website',
        version: 'Version',
        decapFeatures: 'Decap features',
    },
} as const;

export type AdminNoticeLevel = 'info' | 'warning' | 'critical';

export type AdminShellContent = {
    readonly notice: {
        readonly enabled: boolean;
        /** `info` is neutral, `warning` is emphasized, and `critical` marks an urgent editor warning. */
        readonly level: AdminNoticeLevel;
        readonly message: string;
        readonly link?: { readonly label: string; readonly href: string };
    };
    readonly footerLinks: readonly { readonly label: string; readonly href: string }[];
};

export function isSafePublicHref(value: string): boolean {
    return new RegExp(SAFE_PUBLIC_HREF_SOURCE).test(value);
}

export function admin({ uiLocale = 'de' }: UiOptions = {}) {
    const copy = ADMIN_COPY[uiLocale];
    const linkFields = [
        field.string('label', { label: copy.linkLabel }),
        field.string('href', { label: copy.href, pattern: SAFE_PUBLIC_HREF }),
    ] as const;
    return [
        field.object('notice', { label: copy.notice, hint: copy.hint, fields: [
            field.boolean('enabled', { label: copy.enabled, default: true }),
            field.select('level', { label: copy.level, options: [
                { label: copy.levels.info, value: 'info' },
                { label: copy.levels.warning, value: 'warning' },
                { label: copy.levels.critical, value: 'critical' },
            ], default: 'info' }),
            field.text('message', { label: copy.message }),
            field.object('link', { label: copy.link, required: false, fields: linkFields }),
        ] }),
        field.list('footerLinks', { label: copy.footerLinks, labelSingular: copy.footerLink,
            hint: copy.hint, required: true, min: 1, max: 12, fields: linkFields }),
    ] as const;
}

export function defaultAdminContent({ uiLocale = 'de' }: UiOptions = {}): AdminShellContent {
    const copy = ADMIN_COPY[uiLocale];
    const link = Object.freeze({ label: copy.configuration, href: '/admin/#/edit/site_config/admin' });
    const notice = Object.freeze({ enabled: true, level: 'info' as const, message: copy.defaultMessage, link });
    const footerLinks = Object.freeze([
        Object.freeze({ label: copy.website, href: '/' }),
        Object.freeze({ label: copy.version, href: '/version' }),
        Object.freeze({ label: copy.decapFeatures, href: 'https://decapcms.org/features/?persona=editor' }),
    ]);
    return Object.freeze({ notice, footerLinks });
}
