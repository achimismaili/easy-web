import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { AstroConfig } from 'astro';
import { normalizeLocalizedPath, toServedPath } from '../i18n/index.js';

interface RenderedPage {
    readonly url: string;
    readonly locale: string;
    readonly alternates: ReadonlyMap<string, string>;
}

function decodeHtml(value: string): string {
    return value.replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&#39;', "'").replaceAll('&lt;', '<').replaceAll('&gt;', '>');
}

function decodeXml(value: string): string {
    return decodeHtml(value);
}

function escapeXml(value: string): string {
    return value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function attributes(tag: string): Map<string, string> {
    const values = new Map<string, string>();
    for (const match of tag.matchAll(/([^\s=]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) {
        values.set(match[1]!.toLowerCase(), decodeHtml(match[2] ?? match[3] ?? ''));
    }
    return values;
}

function canonicalOf(html: string): string | undefined {
    let canonical: string | undefined;
    for (const tag of html.matchAll(/<link\b[^>]*>/gi)) {
        const attrs = attributes(tag[0]);
        if (attrs.get('rel')?.toLowerCase() !== 'canonical') continue;
        const href = attrs.get('href');
        if (!href) throw new Error('Rendered canonical link is missing href');
        if (canonical) throw new Error('Rendered HTML page has multiple canonical links');
        canonical = href;
    }
    return canonical;
}

function renderedAlternates(html: string): Map<string, string> {
    const alternates = new Map<string, string>();
    for (const tag of html.matchAll(/<link\b[^>]*>/gi)) {
        const attrs = attributes(tag[0]);
        if (attrs.get('rel')?.toLowerCase() !== 'alternate') continue;
        const language = attrs.get('hreflang');
        const href = attrs.get('href');
        if (!language || !href) continue;
        if (alternates.has(language)) throw new Error(`Duplicate rendered hreflang "${language}"`);
        alternates.set(language, href);
    }
    return alternates;
}

async function htmlFiles(directory: string, parent = ''): Promise<string[]> {
    const files: string[] = [];
    for (const entry of await readdir(join(directory, parent), { withFileTypes: true })) {
        const path = parent ? `${parent}${sep}${entry.name}` : entry.name;
        if (entry.isDirectory()) files.push(...await htmlFiles(directory, path));
        else if (entry.isFile() && entry.name.endsWith('.html')) files.push(path);
    }
    return files;
}

function absoluteUrl(value: string, config: AstroConfig, label: string): URL {
    const site = new URL(config.site!);
    const url = new URL(value, site);
    if (url.origin !== site.origin) throw new Error(`${label} must use the configured site origin: ${value}`);
    if (url.username || url.password || url.search || url.hash) {
        throw new Error(`${label} must not contain credentials, a query string or a fragment: ${value}`);
    }
    const base = normalizeLocalizedPath(config.base);
    if (base !== '/' && url.pathname !== base && !url.pathname.startsWith(`${base}/`)) {
        throw new Error(`${label} is outside the configured base path "${base}": ${value}`);
    }
    return url;
}

function servedUrlForHtml(file: string, config: AstroConfig): string {
    const segments = file.split(sep);
    const last = segments.at(-1)!;
    if (last === 'index.html') segments.pop();
    else if (last.endsWith('.html')) segments[segments.length - 1] = last.slice(0, -5);
    const route = normalizeLocalizedPath(segments.join('/'));
    const base = normalizeLocalizedPath(config.base);
    const withoutPhysicalBase = base !== '/' && (route === base || route.startsWith(`${base}/`))
        ? route.slice(base.length) || '/'
        : route;
    const pathname = `${base === '/' ? '' : base}${withoutPhysicalBase}`;
    const style = config.trailingSlash === 'never'
        || (config.trailingSlash === 'ignore' && config.build.format === 'file')
        ? 'never'
        : 'always';
    const site = new URL(config.site!);
    return new URL(toServedPath(pathname, style), site).href;
}

function localeFromHtml(html: string, file: string): string {
    const tag = /<html\b[^>]*>/i.exec(html)?.[0];
    const locale = tag ? attributes(tag).get('lang') : undefined;
    if (!locale) throw new Error(`Rendered HTML page is missing <html lang>: ${file}`);
    return locale;
}

function sitemapUrlBlocks(xml: string, file: string): Map<string, string> {
    const blocks = new Map<string, string>();
    for (const match of xml.matchAll(/<url\b[^>]*>[\s\S]*?<\/url>/g)) {
        const location = /<loc>([\s\S]*?)<\/loc>/.exec(match[0])?.[1];
        if (!location) throw new Error(`Sitemap entry in ${file} is missing <loc>`);
        const url = decodeXml(location.trim());
        if (blocks.has(url)) throw new Error(`Duplicate sitemap URL: ${url}`);
        blocks.set(url, match[0]);
    }
    return blocks;
}

/**
 * Reconciles sitemap alternates with rendered pages only when explicitly enabled.
 * Rendered head links are validated against built canonicals before changing XML.
 */
export async function synchronizeRenderedSitemapAlternates(
    outputDirectory: URL,
    config: AstroConfig,
    locales: readonly string[],
    defaultLocale: string,
): Promise<void> {
    const root = fileURLToPath(outputDirectory);
    const pages = new Map<string, RenderedPage>();
    for (const file of await htmlFiles(root)) {
        const html = await readFile(join(root, file), 'utf8');
        const canonical = canonicalOf(html);
        if (!canonical) continue;
        const url = absoluteUrl(canonical, config, `Canonical in ${file}`).href;
        const expected = servedUrlForHtml(relative(root, join(root, file)), config);
        if (url !== expected) throw new Error(`Rendered canonical does not match built page ${file}: expected ${expected}, got ${url}`);
        const page: RenderedPage = { url, locale: localeFromHtml(html, file), alternates: renderedAlternates(html) };
        if (pages.has(url)) throw new Error(`Multiple built HTML files share the canonical URL: ${url}`);
        pages.set(url, page);
    }

    const groups = new Map<string, readonly { readonly lang: string; readonly href: string }[]>();
    for (const page of pages.values()) {
        const declared = [...page.alternates].filter(([lang]) => lang !== 'x-default');
        if (declared.length === 1) {
            throw new Error(`Rendered alternates for ${page.url} must include at least two locales`);
        }
        if (declared.length < 2) continue;
        if (!locales.includes(page.locale)) throw new Error(`Rendered page ${page.url} has unconfigured lang="${page.locale}"`);
        const links = declared.map(([lang, href]) => {
            if (!locales.includes(lang)) throw new Error(`Rendered hreflang "${lang}" on ${page.url} is not a configured locale`);
            const target = absoluteUrl(href, config, `Rendered hreflang "${lang}" on ${page.url}`).href;
            const targetPage = pages.get(target);
            if (!targetPage) throw new Error(`Rendered hreflang "${lang}" points to no built canonical page: ${target}`);
            if (targetPage.locale !== lang) throw new Error(`Rendered hreflang "${lang}" points to a page with lang="${targetPage.locale}": ${target}`);
            return { lang, href: target };
        });
        if (!links.some(({ lang }) => lang === page.locale)) {
            throw new Error(`Rendered alternates for ${page.url} omit its own locale "${page.locale}"`);
        }
        if (links.find(({ lang }) => lang === page.locale)?.href !== page.url) {
            throw new Error(`Rendered hreflang "${page.locale}" must point to its own canonical URL: ${page.url}`);
        }
        for (const link of links) {
            const targetPage = pages.get(link.href)!;
            if (targetPage.alternates.get(page.locale) !== page.url) {
                throw new Error(`Rendered hreflang group is not reciprocal between ${page.url} and ${link.href}`);
            }
            const targetAlternates = [...targetPage.alternates].filter(([lang]) => lang !== 'x-default');
            if (targetAlternates.length !== links.length
                || links.some(({ lang, href }) => targetPage.alternates.get(lang) !== href)) {
                throw new Error(`Rendered hreflang group is inconsistent between ${page.url} and ${link.href}`);
            }
        }
        const defaultHref = page.alternates.get('x-default');
        if (defaultHref) {
            const target = absoluteUrl(defaultHref, config, 'Rendered x-default alternate').href;
            const targetPage = pages.get(target);
            if (!targetPage || targetPage.locale !== defaultLocale) {
                throw new Error(`Rendered x-default must point to a built ${defaultLocale} page: ${target}`);
            }
        }
        groups.set(page.url, links);
    }

    const files = (await readdir(root, { withFileTypes: true }))
        .filter((entry) => entry.isFile() && /^sitemap-\d+\.xml$/.test(entry.name))
        .map((entry) => entry.name);
    if (files.length === 0) {
        if (groups.size > 0) throw new Error('Rendered hreflang groups exist but no numbered sitemap was built');
        return;
    }
    const sitemapLocations = new Set<string>();
    const sitemapBlocks = new Map<string, Map<string, string>>();
    for (const file of files) {
        const xml = await readFile(join(root, file), 'utf8');
        const blocks = sitemapUrlBlocks(xml, file);
        for (const url of blocks.keys()) {
            if (sitemapLocations.has(url)) throw new Error(`Sitemap URL appears more than once: ${url}`);
            sitemapLocations.add(url);
        }
        sitemapBlocks.set(file, blocks);
    }
    for (const [url, links] of groups) {
        if (!sitemapLocations.has(url)) throw new Error(`Rendered alternate page is excluded from the sitemap: ${url}`);
        for (const link of links) {
            if (!sitemapLocations.has(link.href)) throw new Error(`Rendered alternate target is excluded from the sitemap: ${link.href}`);
        }
    }
    for (const file of files) {
        const path = join(root, file);
        let xml = await readFile(path, 'utf8');
        const blocks = sitemapBlocks.get(file)!;
        for (const [url, existing] of blocks) {
            if (!pages.has(url)) continue;
            const replaced = existing.replace(/<xhtml:link\b[^>]*\/>/g, '');
            const tags = (groups.get(url) ?? []).map(({ lang, href }) =>
                `<xhtml:link rel="alternate" hreflang="${escapeXml(lang)}" href="${escapeXml(href)}"/>`,
            ).join('');
            const updated = replaced.replace('</url>', `${tags}</url>`);
            xml = xml.replace(existing, updated);
            blocks.set(url, updated);
            if (!xml.includes(escapeXml(url))) throw new Error(`Updated sitemap no longer contains ${url}`);
        }
        await writeFile(path, xml);
    }
}
