import assert from 'node:assert/strict';
import test from 'node:test';
import { parseContract, parseDotenv, check, crossesThreshold, render } from '../dist/index.js';

const contract = variables => ({ schemaVersion: 1, variables });
test('default rules, optional variables, enums, URLs and numeric constraints validate', () => {
  const definition = parseContract(contract({ PORT: { type: 'integer', minimum: 1, maximum: 65535 }, RATE: { type: 'number', minimum: 0 }, ENABLED: { type: 'boolean' }, MODE: { enum: ['development', 'production'] }, API: { type: 'url' }, DATABASE: { type: 'url', protocols: ['postgresql:'] }, OPTIONAL: { required: false } }));
  const result = check(definition, parseDotenv('PORT=3000\nRATE=1.5e2\nENABLED=TRUE\nMODE=development\nAPI=https://example.invalid\nDATABASE=postgresql://user:synthetic-password@localhost/database'));
  assert.equal(result.summary.errors, 0);
  assert.equal(result.summary.valid, 6);
  assert.equal(result.summary.optionalMissing, 1);
  assert.equal(crossesThreshold(result, 'error'), false);
});
for (const [rule, value, code] of [
  [{ type: 'integer' }, '1.1', 'INVALID_TYPE'], [{ type: 'integer' }, '9007199254740992', 'INVALID_TYPE'],
  [{ type: 'number' }, 'Infinity', 'INVALID_TYPE'], [{ type: 'number' }, '0x10', 'INVALID_TYPE'],
  [{ type: 'integer', minimum: 3 }, '2', 'BELOW_MINIMUM'], [{ type: 'number', maximum: 3 }, '4', 'ABOVE_MAXIMUM'],
  [{ type: 'boolean' }, 'yes', 'INVALID_TYPE'], [{ type: 'url' }, 'not-a-url', 'INVALID_TYPE'],
  [{ type: 'url' }, 'ftp://example.invalid', 'URL_PROTOCOL'], [{ minLength: 3 }, 'ab', 'TOO_SHORT'],
  [{ maxLength: 1 }, 'ab', 'TOO_LONG'], [{ enum: ['expected'] }, 'other', 'ENUM_MISMATCH'],
]) {
  test(`value constraint ${code} (${JSON.stringify(rule)})`, () => {
    const result = check(parseContract(contract({ ITEM: rule })), parseDotenv(`ITEM=${value}`));
    assert.ok(result.variables[0].findings.some(finding => finding.code === code));
  });
}
test('missing, empty and permitted empty values are distinct', () => {
  const result = check(parseContract(contract({ MISSING: {}, EMPTY: {}, ALLOWED: { allowEmpty: true }, OPTIONAL: { required: false } })), parseDotenv('EMPTY=\nALLOWED='));
  assert.equal(result.summary.errors, 2);
  assert.equal(result.summary.valid, 1);
  assert.equal(result.summary.optionalMissing, 1);
});
test('unexpected-variable policies and gates are deterministic', () => {
  for (const policy of ['warn', 'error', 'ignore']) {
    const result = check(parseContract({ ...contract({}), additionalVariables: policy }), parseDotenv('EXTRA=synthetic-value'));
    assert.equal(result.summary.warnings, policy === 'warn' ? 1 : 0);
    assert.equal(result.summary.errors, policy === 'error' ? 1 : 0);
    assert.equal(crossesThreshold(result, 'error'), policy === 'error');
    assert.equal(crossesThreshold(result, 'warning'), policy !== 'ignore');
    assert.equal(crossesThreshold(result, 'none'), false);
  }
});
test('reports omit values and enum choices in every format, with stable variable ordering', () => {
  const definition = parseContract(contract({ Z_TOKEN: { enum: ['synthetic-private-choice'] }, A_URL: { type: 'url' }, MISSING: {} }));
  const result = check(definition, parseDotenv('Z_TOKEN=synthetic-private-value\nA_URL=https://user:synthetic-private-password@example.invalid/?token=synthetic-private-query'));
  assert.deepEqual(result.variables.map(variable => variable.name), ['A_URL', 'MISSING', 'Z_TOKEN']);
  for (const format of ['markdown', 'json', 'html']) {
    const output = render(result, format);
    assert.doesNotMatch(output, /synthetic-private-|example\.invalid/);
  }
  const html = render(result, 'html');
  assert.ok(html.includes("default-src 'none'"));
  assert.doesNotMatch(html, /<script|<img|<iframe/);
  assert.deepEqual(result, check(definition, parseDotenv('Z_TOKEN=synthetic-private-value\nA_URL=https://user:synthetic-private-password@example.invalid/?token=synthetic-private-query')));
});
for (const invalid of [
  null, [], {}, { ...contract({}), schemaVersion: 2 }, { ...contract({}), unknown: 'synthetic-private' },
  { ...contract({}), additionalVariables: null }, contract({ 'BAD NAME': {} }), contract({ ITEM: { type: ['integer'] } }),
  contract({ ITEM: { type: null } }), contract({ ITEM: { required: 'yes' } }), contract({ ITEM: { minimun: 1 } }),
  contract({ ITEM: { minimum: 1 } }), contract({ ITEM: { type: 'integer', minimum: 2, maximum: 1 } }),
  contract({ ITEM: { minLength: 4, maxLength: 2 } }), contract({ ITEM: { enum: [1] } }), contract({ ITEM: { protocols: ['https:'] } }),
  contract({ ITEM: { type: 'url', protocols: ['not protocol'] } }),
]) {
  test(`invalid contract ${JSON.stringify(invalid)}`, () => {
    assert.throws(() => parseContract(invalid), error => !error.message.includes('synthetic-private'));
  });
}
