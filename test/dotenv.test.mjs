import assert from 'node:assert/strict';
import test from 'node:test';
import { parseDotenv, contractFromExample } from '../dist/index.js';

test('parses BOM, comments, export, whitespace, empty and quoted values', () => {
  const bindings = parseDotenv('\uFEFF# comment\r\n export PORT = 3000 # comment\r\nTOKEN="a#b"\r\nEMPTY=\r\nSINGLE=\'literal \\n\'\r\n');
  assert.equal(bindings.get('PORT').value, '3000');
  assert.equal(bindings.get('PORT').line, 2);
  assert.equal(bindings.get('TOKEN').value, 'a#b');
  assert.equal(bindings.get('EMPTY').value, '');
  assert.equal(bindings.get('SINGLE').value, 'literal \\n');
});
test('multiline quotes and supported escapes retain following source lines', () => {
  const result = parseDotenv('A="first\nsecond\\nthird\\tend\\\\path\\\"" # end\nB=next\n');
  assert.equal(result.get('A').value, 'first\nsecond\nthird\tend\\path"');
  assert.equal(result.get('B').line, 3);
});
test('unknown double-quote escapes preserve their backslash', () => {
  assert.equal(parseDotenv('PATH="C:\\Users\\project"').get('PATH').value, 'C:\\Users\\project');
});
test('no variable interpolation or shell substitution is performed', () => {
  const bindings = parseDotenv('A=${PRIVATE_ENV}\nB=$(do-not-run)\nC=`do-not-run`');
  assert.equal(bindings.get('A').value, '${PRIVATE_ENV}');
  assert.equal(bindings.get('B').value, '$(do-not-run)');
  assert.equal(bindings.get('C').value, '`do-not-run`');
});
test('names are case sensitive and prototype-like names are data', () => {
  const bindings = parseDotenv('Name=one\nNAME=two\n__proto__=three');
  assert.equal(bindings.size, 3);
  assert.equal(bindings.get('__proto__').value, 'three');
});
test('init contract copies names and never copies values', () => {
  const result = contractFromExample(parseDotenv('TOKEN=synthetic-init-private\nPORT=3000'));
  assert.deepEqual(Object.keys(result.variables), ['TOKEN', 'PORT']);
  assert.ok(!JSON.stringify(result).includes('synthetic-init-private'));
  assert.ok(!JSON.stringify(result).includes('3000'));
});
for (const text of ['A=synthetic-first\nA=synthetic-second', 'BAD-NAME=synthetic-value', 'A="synthetic-unclosed', 'A="synthetic-value" trailing', 'A=synthetic\x00value']) {
  test(`rejects malformed dotenv without leaking values (${JSON.stringify(text.slice(0, 12))})`, () => {
    assert.throws(() => parseDotenv(text), error => !error.message.includes('synthetic'));
  });
}
test('enforces input, line, variable and value limits', () => {
  assert.throws(() => parseDotenv(' '.repeat(1024 * 1024 + 1)), /1 MiB/);
  assert.throws(() => parseDotenv('\n'.repeat(10002)), /10000/);
  assert.throws(() => parseDotenv('A=' + 'x'.repeat(65537)), /64 KiB/);
  assert.throws(() => parseDotenv(Array.from({ length: 2001 }, (_, index) => `V${index}=x`).join('\n')), /2000/);
});
