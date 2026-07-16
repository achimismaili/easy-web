// Plugin implementation will be added in T6.
// Export a no-op stub so the package typechecks and builds cleanly.
import type { Plugin } from 'unified';

const easyWebMarkdown: Plugin = () => () => {};
export default easyWebMarkdown;
