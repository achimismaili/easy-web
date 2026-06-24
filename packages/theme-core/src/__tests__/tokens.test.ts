import { describe, it, expect } from 'vitest';
import { tokens } from '../tokens.js';
import { breakpoints } from '../breakpoints.js';

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
  it('shadow.md is a CSS var string', () => {
    expect(tokens.shadow.md).toBe('var(--ew-shadow-md)');
  });
  it('shadow.inner is a CSS var string', () => {
    expect(tokens.shadow.inner).toBe('var(--ew-shadow-inner)');
  });
  it('motion.duration.fast is a CSS var string', () => {
    expect(tokens.motion.duration.fast).toBe('var(--ew-duration-fast)');
  });
  it('motion.ease.spring is a CSS var string', () => {
    expect(tokens.motion.ease.spring).toBe('var(--ew-ease-spring)');
  });
  it('zIndex.modal is a CSS var string', () => {
    expect(tokens.zIndex.modal).toBe('var(--ew-z-modal)');
  });
  it('zIndex.toast is a CSS var string', () => {
    expect(tokens.zIndex.toast).toBe('var(--ew-z-toast)');
  });
  // Token-name stability snapshot
  it('token keys are stable (snapshot)', () => {
    const allKeys = JSON.stringify(tokens, null, 2);
    expect(allKeys).toMatchSnapshot();
  });
});

describe('breakpoints', () => {
  it('breakpoints.sm is 640', () => {
    expect(breakpoints.sm).toBe(640);
  });
  it('breakpoints.lg is 1024', () => {
    expect(breakpoints.lg).toBe(1024);
  });
  it('breakpoints.2xl is 1536', () => {
    expect(breakpoints['2xl']).toBe(1536);
  });
  it('breakpoints are raw numbers, not CSS vars', () => {
    expect(typeof breakpoints.md).toBe('number');
  });
});
