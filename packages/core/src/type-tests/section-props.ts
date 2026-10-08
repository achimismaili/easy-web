import type { NotFoundProps, SectionProps } from '../contracts/props.js';

const sectionWithClass: SectionProps = { title: 'Section title', class: 'band' };

// @ts-expect-error Section's class passthrough takes class names as a string.
const sectionWithNumericClass: SectionProps = { class: 1 };

const notFoundWithLegacyPath: NotFoundProps = { currentLang: 'de', defaultLocale: 'de', image: '/img/404.png' };

const notFoundWithDecorativeImage: NotFoundProps = {
  currentLang: 'de',
  defaultLocale: 'de',
  image: { src: '/img/404.svg', decorative: true },
};

// @ts-expect-error A NotFound image object needs alt text unless it is decorative.
const notFoundWithoutAlt: NotFoundProps = { currentLang: 'de', defaultLocale: 'de', image: { src: '/img/404.png' } };

void sectionWithClass;
void sectionWithNumericClass;
void notFoundWithLegacyPath;
void notFoundWithDecorativeImage;
void notFoundWithoutAlt;
