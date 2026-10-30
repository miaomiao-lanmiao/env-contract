import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const files = readdirSync('src').filter(name => name.endsWith('.ts'));
const prohibited = [
  /\beval\s*\(/, /\bnew\s+Function\s*\(/, /\b(?:fetch|WebSocket|XMLHttpRequest)\s*\(/,
  /['"](?:node:)?(?:child_process|http|https|http2|net|tls|dgram|dns)['"]/, /process\.env/,
  /process\.loadEnvFile/, /shell\s*:\s*true/,
];
for (const file of files) {
  const source = readFileSync(join('src', file), 'utf8');
  for (const pattern of prohibited) assert.equal(pattern.test(source), false, `${file}: disallowed runtime behavior`);
}
const manifest = JSON.parse(readFileSync('package.json', 'utf8'));
assert.equal(Object.keys(manifest.dependencies ?? {}).length, 0);
for (const pin of Object.values(manifest.devDependencies)) assert.match(pin, /^\d+\.\d+\.\d+$/);
const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'));
for (const [name, entry] of Object.entries(lock.packages)) {
  if (!name) continue;
  assert.ok(entry.resolved?.startsWith('https://registry.npmjs.org/'));
  assert.ok(entry.integrity);
  assert.ok(!entry.hasInstallScript);
}
console.log(`Static checks passed for ${files.length} runtime modules and locked development dependencies. This is not a security guarantee.`);
