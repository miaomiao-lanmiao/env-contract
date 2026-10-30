import { InputError } from './errors.js';
import { VARIABLE_NAME, type Binding } from './dotenv.js';

export type ValueType = 'string' | 'integer' | 'number' | 'boolean' | 'url';
export interface VariableRule {
  type: ValueType; required: boolean; allowEmpty: boolean;
  minimum?: number; maximum?: number; minLength?: number; maxLength?: number;
  enum?: string[]; protocols?: string[];
}
export interface Contract { schemaVersion: 1; additionalVariables: 'warn' | 'error' | 'ignore'; variables: Map<string, VariableRule> }
export const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);

function keys(value: Record<string, unknown>, allowed: string[]): void {
  if (Object.keys(value).some(key => !allowed.includes(key))) throw new InputError('Contract contains an unknown property.');
}
export function parseContract(value: unknown): Contract {
  if (!isObject(value)) throw new InputError('Contract must be a JSON object.');
  keys(value, ['schemaVersion', 'additionalVariables', 'variables']);
  if (value.schemaVersion !== 1 || !isObject(value.variables)) throw new InputError('Contract requires schemaVersion 1 and a variables object.');
  const policy = value.additionalVariables === undefined ? 'warn' : value.additionalVariables;
  if (policy !== 'warn' && policy !== 'error' && policy !== 'ignore') throw new InputError('Invalid additionalVariables policy.');
  const entries = Object.entries(value.variables);
  if (entries.length > 2000) throw new InputError('Contract exceeds 2000 variables.');
  const variables = new Map<string, VariableRule>();
  for (const [name, raw] of entries) {
    if (!VARIABLE_NAME.test(name) || !isObject(raw)) throw new InputError('Contract has an invalid variable name or rule.');
    keys(raw, ['type', 'required', 'allowEmpty', 'minimum', 'maximum', 'minLength', 'maxLength', 'enum', 'protocols']);
    const type = raw.type === undefined ? 'string' : raw.type;
    if (typeof type !== 'string' || !['string', 'integer', 'number', 'boolean', 'url'].includes(type)) throw new InputError('Contract has an unsupported variable type.');
    for (const property of ['required', 'allowEmpty']) {
      if (raw[property] !== undefined && typeof raw[property] !== 'boolean') throw new InputError('Contract boolean options must be true or false.');
    }
    const rule: VariableRule = { type: type as ValueType, required: raw.required === undefined ? true : raw.required as boolean, allowEmpty: raw.allowEmpty === true };
    for (const property of ['minimum', 'maximum'] as const) {
      if (raw[property] === undefined) continue;
      if (!['integer', 'number'].includes(rule.type) || typeof raw[property] !== 'number' || !Number.isFinite(raw[property])) {
        throw new InputError('Numeric bounds require a numeric type and finite numbers.');
      }
      rule[property] = raw[property];
    }
    for (const property of ['minLength', 'maxLength'] as const) {
      if (raw[property] === undefined) continue;
      if (!['string', 'url'].includes(rule.type) || typeof raw[property] !== 'number' || !Number.isSafeInteger(raw[property]) || raw[property] < 0 || raw[property] > 65536) {
        throw new InputError('Length bounds require string/url types and integers from 0 to 65536.');
      }
      rule[property] = raw[property];
    }
    if ((rule.minimum !== undefined && rule.maximum !== undefined && rule.minimum > rule.maximum)
      || (rule.minLength !== undefined && rule.maxLength !== undefined && rule.minLength > rule.maxLength)) throw new InputError('Contract bounds are inconsistent.');
    if (raw.enum !== undefined) {
      if (!Array.isArray(raw.enum) || raw.enum.length < 1 || raw.enum.length > 100 || raw.enum.some(choice => typeof choice !== 'string' || Buffer.byteLength(choice) > 65536)) {
        throw new InputError('Contract enum must contain 1–100 bounded strings.');
      }
      rule.enum = [...raw.enum] as string[];
    }
    if (raw.protocols !== undefined) {
      if (rule.type !== 'url' || !Array.isArray(raw.protocols) || raw.protocols.length < 1 || raw.protocols.length > 20 || raw.protocols.some(protocol => typeof protocol !== 'string' || !/^[a-z][a-z0-9+.-]{0,31}:$/.test(protocol))) {
        throw new InputError('Contract protocols require a url type and protocol names ending in a colon.');
      }
      rule.protocols = [...raw.protocols] as string[];
    }
    variables.set(name, rule);
  }
  return { schemaVersion: 1, additionalVariables: policy, variables };
}

export function contractFromExample(bindings: Map<string, Binding>): object {
  return { schemaVersion: 1, additionalVariables: 'warn', variables: Object.fromEntries([...bindings.keys()].map(name => [name, { type: 'string', required: true }])) };
}
