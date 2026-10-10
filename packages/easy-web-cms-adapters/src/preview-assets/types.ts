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
  '.avif', '.gif', '.jpeg', '.jpg', '.png', '.svg', '.webp',
]);

export const RASTER_EXTENSIONS = new Set([
  '.avif', '.jpeg', '.jpg', '.png', '.webp',
]);

export const MAX_INPUT_BYTES = 25 * 1024 * 1024;
export const MAX_OUTPUT_BYTES = 5 * 1024 * 1024;
