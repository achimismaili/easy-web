export type CmsPreviewAssetFolder = {
  readonly source: string;
  readonly publicPath: string;
};

export type CmsPreviewAssetOptions = {
  readonly folders: readonly CmsPreviewAssetFolder[];
};

export type PreviewAssetMapping = CmsPreviewAssetFolder & {
  readonly projectRoot: string;
  readonly sourceRoot: string;
};

export const BROWSER_IMAGE_EXTENSIONS = new Set([
  '.gif', '.jpeg', '.jpg', '.png', '.svg', '.webp',
]);

export const RASTER_EXTENSIONS = new Set([
  '.jpeg', '.jpg', '.png', '.webp',
]);

export const MAX_PREVIEW_FILES = 500;
export const MAX_INPUT_BYTES = 10 * 1024 * 1024;
export const MAX_AGGREGATE_INPUT_BYTES = 100 * 1024 * 1024;
export const PREVIEW_MANIFEST = '.easy-web-cms-preview-assets.json';
