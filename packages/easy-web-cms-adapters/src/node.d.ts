declare module 'node:fs/promises' {
  function writeFile(path: string, data: string, encoding: string): Promise<void>;
  function access(path: string, mode?: number): Promise<void>;
  export { writeFile, access };
}
