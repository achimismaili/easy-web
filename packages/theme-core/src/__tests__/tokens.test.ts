import { describe, it, expect } from 'vitest';
import { tokens } from '../tokens.js';

describe('tokens', () => {
  it('color.surface is a CSS var string', () => {
    expect(tokens.color.surface).toBe('var(--ew-surface)');
  });
  it('color.primary is a CSS var string', () => {
    expect(tokens.color.primary).toBe('var(--ew-primary)');
  });
  it('space.4 is a CSS var string', () => {
    expect(tokens.space[4]).toBe('var(--ew-space-4)');
  });
  it('radius.md is a CSS var string', () => {
    expect(tokens.radius.md).toBe('var(--ew-radius-md)');
  });
  it('color.danger is a CSS var string', () => {
    expect(tokens.color.danger).toBe('var(--ew-danger)');
  });
  it('font.sans is a CSS var string', () => {
    expect(tokens.font.sans).toBe('var(--ew-font-sans)');
  });
  it('text.base is a CSS var string', () => {
    expect(tokens.text.base).toBe('var(--ew-text-base)');
  });
  it('leading.normal is a CSS var string', () => {
    expect(tokens.leading.normal).toBe('var(--ew-leading-normal)');
  });
  // Token-name stability snapshot
  it('token keys are stable (snapshot)', () => {
    const allKeys = JSON.stringify(tokens, null, 2);
    expect(allKeys).toMatchSnapshot();
  });
});
