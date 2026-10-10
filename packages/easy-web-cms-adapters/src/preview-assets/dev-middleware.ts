import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import type { PreviewAssetMapping } from './types.js';
import { ownsRequest, resolvePreviewRequest } from './resolver.js';

const MIME_TYPES: Readonly<Record<string, string>> = {
  '.avif': 'image/avif', '.gif': 'image/gif', '.jpeg': 'image/jpeg', '.jpg': 'image/jpeg',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp',
};

type Request = { readonly url?: string };
type Response = {
  statusCode: number;
  setHeader(name: string, value: string): void;
  write(chunk: Buffer): void;
  end(chunk?: string): void;
};
type Next = () => void;

function requestPath(url: string): string {
  return url.split(/[?#]/, 1)[0] ?? '';
}

export function createPreviewMiddleware(root: string, mappings: readonly PreviewAssetMapping[]) {
  return async (request: Request, response: Response, next: Next): Promise<void> => {
    const pathname = requestPath(request.url ?? '');
    const mapping = mappings.find((candidate) => ownsRequest(candidate.publicPath, pathname));
    if (!mapping) {
      next();
      return;
    }
    const filePath = await resolvePreviewRequest(root, mapping, pathname);
    if (filePath === null) {
      response.statusCode = 404;
      response.end('Not Found');
      return;
    }
    const contentType = MIME_TYPES[path.extname(filePath).toLowerCase()];
    if (!contentType) {
      response.statusCode = 404;
      response.end('Not Found');
      return;
    }
    response.statusCode = 200;
    response.setHeader('Content-Type', contentType);
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Cache-Control', 'no-store');
    response.write(await fs.readFile(filePath));
    response.end();
  };
}
