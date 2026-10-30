import { InputError } from './errors.js';

export interface Binding { name: string; value: string; line: number }
export const VARIABLE_NAME = /^[A-Za-z_][A-Za-z0-9_]{0,127}$/;

export function parseDotenv(input: string): Map<string, Binding> {
  if (Buffer.byteLength(input) > 1024 * 1024) throw new InputError('Dotenv input exceeds 1 MiB.');
  if (input.includes('\0')) throw new InputError('Dotenv input contains a NUL character.');
  const lines = input.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').split('\n');
  if (lines.at(-1) === '') lines.pop();
  if (lines.length > 10000) throw new InputError('Dotenv input exceeds 10000 lines.');
  const bindings = new Map<string, Binding>();
  for (let index = 0; index < lines.length; index++) {
    const start = index + 1;
    let text = lines[index]!.trimStart();
    if (!text || text.startsWith('#')) continue;
    if (text.startsWith('export ' ) || text.startsWith('export\t')) text = text.slice(6).trimStart();
    const assignment = /^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(text);
    if (!assignment || !VARIABLE_NAME.test(assignment[1]!)) throw new InputError(`Invalid dotenv assignment on line ${start}.`);
    const name = assignment[1]!;
    if (bindings.has(name)) throw new InputError(`Duplicate dotenv name on line ${start} (first defined on line ${bindings.get(name)!.line}).`);
    let raw = assignment[2]!;
    let value = '';
    const quote = raw[0];
    if (quote === '"' || quote === "'") {
      let position = 1;
      let closed = false;
      while (!closed) {
        while (position < raw.length) {
          const character = raw[position++]!;
          if (character === quote) { closed = true; break; }
          if (quote === '"' && character === '\\' && position < raw.length) {
            const next = raw[position++]!;
            const escapes: Record<string, string> = { n: '\n', r: '\r', t: '\t', '\\': '\\', '"': '"' };
            value += Object.hasOwn(escapes, next) ? escapes[next] : `\\${next}`;
          } else value += character;
        }
        if (Buffer.byteLength(value) > 64 * 1024) throw new InputError(`Dotenv value exceeds 64 KiB on line ${start}.`);
        if (!closed) {
          index++;
          if (index >= lines.length) throw new InputError(`Unclosed dotenv quote starting on line ${start}.`);
          value += '\n'; raw = lines[index]!; position = 0;
        }
      }
      const remainder = raw.slice(position).trim();
      if (remainder && !remainder.startsWith('#')) throw new InputError(`Unexpected text after a dotenv quote on line ${index + 1}.`);
    } else value = raw.split('#', 1)[0]!.trim();
    if (Buffer.byteLength(value) > 64 * 1024) throw new InputError(`Dotenv value exceeds 64 KiB on line ${start}.`);
    bindings.set(name, { name, value, line: start });
    if (bindings.size > 2000) throw new InputError('Dotenv input exceeds 2000 variables.');
  }
  return bindings;
}
