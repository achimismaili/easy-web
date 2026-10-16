import type { APIRoute } from 'astro';
import { readBuildInfo, serializeBuildInfo } from '../build-info-manifest.js';

export const prerender = true;

export const GET: APIRoute = () => new Response(serializeBuildInfo(readBuildInfo()), {
    headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'X-Robots-Tag': 'noindex, nofollow',
    },
});
