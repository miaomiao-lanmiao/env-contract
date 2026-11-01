import { closeSync, constants, fstatSync, openSync, readSync, writeFileSync } from 'node:fs';
import { InputError } from './errors.js';
import { parseStrictJson } from './json.js';

export function readText(path: string): string {
  let descriptor: number;
  try { descriptor = openSync(path, constants.O_RDONLY | (constants.O_NONBLOCK ?? 0)); }
  catch { throw new InputError('Cannot open the named input file.'); }
  try {
    const stats = fstatSync(descriptor);
    if (!stats.isFile() || stats.size > 1024 * 1024) throw new InputError('Input must be a regular file no larger than 1 MiB.');
    const chunks: Buffer[] = [];
    const buffer = Buffer.alloc(65536);
    let size = 0;
    while (true) {
      const count = readSync(descriptor, buffer, 0, buffer.length, null);
      if (!count) break;
      size += count;
      if (size > 1024 * 1024) throw new InputError('Input exceeds 1 MiB.');
      chunks.push(Buffer.from(buffer.subarray(0, count)));
    }
    try { return new TextDecoder('utf-8', { fatal: true }).decode(Buffer.concat(chunks)); }
    catch { throw new InputError('Input must contain valid UTF-8 text.'); }
  } catch (error) {
    if (error instanceof InputError) throw error;
    throw new InputError('Cannot read the named input file.');
  } finally { closeSync(descriptor); }
}

export function readJson(path: string): unknown {
  return parseStrictJson(readText(path));
}

export function output(content: string, path?: string): void {
  if (path === undefined) { process.stdout.write(content); return; }
  try { writeFileSync(path, content, { flag: 'wx', mode: 0o600, encoding: 'utf8' }); }
  catch { throw new InputError('Cannot create output file. It may exist already or its parent may be missing.'); }
}
