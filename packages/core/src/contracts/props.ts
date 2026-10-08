import type { Image } from './types.js';

export type GalleryItem = Image & {
    readonly caption?: string;
    readonly title?: string;
    readonly subtitle?: string;
    readonly description?: string;
    readonly href?: string;
    readonly cta?: string;
    readonly imagePosition?: 'left' | 'right';
};
