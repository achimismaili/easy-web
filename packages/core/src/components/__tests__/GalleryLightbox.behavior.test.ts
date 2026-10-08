import { runInNewContext } from 'node:vm';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { describe, expect, it } from 'vitest';
import GalleryLightboxGrid from '../GalleryLightboxGrid.astro';

type Event = { readonly target?: Element; readonly currentTarget?: Element; readonly key?: string; preventDefault(): void };

// The inline controller's DOM seam, without installing a second DOM implementation.
class Element {
    readonly dataset: Record<string, string> = {};
    readonly listeners = new Map<string, ((event: Event) => void)[]>();
    readonly children = new Map<string, Element>();
    hidden = true;
    src = '';
    currentSrc = '';
    alt = '';
    textContent = '';
    focused = false;
    querySelector(selector: string) { return this.children.get(selector); }
    querySelectorAll() { return [...this.children.values()]; }
    addEventListener(name: string, listener: (event: Event) => void) {
        this.listeners.set(name, [...(this.listeners.get(name) ?? []), listener]);
    }
    focus() { this.focused = true; }
    dispatch(name: string, event: Partial<Event> = {}) {
        for (const listener of this.listeners.get(name) ?? []) {
            listener({ currentTarget: this, target: this, preventDefault() {}, ...event });
        }
    }
}

async function lightbox() {
    const container = await AstroContainer.create();
    const html = await container.renderToString(GalleryLightboxGrid, { props: { items: [{ src: '/one.jpg', alt: 'One' }, { src: '/two.jpg', alt: 'Two' }] } });
    const root = new Element();
    const modal = new Element();
    const image = new Element();
    const caption = new Element();
    const description = new Element();
    const close = new Element();
    const previous = new Element();
    const next = new Element();
    modal.dataset.open = 'false';
    root.children.set('.ew-lightbox', modal);
    modal.children.set('.ew-lightbox__img', image);
    modal.children.set('.ew-lightbox__caption-title', caption);
    modal.children.set('.ew-lightbox__caption-description', description);
    modal.children.set('.ew-lightbox__close', close);
    modal.children.set('.ew-lightbox__arrow--prev', previous);
    modal.children.set('.ew-lightbox__arrow--next', next);
    const triggers = [new Element(), new Element()];
    triggers.forEach((trigger, index) => {
        const thumbnail = new Element();
        thumbnail.src = `https://example.test/${index}.jpg`;
        thumbnail.alt = `Photo ${index}`;
        trigger.children.set('img', thumbnail);
    });
    root.querySelectorAll = () => triggers;
    const document = new Element();
    document.children.set('root', root);
    const body = { style: { overflow: '' } };
    const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
    expect(script).toBeDefined();
    runInNewContext(script ?? '', { document: Object.assign(document, { body }) });
    return { modal, image, caption, description, close, previous, next, triggers, document, body };
}

describe('rendered lightbox controller', () => {
    it('reads the live currentSrc, alt and text when a thumbnail is clicked', async () => {
        // Given
        const fixture = await lightbox();
        const trigger = fixture.triggers[0];
        const thumbnail = trigger.querySelector('img');
        if (!thumbnail) throw new Error('Fixture thumbnail missing');
        thumbnail.currentSrc = 'https://example.test/responsive.webp';
        thumbnail.alt = 'Updated description';
        trigger.dataset.title = '<strong>Not markup</strong>';
        trigger.dataset.description = 'Caption text';
        // When
        trigger.dispatch('click');
        // Then
        expect(fixture.image.src).toBe('https://example.test/responsive.webp');
        expect(fixture.image.alt).toBe('Updated description');
        expect(fixture.caption.textContent).toBe('<strong>Not markup</strong>');
        expect(fixture.description.textContent).toBe('Caption text');
        expect(fixture.close.focused).toBe(true);
        expect(fixture.modal.hidden).toBe(false);
    });

    it.each([['ArrowLeft', 0, 1], ['ArrowRight', 1, 0]] as const)('wraps at the boundary with %s', async (key, start, expected) => {
        // Given
        const fixture = await lightbox();
        fixture.triggers[start].dispatch('click');
        // When
        fixture.document.dispatch('keydown', { key });
        // Then
        expect(fixture.image.src).toBe(`https://example.test/${expected}.jpg`);
        expect(fixture.image.alt).toBe(`Photo ${expected}`);
    });

    it.each(['escape', 'backdrop', 'close'] as const)('restores the original trigger after navigation and %s close', async action => {
        // Given
        const fixture = await lightbox();
        fixture.triggers[0].dispatch('click');
        fixture.next.dispatch('click');
        // When
        switch (action) {
            case 'escape': fixture.document.dispatch('keydown', { key: 'Escape' }); break;
            case 'backdrop': fixture.modal.dispatch('click'); break;
            case 'close': fixture.close.dispatch('click'); break;
            default: { const exhaustive: never = action; throw new Error(String(exhaustive)); }
        }
        // Then
        expect(fixture.modal.hidden).toBe(true);
        expect(fixture.triggers[0].focused).toBe(true);
        expect(fixture.triggers[1].focused).toBe(false);
        expect(fixture.body.style.overflow).toBe('');
    });
});
