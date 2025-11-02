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

for (const file of files) {
  let source = readFileSync(file, 'utf8');

  // Remove malformed import line if it exists
  const lines = source.split('\n');
  const fixedLines = lines.filter(line =>
    !line.includes("import { wrapRouteHandlerWithSentry } from '@sentry/nextjs';")
  );

  source = fixedLines.join('\n');

  writeFileSync(file, source, 'utf8');
  console.log(`Fixed: ${file}`);
}

console.log(`\nFixed ${files.length} files`);
