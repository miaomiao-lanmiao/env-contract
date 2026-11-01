import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';

const cli = resolve('dist/cli.js');
function run(args, env = process.env) {
  return spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8', windowsHide: true, timeout: 15000, env });
}
test('real CLI: init, all reports, exit gates, privacy and no-overwrite behavior', t => {
  const directory = mkdtempSync(join(tmpdir(), 'env contract smoke '));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const input = join(directory, '中文 private config.env');
  const definition = join(directory, 'contract with spaces.json');
  writeFileSync(input, 'TOKEN=synthetic-cli-private\nPORT=70000\nEXTRA=synthetic-extra-private\n');
  const initialized = run(['init', '--example', input, '--output', definition]);
  assert.equal(initialized.status, 0, initialized.stderr);
  assert.ok(!readFileSync(definition, 'utf8').includes('synthetic-'));
  assert.equal(run(['init', '--example', input, '--output', definition]).status, 1);
  writeFileSync(definition, JSON.stringify({ schemaVersion: 1, variables: { TOKEN: {}, PORT: { type: 'integer', maximum: 65535 }, MISSING: {} } }));
  for (const format of ['markdown', 'json', 'html']) {
    const result = run(['check', '--contract', definition, '--dotenv', input, '--format', format]);
    assert.equal(result.status, 2, result.stderr);
    assert.doesNotMatch(result.stdout + result.stderr, /synthetic-|70000|private config/);
    if (format === 'json') {
      assert.equal(JSON.parse(result.stdout).summary.errors, 2);
      assert.equal(JSON.parse(result.stdout).summary.warnings, 1);
    }
  }
  assert.equal(run(['check', '--contract', definition, '--dotenv', input, '--fail-on', 'none']).status, 0);
  const output = join(directory, 'report.html');
  assert.equal(run(['check', '--contract', definition, '--dotenv', input, '--format', 'html', '--output', output]).status, 2);
  const saved = readFileSync(output, 'utf8');
  assert.equal(run(['check', '--contract', definition, '--dotenv', input, '--output', output]).status, 1);
  assert.equal(readFileSync(output, 'utf8'), saved);
  assert.equal(run(['check', '--contract', definition, '--dotenv', input, '--output', input]).status, 1);
  assert.ok(readFileSync(input, 'utf8').includes('synthetic-cli-private'));
  writeFileSync(definition, JSON.stringify({ schemaVersion: 1, variables: { ONLY_IN_PROCESS: {} } }));
  writeFileSync(input, '');
  const noFallback = run(['check', '--contract', definition, '--dotenv', input, '--format', 'json'], { ...process.env, ONLY_IN_PROCESS: 'synthetic-process-private' });
  assert.equal(noFallback.status, 2);
  assert.equal(JSON.parse(noFallback.stdout).summary.errors, 1);
  assert.ok(!noFallback.stdout.includes('synthetic-process-private'));
});
test('CLI rejects invalid encoding, malformed private input, directories and oversized files', t => {
  const directory = mkdtempSync(join(tmpdir(), 'env contract invalid '));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const input = join(directory, 'input.env');
  const definition = join(directory, 'definition.json');
  writeFileSync(definition, '{bad: synthetic-json-private}');
  writeFileSync(input, 'TOKEN=synthetic-value');
  const malformed = run(['check', '--contract', definition, '--dotenv', input]);
  assert.equal(malformed.status, 1);
  assert.doesNotMatch(malformed.stderr, /synthetic-/);
  writeFileSync(definition, JSON.stringify({ schemaVersion: 1, variables: {} }));
  for (const content of [Buffer.from([0xff, 0xfe]), ' '.repeat(1024 * 1024 + 1), 'TOKEN="synthetic-private']) {
    writeFileSync(input, content);
    const invalid = run(['check', '--contract', definition, '--dotenv', input]);
    assert.equal(invalid.status, 1);
    assert.doesNotMatch(invalid.stderr, /synthetic-/);
  }
  assert.equal(run(['check', '--contract', definition, '--dotenv', directory]).status, 1);
});
test('dotenv values named NODE_OPTIONS are data and do not configure Node', t => {
  const directory = mkdtempSync(join(tmpdir(), 'env contract runtime '));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const definition = join(directory, 'contract.json');
  const input = join(directory, 'input.env');
  writeFileSync(definition, JSON.stringify({ schemaVersion: 1, variables: { NODE_OPTIONS: {} } }));
  writeFileSync(input, 'NODE_OPTIONS=--this-option-must-not-run');
  const result = run(['check', '--contract', definition, '--dotenv', input, '--format', 'json']);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).summary.valid, 1);
  assert.ok(!result.stdout.includes('--this-option-must-not-run'));
});
for (const args of [
  ['unknown'], ['init'], ['check'], ['check', '--contract'], ['init', '--example', 'a', '--format', 'json'],
  ['check', '--dotenv', 'a', '--dotenv', 'b'], ['check', '--contract', 'a', '--dotenv', 'b', '--format', 'xml'],
  ['check', '--contract', 'a', '--dotenv', 'b', '--fail-on', 'low'],
]) {
  test(`invalid command ${JSON.stringify(args)}`, () => assert.equal(run(args).status, 1));
}
test('global help/version and command help do not read files', () => {
  assert.equal(run(['--help']).status, 0);
  assert.equal(run(['check', '--help']).status, 0);
  assert.equal(run(['--version']).stdout, '0.1.1\n');
});
