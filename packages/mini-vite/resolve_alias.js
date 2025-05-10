import path from "node:path";
import { fileURLToPath } from "node:url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default function resolveAlias(aliasConf, jsPath, jsContent) {
  // target: C:\Users\usr16\tiny-vite\src'
  console.log("jsPath", jsPath); // C:\Users\usr16\tiny-vite\src\main.js
  const entries = Object.entries(aliasConf);
  // '@': path.resolve(__dirname, 'src')
  let resolvedContent;
  entries.forEach(([alias, target]) => {
    const relativePath = path.relative(target, path.dirname(jsPath));
    console.log("relativePath", relativePath); // main.js
    resolvedContent = jsContent.replaceAll(alias, relativePath + ".");
  });
  return resolvedContent;
}
