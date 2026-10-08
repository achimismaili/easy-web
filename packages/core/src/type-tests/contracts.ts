import { assertImplements } from '../contracts/implements.js';
import type { DecorativeImage, Event, Product } from '../contracts/types.js';

const product: Product = {
  title: 'Touring bicycle',
  image: { src: '/touring.jpg', alt: 'A touring bicycle' },
};

// @ts-expect-error Product requires image.
const productWithoutImage: Product = { title: 'Touring bicycle' };

const event: Event = {
  title: 'Autumn ride',
  startDate: new Date('2026-10-08T12:00:00.000Z'),
};

// @ts-expect-error Event requires startDate.
const eventWithoutStartDate: Event = { title: 'Autumn ride' };

// @ts-expect-error Decorative images do not accept alt text.
const _decorativeImage: DecorativeImage = { src: '/divider.svg', decorative: true, alt: 'Divider' };

// @ts-expect-error The data does not implement Event because startDate is missing.
assertImplements<{ title: string }, Event>();

assertImplements<{ title: string; startDate: Date }, Event>();

void product;
void productWithoutImage;
void event;
void eventWithoutStartDate;
