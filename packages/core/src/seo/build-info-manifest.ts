import { z } from 'astro/zod';

const packageIdSchema = z.enum(['core', 'auth', 'cms-adapters', 'swa']);
const publicLabelSchema = z.string().min(1).max(120)
    .refine((value) => value === value.trim() && !/[\p{Cc}\p{Cf}\p{Cs}\p{Zl}\p{Zp}]/u.test(value), 'must be trimmed printable text');

export const buildInfoOptionsSchema = z.strictObject({
    site: publicLabelSchema,
    packages: z.array(packageIdSchema).readonly().optional(),
    releaseId: publicLabelSchema.optional(),
    json: z.boolean().optional(),
}).readonly();

export type BuildInfoPackageId = z.infer<typeof packageIdSchema>;
export type BuildInfoOptions = z.infer<typeof buildInfoOptionsSchema>;

export const exactVersionSchema = z.string().regex(
    /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*)?(?:\+[0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*)?$/,
);

const manifestSchema = z.strictObject({
    schema: z.literal('easy-web/build-info'),
    schemaVersion: z.literal(1),
    site: publicLabelSchema,
    releaseId: publicLabelSchema.optional(),
    easyWeb: z.strictObject({
        version: exactVersionSchema,
        packages: z.array(packageIdSchema).readonly(),
    }).readonly(),
}).readonly();

export type BuildInfoManifest = z.infer<typeof manifestSchema>;

export class BuildInfoError extends Error {
    constructor(readonly detail: string) {
        super(`@easy-web/core: buildInfo ${detail}`);
        this.name = 'BuildInfoError';
    }
}

export function serializeBuildInfo(manifest: BuildInfoManifest): string {
    return `${JSON.stringify(manifest)}\n`;
}

export function readBuildInfo(): BuildInfoManifest {
    const serialized = process.env.EASY_WEB_SEO_BUILD_INFO;
    if (!serialized) throw new BuildInfoError('manifest is unavailable; enable easyWebSeo({ buildInfo }).');
    return manifestSchema.parse(JSON.parse(serialized));
}
