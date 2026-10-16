import { z } from 'astro/zod';
import { describe, expect, expectTypeOf, it, vi } from 'vitest';
import {
    defaultAdminContent,
    defineSingleton,
    fieldSets,
    toAstroSchema,
    type AdminShellContent,
    type InferData,
} from '../index.js';

const context = { image: vi.fn(() => z.string()) };

function adminDefinition(uiLocale: 'de' | 'en') {
    return defineSingleton({
        name: 'admin',
        label: 'Admin',
        file: 'src/content/data/admin.json',
        fields: fieldSets.admin({ uiLocale }),
    });
}

describe('admin singleton field set', () => {
    it('emits the nested Decap structure from supported widgets', () => {
        // Given / When
        const fields = fieldSets.admin({ uiLocale: 'en' });
        const notice = fields[0]?.decap;
        const footerLinks = fields[1]?.decap;

        // Then
        expect(fields.map(field => field.name)).toEqual(['notice', 'footerLinks']);
        expect(notice).toMatchObject({ name: 'notice', label: 'Editor notice', widget: 'object', required: true });
        expect(notice?.fields?.map(field => [field.name, field.widget, field.required])).toEqual([
            ['enabled', 'boolean', false],
            ['level', 'select', true],
            ['message', 'text', true],
            ['link', 'object', false],
        ]);
        expect(notice?.fields?.[1]).toMatchObject({
            default: 'info',
            options: [
                { label: 'Information', value: 'info' },
                { label: 'Warning', value: 'warning' },
                { label: 'Critical', value: 'critical' },
            ],
        });
        expect(notice?.fields?.[2]?.widget).not.toBe('markdown');
        expect(notice?.fields?.[3]?.fields?.map(field => [field.name, field.required])).toEqual([
            ['label', true],
            ['href', true],
        ]);
        expect(footerLinks).toMatchObject({
            name: 'footerLinks',
            widget: 'list',
            required: true,
            min: 1,
        });
        expect(footerLinks?.fields?.map(field => [field.name, field.required])).toEqual([
            ['label', true],
            ['href', true],
        ]);
    });

    it.each([
        ['de', 'Editor-Hinweis', 'Öffentliche', 'vertraulichen', 'Bereitstellung'],
        ['en', 'Editor notice', 'Public', 'confidential', 'deployment'],
    ] as const)('uses only %s editor labels and public-content guidance', (uiLocale, noticeLabel, publicWord, confidentialWord, deploymentWord) => {
        // Given / When
        const fields = fieldSets.admin({ uiLocale });
        const serialized = JSON.stringify(fields.map(field => field.decap));

        // Then
        expect(fields[0]?.decap.label).toBe(noticeLabel);
        expect(serialized).toContain(publicWord);
        expect(serialized).toContain(confidentialWord);
        expect(serialized).toContain(deploymentWord);
        expect(serialized).toContain('/admin');
        expect(serialized).not.toContain(uiLocale === 'de' ? 'Editor notice' : 'Editor-Hinweis');
    });

    it('infers data compatible with the public readonly contract', () => {
        // Given / When
        const definition = adminDefinition('en');
        type Data = InferData<typeof definition>;

        // Then
        expectTypeOf<Data>().toExtend<AdminShellContent>();
        expectTypeOf<Data['notice']['level']>().toEqualTypeOf<'info' | 'warning' | 'critical'>();
        expectTypeOf<Data['notice']['link']>().toEqualTypeOf<{ readonly label: string; readonly href: string } | undefined>();
        void definition;
    });
});

describe('admin singleton Astro schema', () => {
    it.each(['/', '/version', '/admin/#/edit/site_config/admin', 'https://decapcms.org/features/?persona=editor'] as const)(
        'accepts safe link destination %s',
        href => {
            // Given
            const schema = toAstroSchema(adminDefinition('en'))(context);
            const content = defaultAdminContent({ uiLocale: 'en' });

            // When / Then
            expect(schema.safeParse({ ...content, notice: { ...content.notice, link: { label: 'Safe', href } } }).success).toBe(true);
        },
    );

    it.each(['//attacker.example', '/\\attacker.example', 'https://example.com\\attacker', 'javascript:alert(1)', 'data:text/html,bad', 'mailto:editor@example.com', 'relative/path'] as const)(
        'rejects unsafe link destination %s',
        href => {
            // Given
            const schema = toAstroSchema(adminDefinition('en'))(context);
            const content = defaultAdminContent({ uiLocale: 'en' });

            // When / Then
            expect(schema.safeParse({ ...content, footerLinks: [{ label: 'Unsafe', href }] }).success).toBe(false);
        },
    );

    it('enforces closed levels and complete optional links', () => {
        // Given
        const schema = toAstroSchema(adminDefinition('en'))(context);
        const content = defaultAdminContent({ uiLocale: 'en' });

        // When / Then
        expect(schema.safeParse({ ...content, notice: { enabled: true, level: 'urgent', message: 'Message' } }).success).toBe(false);
        expect(schema.safeParse({ ...content, notice: { ...content.notice, link: undefined } }).success).toBe(true);
        expect(schema.safeParse({ ...content, notice: { ...content.notice, link: { label: 'Incomplete' } } }).success).toBe(false);
        expect(schema.safeParse({ ...content, footerLinks: [] }).success).toBe(false);
    });
});

describe('admin singleton defaults', () => {
    it.each(['de', 'en'] as const)('seeds immutable %s content with safe destinations', uiLocale => {
        // Given / When
        const content = defaultAdminContent({ uiLocale });

        // Then
        expect(content.notice.enabled).toBe(true);
        expect(content.notice.level).toBe('info');
        expect(content.notice.message.length).toBeGreaterThan(20);
        expect(content.notice.link?.href).toBe('/admin/#/edit/site_config/admin');
        expect(content.footerLinks.map(link => link.href)).toEqual([
            '/',
            '/version',
            'https://decapcms.org/features/?persona=editor',
        ]);
        expect(Object.isFrozen(content)).toBe(true);
        expect(Object.isFrozen(content.notice)).toBe(true);
        expect(Object.isFrozen(content.notice.link)).toBe(true);
        expect(Object.isFrozen(content.footerLinks)).toBe(true);
        expect(content.footerLinks.every(Object.isFrozen)).toBe(true);
    });
});
