import * as fs from 'node:fs';
import * as path from 'node:path';

const preview = path.resolve('dist/src/assets/fixtures/event.svg');
if (!fs.existsSync(preview)) {
  throw new Error(`Expected CMS preview artifact at ${preview}`);
}

const eventPage = fs.readFileSync(path.resolve('dist/events/open-day/index.html'), 'utf8');
if (!eventPage.includes('/_astro/')) {
  throw new Error('Expected the normal frontend event image to remain Astro-optimized');
}
