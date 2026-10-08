import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { toAstroSchema } from '@easy-web/cms-adapters';
import { events, navigation, news, notFound, pages, site, sponsors } from './content/model';

export const collections = {
  events: defineCollection({
    loader: glob({ pattern: '**/*.md', base: './src/content/events' }),
    schema: toAstroSchema(events),
  }),
  news: defineCollection({
    loader: glob({ pattern: '**/*.md', base: './src/content/news' }),
    schema: toAstroSchema(news),
  }),
  sponsors: defineCollection({
    loader: glob({ pattern: '**/*.json', base: './src/content/sponsors' }),
    schema: toAstroSchema(sponsors),
  }),
  pages: defineCollection({
    loader: glob({ pattern: '**/*.md', base: './src/content/pages' }),
    schema: toAstroSchema(pages),
  }),
  navigation: defineCollection({
    loader: glob({ pattern: 'navigation.json', base: './src/content/siteConfig' }),
    schema: toAstroSchema(navigation),
  }),
  site: defineCollection({
    loader: glob({ pattern: 'site.json', base: './src/content/siteConfig' }),
    schema: toAstroSchema(site),
  }),
  notFound: defineCollection({
    loader: glob({ pattern: 'notFound.json', base: './src/content/siteConfig' }),
    schema: toAstroSchema(notFound),
  }),
};
