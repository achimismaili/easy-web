import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Run test files sequentially (not in parallel) — the test suite shares
    // test/fixtures/ as a write target; parallel file execution on Windows causes
    // race conditions where two beforeAll hooks copy to the same path simultaneously.
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
});
