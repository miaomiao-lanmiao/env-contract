import type { Contract, VariableRule } from './contract.js';
import type { Binding } from './dotenv.js';
import { VERSION } from './version.js';

export interface Finding { code: string; severity: 'error' | 'warning'; message: string }
export interface Result { name: string; status: 'valid' | 'optional-missing' | 'error' | 'warning'; line: number | null; findings: Finding[] }
export interface Report { schemaVersion: 1; toolVersion: typeof VERSION; summary: { declared: number; provided: number; valid: number; optionalMissing: number; errors: number; warnings: number }; variables: Result[]; notice: string }

function validate(value: string, rule: VariableRule): Finding[] {
  const findings: Finding[] = [];
  const error = (code: string, message: string): void => { findings.push({ code, severity: 'error', message }); };
  if (value === '') {
    if (!rule.allowEmpty) error('EMPTY_VALUE', 'A nonempty value is required.');
    return findings;
  }
  if (rule.type === 'integer' || rule.type === 'number') {
    const pattern = rule.type === 'integer' ? /^[+-]?\d+$/ : /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i;
    const numeric = Number(value);
    if (!pattern.test(value) || !Number.isFinite(numeric) || (rule.type === 'integer' && !Number.isSafeInteger(numeric))) {
      error('INVALID_TYPE', rule.type === 'integer' ? 'Expected a safe integer.' : 'Expected a finite number.');
    } else {
      if (rule.minimum !== undefined && numeric < rule.minimum) error('BELOW_MINIMUM', 'Value is below the configured minimum.');
      if (rule.maximum !== undefined && numeric > rule.maximum) error('ABOVE_MAXIMUM', 'Value is above the configured maximum.');
    }
  } else if (rule.type === 'boolean' && !/^(?:true|false|1|0)$/i.test(value)) error('INVALID_TYPE', 'Expected true, false, 1 or 0.');
  else if (rule.type === 'url') {
    try {
      if (value !== value.trim() || /[\x00-\x20\x7f]/.test(value)) throw new Error();
      const url = new URL(value);
      if (!url.hostname) throw new Error();
      if (!(rule.protocols ?? ['https:', 'http:']).includes(url.protocol)) error('URL_PROTOCOL', 'URL protocol is not allowed by the contract.');
    } catch { error('INVALID_TYPE', 'Expected an absolute network URL with a hostname.'); }
  }
  const length = [...value].length;
  if (rule.minLength !== undefined && length < rule.minLength) error('TOO_SHORT', 'Value is shorter than the configured minimum.');
  if (rule.maxLength !== undefined && length > rule.maxLength) error('TOO_LONG', 'Value is longer than the configured maximum.');
  if (rule.enum && !rule.enum.includes(value)) error('ENUM_MISMATCH', 'Value is not among the configured choices.');
  return findings;
}

export function check(contract: Contract, bindings: Map<string, Binding>): Report {
  const variables: Result[] = [];
  for (const [name, rule] of contract.variables) {
    const binding = bindings.get(name);
    if (!binding) {
      variables.push({ name, status: rule.required ? 'error' : 'optional-missing', line: null,
        findings: rule.required ? [{ code: 'MISSING_VARIABLE', severity: 'error', message: 'Required variable is missing.' }] : [] });
      continue;
    }
    const findings = validate(binding.value, rule);
    variables.push({ name, status: findings.length ? 'error' : 'valid', line: binding.line, findings });
  }
  if (contract.additionalVariables !== 'ignore') {
    for (const [name, binding] of bindings) {
      if (contract.variables.has(name)) continue;
      const severity = contract.additionalVariables === 'error' ? 'error' : 'warning';
      variables.push({ name, status: severity, line: binding.line, findings: [{ code: 'UNEXPECTED_VARIABLE', severity, message: 'Variable is not declared in the contract.' }] });
    }
  }
  variables.sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0);
  const summary = { declared: contract.variables.size, provided: bindings.size, valid: 0, optionalMissing: 0, errors: 0, warnings: 0 };
  for (const variable of variables) {
    if (variable.status === 'valid') summary.valid++;
    if (variable.status === 'optional-missing') summary.optionalMissing++;
    for (const finding of variable.findings) finding.severity === 'error' ? summary.errors++ : summary.warnings++;
  }
  return { schemaVersion: 1, toolVersion: VERSION, summary, variables,
    notice: 'Values are omitted. Variable names and line numbers may still be sensitive; review reports before sharing. This checks a supplied contract, not application behavior or secret safety.' };
}

export function crossesThreshold(report: Report, threshold: 'error' | 'warning' | 'none'): boolean {
  return threshold === 'none' ? false : report.summary.errors > 0 || (threshold === 'warning' && report.summary.warnings > 0);
}
