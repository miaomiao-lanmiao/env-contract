import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const temporary = mkdtempSync(join(tmpdir(), 'env contract package '));
assert.ok(process.env.npm_execpath, 'Use npm run check:package.');
function npm(args) {
  const result = spawnSync(process.execPath, [process.env.npm_execpath, ...args], {
    cwd: root, encoding: 'utf8', shell: false, windowsHide: true, timeout: 60000,
    env: { ...process.env, npm_config_audit: 'false', npm_config_fund: 'false', npm_config_update_notifier: 'false' },
  });
  assert.equal(result.status, 0, result.stderr);
}
try {
  npm(['pack', '--ignore-scripts', '--pack-destination', temporary]);
  const archive = join(temporary, readdirSync(temporary).find(name => name.endsWith('.tgz')));
  npm(['install', '--offline', '--ignore-scripts', '--no-audit', '--no-fund', '--prefix', temporary, archive]);
  const packageRoot = join(temporary, 'node_modules/env-contract-cli');
  const manifest = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8'));
  assert.equal(Object.keys(manifest.dependencies ?? {}).length, 0);
  assert.ok(!readdirSync(packageRoot).includes('test'));
  const contract = join(temporary, 'contract.json');
  const input = join(temporary, 'synthetic.env');
  writeFileSync(contract, JSON.stringify({ schemaVersion: 1, variables: { TOKEN: {} } }));
  writeFileSync(input, 'TOKEN=synthetic-install-private');
  const report = spawnSync(process.execPath, [join(packageRoot, 'dist/cli.js'), 'check', '--contract', contract, '--dotenv', input, '--format', 'json'], { encoding: 'utf8', cwd: temporary });
  assert.equal(report.status, 0, report.stderr);
  assert.equal(JSON.parse(report.stdout).summary.valid, 1);
  assert.ok(!report.stdout.includes('synthetic-install-private'));
  const bin = join(temporary, 'node_modules/.bin');
  const installed = process.platform === 'win32'
    ? spawnSync(process.env.ComSpec ?? 'cmd.exe', ['/d', '/s', '/c', 'envcontract.cmd --version'], { cwd: bin, encoding: 'utf8', windowsHide: true })
    : spawnSync(join(bin, 'envcontract'), ['--version'], { encoding: 'utf8' });
  assert.equal(installed.status, 0, installed.stderr);
  assert.equal(installed.stdout, `${manifest.version}\n`);
  console.log('Offline tarball installation, installed executable and value-free validation passed.');
} finally { rmSync(temporary, { recursive: true, force: true }); }
