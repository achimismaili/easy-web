import { describe, it, expect } from 'vitest'
import { theme } from '../index.js'

describe('theme', () => {
  it('light.bg differs from dark.bg', () => {
    expect(theme.light.bg).not.toBe(theme.dark.bg)
  })
  it('both palettes have same keys', () => {
    expect(Object.keys(theme.light).sort()).toEqual(Object.keys(theme.dark).sort())
  })
})
