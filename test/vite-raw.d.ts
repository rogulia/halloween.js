// Minimal ambient typing for Vite/Vitest's built-in "?raw" import suffix
// (loads a file's contents as a plain string) — the project has no
// "vite/client" types wired in, so this covers just the one import form
// used by test/demo.test.ts.
declare module "*?raw" {
  const content: string;
  export default content;
}
