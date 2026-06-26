import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
  site: 'https://achimismaili.github.io',
  base: '/easy-web',
  integrations: [
    starlight({
      title: 'easy-web',
      description: 'Baseline @achimismaili/easy-web-* package family — shared library for the ismaili.de web ecosystem',
      social: {
        github: 'https://github.com/achimismaili/easy-web',
      },
      sidebar: [
        {
          label: 'Getting Started',
          items: [
            { label: 'Introduction', link: '/easy-web/' },
            { label: 'Installation', slug: 'getting-started/installation' },
            { label: 'Create a New Site', slug: 'getting-started/create-new-site' },
          ],
        },
        {
          label: 'Packages',
          autogenerate: { directory: 'packages' },
        },
        {
          label: 'Architecture',
          autogenerate: { directory: 'architecture' },
        },
        {
          label: 'Playground',
          autogenerate: { directory: 'playground' },
        },
      ],
    }),
  ],
});
