import { describe, expect, expectTypeOf, it } from 'vitest';
import { assertImplements } from '../implements.js';
import type {
  AnyImage,
  Article,
  DecorativeImage,
  Event,
  Image,
  Item,
  Link,
  Localized,
  NavItem,
  Navigation,
  NotFoundContent,
  NotFoundEntry,
  Organization,
  Page,
  Person,
  Product,
  SiteSettings,
  SocialLink,
} from '../types.js';
import type {
  HasBody,
  HasImage,
  HasPhotos,
  Linkable,
  Rendered,
  RenderedContent,
} from '../capabilities.js';

describe('content contract types', () => {
  it('exposes every content and capability contract', () => {
    expectTypeOf<Image>().toMatchTypeOf<AnyImage>();
    expectTypeOf<DecorativeImage>().toMatchTypeOf<AnyImage>();
    expectTypeOf<NavItem>().toMatchTypeOf<Link>();
    expectTypeOf<Page>().toMatchTypeOf<Item>();
    expectTypeOf<Article>().toMatchTypeOf<Item>();
    expectTypeOf<Event>().toMatchTypeOf<Item>();
    expectTypeOf<Product>().toMatchTypeOf<Item>();
    expectTypeOf<Rendered<Item>>().toMatchTypeOf<Item & HasBody>();
    expectTypeOf<HasImage['image']>().toEqualTypeOf<Image>();
    expectTypeOf<HasPhotos['photos']>().toEqualTypeOf<Image[]>();
    expectTypeOf<Linkable['href']>().toEqualTypeOf<string>();
    expectTypeOf<HasBody['Content']>().toEqualTypeOf<RenderedContent>();
    expectTypeOf<Localized<string>>().toEqualTypeOf<Readonly<Record<string, string>>>();

    expectTypeOf<Navigation>().toBeObject();
    expectTypeOf<SiteSettings>().toBeObject();
    expectTypeOf<NotFoundEntry>().toBeObject();
    expectTypeOf<NotFoundContent>().toBeObject();
    expectTypeOf<SocialLink>().toBeObject();
    expectTypeOf<Organization>().toBeObject();
    expectTypeOf<Person>().toBeObject();
  });

  it('keeps assertImplements as a runtime no-op', () => {
    expect(assertImplements<{ title: string; startDate: Date }, Event>()).toBeUndefined();
  });
});
