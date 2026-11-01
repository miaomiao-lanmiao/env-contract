import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { parseStrictJson } from '../dist/json.js';

const cli = resolve('dist/cli.js');
test('duplicate JSON properties are rejected without revealing contract contents', t => {
  const temporary = mkdtempSync(join(tmpdir(), 'env contract duplicate '));
  t.after(() => rmSync(temporary, { recursive: true, force: true }));
  const definition = join(temporary, 'contract.json');
  const input = join(temporary, 'input.env');
  writeFileSync(input, 'TOKEN=synthetic-private-value');
  for (const text of [
    '{"schemaVersion":1,"schemaVersion":1,"variables":{}}',
    '{"schemaVersion":1,"variables":{"TOKEN":{},"TOKEN":{"required":false}}}',
    '{"schemaVersion":1,"variables":{"TOKEN":{"required":true,"required":false}}}',
    '{"schemaVersion":1,"variables":{"TOKEN":{},"\\u0054OKEN":{}}}',
  ]) {
    writeFileSync(definition, text);
    const result = spawnSync(process.execPath, [cli, 'check', '--contract', definition, '--dotenv', input], { encoding: 'utf8' });
    assert.equal(result.status, 1, result.stdout + result.stderr);
    assert.match(result.stderr, /duplicate/i);
    assert.doesNotMatch(result.stdout + result.stderr, /synthetic-private|TOKEN|contract\.json/);
  }
});
test('same keys in different objects and quoted punctuation stay valid', () => {
  const original = { left: { type: 'string' }, right: { type: 'string' }, punctuation: ['{', '}', '"key":1,', '\\'] };
  assert.deepEqual(parseStrictJson(JSON.stringify(original)), original);
});
test('deep JSON and malformed content fail without raw text', () => {
  assert.throws(() => parseStrictJson('['.repeat(129) + '0' + ']'.repeat(129)), /nesting/);
  assert.throws(() => parseStrictJson('{"synthetic-private":'), error => !error.message.includes('synthetic-private'));
});
