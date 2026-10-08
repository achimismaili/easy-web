import type { AstroComponentFactory } from 'astro/runtime/server/index.js';
import BlogPostCard from '../../components/BlogPostCard.astro';
import Card from '../../components/Card.astro';
import CardGrid from '../../components/CardGrid.astro';
import ContactSection from '../../components/ContactSection.astro';
import CtaSection from '../../components/CtaSection.astro';
import DraftBanner from '../../components/DraftBanner.astro';
import Footer from '../../components/Footer.astro';
import GalleryCarousel from '../../components/GalleryCarousel.astro';
import GalleryFeatureHighlight from '../../components/GalleryFeatureHighlight.astro';
import GalleryHeroSlider from '../../components/GalleryHeroSlider.astro';
import GalleryImageGrid from '../../components/GalleryImageGrid.astro';
import GalleryLightboxGrid from '../../components/GalleryLightboxGrid.astro';
import GalleryMasonryGrid from '../../components/GalleryMasonryGrid.astro';
import GallerySection from '../../components/GallerySection.astro';
import Header from '../../components/Header.astro';
import HeaderCentered from '../../components/HeaderCentered.astro';
import HeaderFlyout from '../../components/HeaderFlyout.astro';
import HeaderHideOnScroll from '../../components/HeaderHideOnScroll.astro';
import Hero from '../../components/Hero.astro';
import LanguageNotice from '../../components/LanguageNotice.astro';
import LanguageSwitch from '../../components/LanguageSwitch.astro';
import LegalLayout from '../../components/LegalLayout.astro';
import NotFound from '../../components/NotFound.astro';
import PageShell from '../../components/PageShell.astro';
import Prose from '../../components/Prose.astro';
import Section from '../../components/Section.astro';
import ThemeToggle from '../../components/ThemeToggle.astro';
import UniversalMedia from '../../components/UniversalMedia.astro';

/**
 * Legacy-props fixtures: every component rendered with the props and slots the
 * consumer sites (dev.ismaili.de, harleyrentflorida.de, party200, darts) pass
 * today. Later work may not change what these render.
 */
export interface LegacyFixture {
  readonly name: string;
  readonly component: AstroComponentFactory;
  readonly props: Record<string, unknown>;
  readonly slots?: Record<string, string>;
}

const navItems = [
  { label: 'Home', href: '/' },
  { label: 'Leistungen', href: '/leistungen/' },
  { label: 'Blog', href: '/blog/' },
  { label: 'Kontakt', href: '/kontakt/' },
];

const flyoutNavItems = [
  { label: 'Home', href: '/' },
  {
    label: 'Leistungen',
    href: '/leistungen/',
    children: [
      { label: 'Beratung', href: '/leistungen/beratung/' },
      { label: 'Entwicklung', href: '/leistungen/entwicklung/' },
    ],
  },
  { label: 'Extern', href: 'https://example.com/', external: true },
];

const headerProps = {
  siteName: 'Example Site',
  navItems,
  currentLang: 'de',
  pathname: '/',
  alternateHref: '/en/',
  logo: '/logo.png',
  locales: ['de', 'en'],
};

const actionsSlot = { actions: '<a class="site-action" href="/login/">Login</a>' };

function headerVariants(
  name: string,
  component: AstroComponentFactory,
  props: Record<string, unknown>,
): LegacyFixture[] {
  return [
    { name: `${name} with actions slot`, component, props, slots: actionsSlot },
    { name: `${name} without actions slot`, component, props },
  ];
}

const imageItems = [
  { src: '/img/one.jpg', alt: 'One', caption: 'First' },
  { src: '/img/two.jpg', alt: 'Two', href: '/two/' },
];

const gridData = { kind: 'image-grid', title: 'Grid', locale: 'de', translationKey: 'grid', columns: 3, gap: 'md', aspectRatio: 'square', items: imageItems } as const;
const heroSliderData = {
  kind: 'hero-slider', title: 'Slider', locale: 'de', translationKey: 'slider', autoplay: true, interval: 5000, height: 'lg',
  slides: [
    { src: '/img/s1.jpg', alt: 'S1', title: 'Slide 1', subtitle: 'Sub 1', href: '/s1/', cta: 'Mehr' },
    { src: '/img/s2.jpg', alt: 'S2', title: 'Slide 2' },
  ],
} as const;
const carouselData = {
  kind: 'carousel', title: 'Carousel', locale: 'de', translationKey: 'carousel', autoplay: false, interval: 4000, showDots: true, showArrows: true,
  slides: [
    { src: '/img/c1.jpg', alt: 'C1', caption: 'Caption 1' },
    { src: '/img/c2.jpg', alt: 'C2' },
  ],
} as const;
const masonryData = { kind: 'masonry-grid', title: 'Masonry', locale: 'de', translationKey: 'masonry', columns: 3, gap: 'md', items: imageItems } as const;
const featureData = {
  kind: 'feature-highlight', title: 'Features', locale: 'de', translationKey: 'features', gap: 'lg',
  items: [
    { src: '/img/f1.jpg', alt: 'F1', title: 'Feature 1', description: 'About 1', href: '/f1/', cta: 'Los', imagePosition: 'left' },
    { src: '/img/f2.jpg', alt: 'F2', title: 'Feature 2', description: 'About 2' },
  ],
} as const;
const lightboxData = {
  kind: 'lightbox-grid', title: 'Lightbox', locale: 'de', translationKey: 'lightbox', columns: 3, gap: 'md', aspectRatio: 'square',
  items: [
    { src: '/img/l1.jpg', alt: 'L1', title: 'Light 1', description: 'Desc 1' },
    { src: '/img/l2.jpg', alt: 'L2' },
  ],
} as const;

/** Gallery components receive entry.data with the discriminant stripped. */
function galleryProps(data: { kind: string; locale: string; translationKey: string }): Record<string, unknown> {
  const { kind: _kind, locale: _locale, translationKey: _key, ...rest } = data;
  return rest;
}

export const legacyFixtures: readonly LegacyFixture[] = [
  ...headerVariants('Header', Header, { ...headerProps, brandHref: '/' }),
  ...headerVariants('HeaderCentered', HeaderCentered, headerProps),
  ...headerVariants('HeaderHideOnScroll', HeaderHideOnScroll, headerProps),
  ...headerVariants('HeaderFlyout', HeaderFlyout, { ...headerProps, navItems: flyoutNavItems }),
  {
    name: 'PageShell',
    component: PageShell,
    props: {},
    slots: {
      header: '<header>Header slot</header>',
      default: '<p>Body content</p>',
      footer: '<footer>Footer slot</footer>',
    },
  },
  {
    name: 'Footer',
    component: Footer,
    props: {
      siteName: 'Example Site',
      legalLinks: [
        { label: 'Impressum', href: '/impressum/' },
        { label: 'Datenschutz', href: '/datenschutz/' },
      ],
    },
  },
  {
    name: 'Card',
    component: Card,
    props: { title: 'Card title', description: 'Card description', href: '/card/', image: '/img/card.jpg', imageAlt: 'Card image' },
  },
  {
    name: 'BlogPostCard',
    component: BlogPostCard,
    props: {
      title: 'Post title',
      description: 'Post excerpt',
      href: '/blog/post/',
      pubDate: new Date('2025-03-15T12:00:00Z'),
      heroImage: '/img/post.jpg',
      heroImageAlt: 'Post hero',
      locale: 'de',
    },
  },
  {
    name: 'CardGrid',
    component: CardGrid,
    slots: { default: '<div class="child">One</div><div class="child">Two</div>' },
    props: {},
  },
  { name: 'GalleryImageGrid', component: GalleryImageGrid, props: galleryProps(gridData) },
  { name: 'GalleryHeroSlider', component: GalleryHeroSlider, props: galleryProps(heroSliderData) },
  { name: 'GalleryCarousel', component: GalleryCarousel, props: galleryProps(carouselData) },
  { name: 'GalleryMasonryGrid', component: GalleryMasonryGrid, props: galleryProps(masonryData) },
  { name: 'GalleryFeatureHighlight', component: GalleryFeatureHighlight, props: galleryProps(featureData) },
  { name: 'GalleryLightboxGrid', component: GalleryLightboxGrid, props: galleryProps(lightboxData) },
  ...[gridData, heroSliderData, carouselData, masonryData, featureData, lightboxData].map(
    (data): LegacyFixture => ({ name: `GallerySection ${data.kind}`, component: GallerySection, props: { entry: { data } } }),
  ),
  {
    name: 'NotFound',
    component: NotFound,
    props: {
      currentLang: 'de',
      defaultLocale: 'de',
      heading: 'Nichts gefunden',
      message: 'Diese Seite gibt es nicht.',
      image: '/img/404.png',
    },
  },
  {
    name: 'Hero',
    component: Hero,
    props: { title: 'Welcome', subtitle: 'Subtitle', ctaLabel: 'Start', ctaHref: '/start/', variant: 'centered' },
  },
  { name: 'Section', component: Section, props: { title: 'Section title', id: 'sec' }, slots: { default: '<p>Section body</p>' } },
  {
    name: 'CtaSection',
    component: CtaSection,
    props: { heading: 'Join us', body: 'Do it now', buttonLabel: 'Go', buttonHref: '/go/', variant: 'primary' },
  },
  {
    name: 'ContactSection',
    component: ContactSection,
    props: { heading: 'Contact', body: 'Write to us', email: 'info@example.com', buttonLabel: 'Mail us' },
  },
  { name: 'DraftBanner', component: DraftBanner, props: { message: 'Draft content' } },
  { name: 'LanguageNotice', component: LanguageNotice, props: { message: 'Only the German text is binding.' } },
  { name: 'LegalLayout', component: LegalLayout, props: { title: 'Impressum', lastUpdated: '2025-01-01' }, slots: { default: '<p>Legal text</p>' } },
  { name: 'Prose', component: Prose, props: {}, slots: { default: '<h2>Heading</h2><p>Text</p>' } },
  { name: 'ThemeToggle', component: ThemeToggle, props: { label: 'Farbschema wechseln' } },
  { name: 'LanguageSwitch', component: LanguageSwitch, props: { currentLang: 'de', pathname: '/kontakt/', alternateHref: '/en/contact/' } },
  { name: 'UniversalMedia', component: UniversalMedia, props: { src: '/img/public.png', alt: 'Public image', images: {} } },
];
