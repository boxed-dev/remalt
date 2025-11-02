import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readdirSync, statSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const projectRoot = join(__dirname, '..');
const apiDir = join(projectRoot, 'src', 'app', 'api');

const files = [];

function collectRouteFiles(base) {
  const entries = readdirSync(base);
  for (const entry of entries) {
    const full = join(base, entry);
    const stats = statSync(full);
    if (stats.isDirectory()) {
      collectRouteFiles(full);
      continue;
    }
    if (entry === 'route.ts') {
      files.push(full);
    }
  }
}

collectRouteFiles(apiDir);

const importLine = "import { wrapRouteHandlerWithSentry } from '@sentry/nextjs';";

for (const file of files) {
  let source = readFileSync(file, 'utf8');

  if (source.includes('wrapRouteHandlerWithSentry')) {
    continue;
  }

  const lines = source.split('\n');
  const lastImportIndex = lines.reduce((idx, line, i) => (line.startsWith('import ') ? i : idx), -1);

  if (lastImportIndex >= 0) {
    lines.splice(lastImportIndex + 1, 0, importLine);
  } else {
    lines.unshift(importLine);
  }

  source = lines.join('\n');

  const handlerExports = [];

  source = source.replace(/export\s+async\s+function\s+(\w+)\s*\(/g, (_match, method) => {
    const handlerName = `${method.toLowerCase()}Handler`;
    handlerExports.push({ method, handlerName });
    return `async function ${handlerName}(`;
  });

  if (handlerExports.length === 0) {
    // No async functions matched, skip file modifications to avoid corruption.
    continue;
  }

  let exportBlock = '';
  for (const { method, handlerName } of handlerExports) {
    exportBlock += `\nexport const ${method} = wrapRouteHandlerWithSentry(${handlerName});`;
  }

  if (!source.endsWith('\n')) {
    source += '\n';
  }

  source += `${exportBlock}\n`;

  writeFileSync(file, source, 'utf8');
}

