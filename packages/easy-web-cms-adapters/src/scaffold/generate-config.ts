import { writeFile, access } from 'node:fs/promises';

export interface DecapConfigOptions {
  tenantId: string;
  appId: string;
  adoOrg: string;
  adoProject: string;
  adoRepo: string;
  branch?: string;
  locales?: string[];
}

export interface DecapConfigWriteOptions extends DecapConfigOptions {
  outputPath: string;
}

export interface DecapConfigWriteResult {
  success: boolean;
  content: string;
  error?: string;
}

function buildBlogCollection(locale: string): string {
  return (
    `  - label: "Blog (${locale})"\n` +
    `    name: blog_${locale}\n` +
    `    folder: "src/content/blog/${locale}"\n` +
    `    create: true\n` +
    `    format: frontmatter\n` +
    `    fields:\n` +
    `      - { name: title,          label: Title,             widget: string }\n` +
    `      - { name: description,    label: Description,       widget: text }\n` +
    `      - { name: pubDate,        label: "Publish Date",    widget: datetime }\n` +
    `      - { name: draft,          label: Draft,             widget: boolean, default: false }\n` +
    `      - { name: locale,         label: Locale,            widget: hidden,  default: "${locale}" }\n` +
    `      - { name: translationKey, label: "Translation Key", widget: string }\n` +
    `      - { name: heroImage,      label: "Hero Image",      widget: image,   required: false }`
  );
}

export function generateDecapConfigString(options: DecapConfigOptions): string {
  const {
    tenantId,
    appId,
    adoOrg,
    adoProject,
    adoRepo,
    branch = 'main',
    locales = ['de', 'en'],
  } = options;

  const blogCollections = locales.map(buildBlogCollection).join('\n\n');
  const localeOptions = locales.map((l) => `"${l}"`).join(', ');

  return [
    `backend:`,
    `  name: azure`,
    `  repo: ${adoOrg}/${adoProject}/${adoRepo}`,
    `  tenant_id: ${tenantId}`,
    `  app_id: ${appId}`,
    `  branch: ${branch}`,
    ``,
    `media_folder: "src/assets/images"`,
    `public_folder: "../../assets/images"`,
    ``,
    `collections:`,
    blogCollections,
    ``,
    `  - label: Pages`,
    `    name: pages`,
    `    folder: "src/content/pages"`,
    `    create: true`,
    `    format: frontmatter`,
    `    fields:`,
    `      - { name: title,          label: Title,             widget: string }`,
    `      - { name: description,    label: Description,       widget: text }`,
    `      - { name: locale,         label: Locale,            widget: select, options: [${localeOptions}] }`,
    `      - { name: translationKey, label: "Translation Key", widget: string }`,
    ``,
    `  - label: "Site Config"`,
    `    name: site_config`,
    `    files:`,
    `      - label: Company`,
    `        name: company`,
    `        file: "src/content/data/company.json"`,
    `        fields:`,
    `          - { name: companyName,  label: "Company Name",  widget: string }`,
    `          - { name: defaultTitle, label: "Default Title", widget: string }`,
    `          - { name: url,          label: URL,             widget: string }`,
    ``,
  ].join('\n');
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function generateDecapConfig(
  options: DecapConfigWriteOptions,
): Promise<DecapConfigWriteResult> {
  const { outputPath, ...configOptions } = options;
  const content = generateDecapConfigString(configOptions);

  if (await fileExists(outputPath)) {
    return { success: false, content, error: `File already exists at ${outputPath}` };
  }

  try {
    await writeFile(outputPath, content, 'utf-8');
    return { success: true, content };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { success: false, content, error: `Failed to write file: ${message}` };
  }
}
