import { assertImplements } from '@easy-web/core/contracts';
import type { Article, Event, Item, Navigation, NotFoundContent, Organization, Page, Person, Product, SiteSettings } from '@easy-web/core/contracts';
import { expectTypeOf } from 'vitest';
import { defineContentType, defineSingleton, field, fieldSets } from './index.js';
import type { InferData } from './index.js';

// Not exported or invoked: tsc checks this body, consumers never execute test code.
function checkContracts() {
    const base = { name: 'entries', label: 'Entries', folder: 'entries', publicFolder: '/img' };
    const eventDef = defineContentType({ ...base, fields: fieldSets.event() });
    const missingStart = defineContentType({ ...base, fields: fieldSets.item() });
    const notFoundDef = defineSingleton({ name: 'notFound', label: '404', file: '404.json', publicFolder: '/img', fields: fieldSets.notFound(['de', 'en']) });
    assertImplements<InferData<typeof eventDef>, Event>();
    // @ts-expect-error An item lacks the Event contract's required startDate.
    assertImplements<InferData<typeof missingStart>, Event>();
    assertImplements<InferData<typeof notFoundDef>, NotFoundContent>();

    const item = defineContentType({ ...base, fields: fieldSets.item() });
    const page = defineContentType({ ...base, fields: fieldSets.page() });
    const article = defineContentType({ ...base, fields: fieldSets.article() });
    const organization = defineContentType({ ...base, fields: fieldSets.organization() });
    const person = defineContentType({ ...base, fields: fieldSets.person() });
    const product = defineContentType({ ...base, fields: fieldSets.product() });
    const navigation = defineSingleton({ name: 'nav', label: 'Nav', file: 'nav.json', fields: fieldSets.navigation(['de', 'en']) });
    const settings = defineSingleton({ name: 'site', label: 'Site', file: 'site.json', fields: fieldSets.siteSettings() });
    assertImplements<InferData<typeof item>, Item>();
    assertImplements<InferData<typeof page>, Page>();
    assertImplements<InferData<typeof article>, Article>();
    assertImplements<InferData<typeof organization>, Organization>();
    assertImplements<InferData<typeof person>, Person>();
    assertImplements<InferData<typeof product>, Product>();
    assertImplements<InferData<typeof navigation>, Navigation>();
    expectTypeOf<InferData<typeof navigation>>().not.toHaveProperty('footerNav');
    expectTypeOf<InferData<typeof navigation>>().not.toHaveProperty('resourceLinks');
    expectTypeOf<InferData<typeof navigation>>().not.toHaveProperty('socialLinks');
    const footer = defineSingleton({ name: 'footer', label: 'Footer', file: 'footer.json', fields: fieldSets.navigation(['de'], { footerNav: true }) });
    expectTypeOf<InferData<typeof footer>>().toHaveProperty('footerNav');
    assertImplements<InferData<typeof settings>, SiteSettings>();
    expectTypeOf<InferData<typeof item>>().toEqualTypeOf<Readonly<Item>>();
    expectTypeOf<InferData<typeof page>>().toEqualTypeOf<Readonly<Page>>();
    expectTypeOf<InferData<typeof article>>().toEqualTypeOf<Readonly<Article>>();
    expectTypeOf<InferData<typeof eventDef>>().toEqualTypeOf<Readonly<Event>>();
    expectTypeOf<InferData<typeof organization>>().toEqualTypeOf<Readonly<Organization>>();
    expectTypeOf<InferData<typeof person>>().toEqualTypeOf<Readonly<Person>>();
    expectTypeOf<InferData<typeof product>>().toEqualTypeOf<Readonly<Product>>();
    expectTypeOf<InferData<typeof settings>>().toEqualTypeOf<Readonly<SiteSettings>>();

    const bilingual = defineContentType({ ...base, fields: fieldSets.item(), locales: ['de', 'en'], publish: 'missing-date-means-draft' });
    const monolingual = defineContentType({ ...base, fields: fieldSets.item(), locales: ['de'] });
    expectTypeOf<InferData<typeof bilingual>['locale']>().toEqualTypeOf<'de' | 'en'>();
    expectTypeOf<InferData<typeof bilingual>['translationKey']>().toEqualTypeOf<string>();
    expectTypeOf<InferData<typeof bilingual>['publishDate']>().toEqualTypeOf<Date | undefined>();
    expectTypeOf<InferData<typeof monolingual>>().not.toHaveProperty('locale');
    expectTypeOf<InferData<typeof item>>().not.toHaveProperty('translationKey');
    const variant = defineContentType({ ...base, fields: [field.string('title', { label: 'Title' })], variants: {
        discriminator: 'kind', label: 'Kind', options: {
            event: { label: 'Event', fields: [field.date('startDate', { label: 'Start' })] },
            news: { label: 'News', fields: [field.string('summary', { label: 'Summary' })] },
        },
    } });
    type Data = InferData<typeof variant>;
    expectTypeOf<Data>().toEqualTypeOf<
        { readonly title: string; readonly kind: 'event'; readonly startDate: Date }
        | { readonly title: string; readonly kind: 'news'; readonly summary: string }
    >();
    // @ts-expect-error Event variants require startDate, not a news summary.
    const invalid: Data = { title: 'Title', kind: 'event', summary: 'Wrong variant' };
    void invalid;
    void [eventDef, missingStart, notFoundDef, item, page, article, organization, person, product,
        navigation, settings, footer, bilingual, monolingual, variant];
}
void checkContracts;
