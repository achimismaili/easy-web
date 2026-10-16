import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// Given a real static Astro build, compare independent artifact expectations.
const core = JSON.parse(readFileSync(new URL('../../../packages/core/package.json', import.meta.url), 'utf8'));
const expected = `{"schema":"easy-web/build-info","schemaVersion":1,"site":"Contract fixture","releaseId":"fixture-release","easyWeb":{"version":"${core.version}","packages":["cms-adapters","core"]}}\n`;
const json = readFileSync('dist/version.json', 'utf8');
const html = readFileSync('dist/version/index.html', 'utf8');
const robots = readFileSync('dist/robots.txt', 'utf8');
const sitemap = readFileSync('dist/sitemap-0.xml', 'utf8');

// Then machine output is exact, and the standalone human route is static and accessible.
assert.equal(json, expected);
assert.match(html, /<html lang="en"/);
assert.match(html, /<meta name="robots" content="noindex,nofollow"/);
assert.match(html, /<main[ >]/);
assert.match(html, /<h1[^>]*>Build information<\/h1>/);
assert.match(html, /ew-hero/);
assert.match(html, /ew-section/);
for (const value of ['Contract fixture', 'fixture-release', core.version, '@easy-web/cms-adapters', '@easy-web/core']) assert.ok(html.includes(value));
assert.doesNotMatch(html, /<script|astro-island|client:/);
assert.doesNotMatch(robots, /Disallow: \/version/);
assert.match(robots, /Allow: \/\n/);
assert.doesNotMatch(sitemap, /\/version(?:[/.<])/);
assert.match(sitemap, /https:\/\/fixture.example.com\//);
console.log('Build-info static artifacts passed.');
