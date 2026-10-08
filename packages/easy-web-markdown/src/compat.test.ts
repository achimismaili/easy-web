import { describe, expect, it } from 'vitest';
import coreMarkdown from '@easy-web/core/markdown';
import easyWebMarkdown from './index.js';

describe('@easy-web/markdown compatibility export', () => {
  it('re-exports the core remark plugin by identity', () => {
    expect(easyWebMarkdown).toBe(coreMarkdown);
  });
});
