export type PublishRule = 'missing-date-means-published' | 'missing-date-means-draft';

export function isPublished(
  data: { publishDate?: Date },
  rule: PublishRule,
  now: Date = new Date(),
): boolean {
  if (data.publishDate === undefined) {
    return rule === 'missing-date-means-published';
  }

  return data.publishDate <= now;
}
