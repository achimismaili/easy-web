import {
  defineContentType,
  defineSingleton,
  field,
  fieldSets,
  type InferData,
} from '@easy-web/cms-adapters';
import {
  assertImplements,
  type Article,
  type Event,
  type HasImage,
  type HasPhotos,
  type Organization,
} from '@easy-web/core/contracts';

const media = {
  mediaFolder: 'src/assets/fixtures',
  publicFolder: '/src/assets/fixtures',
} as const;

const [eventTitle, eventDescription, , eventOrder, ...eventDates] = fieldSets.event();

export const events = defineContentType({
  name: 'events',
  label: 'Veranstaltungen',
  folder: 'src/content/events',
  ...media,
  fields: [
    eventTitle,
    eventDescription,
    field.image('image', { label: 'Bild', alt: 'required' }),
    eventOrder,
    ...eventDates,
    field.images('photos', { label: 'Fotos', labelSingular: 'Foto' }),
  ],
});

export const news = defineContentType({
  name: 'news',
  label: 'Neuigkeiten',
  folder: 'src/content/news',
  publish: 'missing-date-means-draft',
  ...media,
  fields: [...fieldSets.article(), field.body()],
});

export const sponsors = defineContentType({
  name: 'sponsors',
  label: 'Sponsoren',
  folder: 'src/content/sponsors',
  ...media,
  fields: fieldSets.organization(),
});

export const pages = defineContentType({
  name: 'pages',
  label: 'Seiten',
  folder: 'src/content/pages',
  locales: ['de', 'en'],
  ...media,
  fields: [...fieldSets.page(), field.body()],
});

export const navigation = defineSingleton({
  name: 'navigation',
  label: 'Navigation',
  file: 'src/content/siteConfig/navigation.json',
  fields: fieldSets.navigation(['de', 'en'], { footerNav: true, socialLinks: true }),
});

export const site = defineSingleton({
  name: 'site',
  label: 'Website',
  file: 'src/content/siteConfig/site.json',
  fields: [
    ...fieldSets.siteSettings(),
    field.number('founded', { label: 'Gründungsjahr', min: 1900 }),
    field.boolean('featured', { label: 'Hervorgehoben', default: true }),
    field.color('accent', { label: 'Akzentfarbe', default: '#3355aa' }),
    field.select('audience', { label: 'Zielgruppe', options: ['public', 'members'], default: 'public' }),
  ],
});

export const notFound = defineSingleton({
  name: 'notFound',
  label: 'Nicht gefunden',
  file: 'src/content/siteConfig/notFound.json',
  ...media,
  fields: fieldSets.notFound(['de', 'en']),
});

export const contentTypes = [events, news, sponsors, pages] as const;
export const singletons = [navigation, site, notFound] as const;

assertImplements<InferData<typeof events>, Event & HasImage & HasPhotos>();
assertImplements<InferData<typeof news>, Article>();
assertImplements<InferData<typeof sponsors>, Organization>();
