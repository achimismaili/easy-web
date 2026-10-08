import { describe, expect, it } from 'vitest';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import type { ImageMetadata } from 'astro';
import GallerySection from '../GallerySection.astro';
import { legacyFixtures } from './fixtures/legacy-props';

const metadata: ImageMetadata = { src: '/src/assets/gallery.png', width: 1600, height: 900, format: 'png' };
const cases = [
    ['image-grid', 'items', '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw'],
    ['masonry-grid', 'items', '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw'],
    ['lightbox-grid', 'items', '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw'],
    ['hero-slider', 'slides', '100vw'],
    ['carousel', 'slides', '100vw'],
    ['feature-highlight', 'items', '(min-width: 768px) 50vw, 100vw'],
] as const;

describe('gallery contracts', () => {
    it.each(cases)('renders responsive metadata through the %s dispatcher', async (kind, list, sizes) => {
        // Given
        const container = await AstroContainer.create();
        const gallery = { kind, [list]: [{ src: metadata, alt: 'Mountain lake' }] };
        // When
        const html = await container.renderToString(GallerySection, { props: { gallery } });
        // Then
        expect(html).toContain('srcset=');
        expect(html).toContain(`sizes="${sizes}"`);
        expect(html).toContain('alt="Mountain lake"');
        expect(html).not.toContain('[object Object]');
        const scope = html.match(/<section\b[^>]*\s(data-astro-cid-[a-z0-9]+)/)?.[1];
        expect(scope).toBeDefined();
        expect(html.match(/<img\b[^>]*>/)?.[0]).toContain(scope);
    });

    it.each(cases)('accepts bare string sources in %s', async (kind, list) => {
        // Given
        const container = await AstroContainer.create();
        // When
        const html = await container.renderToString(GallerySection, { props: { gallery: { kind, [list]: ['/legacy.jpg'] } } });
        // Then
        expect(html).toContain('src="/legacy.jpg"');
        expect(html).not.toContain('srcset=');
    });

    it.each(['GalleryImageGrid', 'GalleryMasonryGrid', 'GalleryFeatureHighlight', 'GalleryLightboxGrid'])('renders nothing for empty %s', async name => {
        // Given
        const fixture = legacyFixtures.find(item => item.name === name);
        if (!fixture) throw new Error(`Missing fixture: ${name}`);
        const container = await AstroContainer.create();
        // When
        const html = await container.renderToString(fixture.component, { props: { ...fixture.props, items: [] } });
        // Then
        expect(html.trim()).toBe('');
    });

    it('uses thumbnail text attributes without a JSON payload for the lightbox', async () => {
        // Given
        const container = await AstroContainer.create();
        const gallery = { kind: 'lightbox-grid', items: [{ src: metadata, alt: 'Lake', title: '<Lake>', description: 'A "quiet" shore' }] };
        // When
        const html = await container.renderToString(GallerySection, { props: { gallery } });
        // Then
        expect(html).not.toContain('application/json');
        expect(html).not.toContain('data-lightbox-items');
        expect(html).not.toContain('JSON.stringify');
        expect(html).toContain('thumbnail.currentSrc || thumbnail.src');
        expect(html).toContain('data-title="<Lake>"');
        expect(html).toContain('data-description="A &quot;quiet&quot; shore"');
    });

    it.each(['carousel', 'hero-slider', 'lightbox-grid'])('localizes %s and honors label overrides', async kind => {
        // Given
        const container = await AstroContainer.create();
        const entries = [{ src: '/one.jpg', alt: 'One' }, { src: '/two.jpg', alt: 'Two' }];
        // When
        const html = await container.renderToString(GallerySection, { props: {
            gallery: { kind, items: entries, slides: entries }, lang: 'de',
            labels: { previousSlide: 'Zurück', previousImage: 'Zurück' },
        } });
        // Then
        expect(html).toContain('aria-label="Zurück"');
        expect(html).toContain(kind === 'lightbox-grid' ? 'Nächstes Bild' : 'Nächste Folie');
    });
});
