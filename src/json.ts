import { InputError } from './errors.js';

export function parseStrictJson(text: string): unknown {
  if (Buffer.byteLength(text) > 1024 * 1024) throw new InputError('Contract input exceeds 1 MiB.');
  let parsed: unknown;
  try { parsed = JSON.parse(text); }
  catch { throw new InputError('Contract file is not valid JSON.'); }
  const stack: Array<{ kind: 'object'; names: Set<string>; expectingKey: boolean } | { kind: 'array' }> = [];
  for (let index = 0; index < text.length; index++) {
    const character = text[index];
    if (character === '"') {
      const start = index++;
      while (index < text.length) {
        if (text[index] === '\\') index += 2;
        else if (text[index] === '"') break;
        else index++;
      }
      const frame = stack.at(-1);
      if (frame?.kind === 'object' && frame.expectingKey) {
        const key = JSON.parse(text.slice(start, index + 1)) as string;
        if (frame.names.has(key)) throw new InputError('Contract JSON contains duplicate properties.');
        frame.names.add(key);
        frame.expectingKey = false;
      }
    } else if (character === '{') stack.push({ kind: 'object', names: new Set(), expectingKey: true });
    else if (character === '[') stack.push({ kind: 'array' });
    else if (character === '}' || character === ']') stack.pop();
    else if (character === ',') {
      const frame = stack.at(-1);
      if (frame?.kind === 'object') frame.expectingKey = true;
    }
    if (stack.length > 128) throw new InputError('Contract JSON exceeds the nesting limit of 128.');
  }
  return parsed;
}
