#!/usr/bin/env node
import { check, crossesThreshold } from './check.js';
import { parseContract, contractFromExample } from './contract.js';
import { parseDotenv } from './dotenv.js';
import { InputError } from './errors.js';
import { output, readJson, readText } from './io.js';
import { render } from './render.js';
import { VERSION } from './version.js';

const help = `Env Contract — offline dotenv validation, values omitted

Usage:
  envcontract init --example FILE --output NEW_FILE
  envcontract check --contract FILE --dotenv FILE
                    [--format markdown|json|html] [--output NEW_FILE]
                    [--fail-on error|warning|none]

Use separate option arguments. Default format: markdown; default threshold: error.
Read only explicitly named files. No environment fallback, expansion or network.
Input limit: 1 MiB, 10000 lines, 2000 variables, 64 KiB per dotenv value.
Output files must be new. Init copies variable names only, never example values.
Exit 0: valid/threshold not crossed; 1: input/usage/I/O; 2: report crosses threshold.
--help and --version require no input. Review report names before sharing.
`;

process.stdout.on('error', (error: NodeJS.ErrnoException) => {
  if (error.code === 'EPIPE') process.exit(0);
  process.stderr.write('envcontract: Cannot write output.\n'); process.exit(1);
});
try {
  const args = process.argv.slice(2);
  if (!args.length || (args.length === 1 && args[0] === '--help') || (args.length === 2 && ['init', 'check'].includes(args[0]!) && args[1] === '--help')) output(help);
  else if (args.length === 1 && args[0] === '--version') output(`${VERSION}\n`);
  else {
    const command = args[0];
    if (command !== 'init' && command !== 'check') throw new InputError('Choose init or check. Use --help for usage.');
    const allowed = command === 'init' ? ['--example', '--output'] : ['--contract', '--dotenv', '--format', '--output', '--fail-on'];
    const flags = new Map<string, string>();
    for (let index = 1; index < args.length; index += 2) {
      const flag = args[index]!;
      const value = args[index + 1];
      if (!allowed.includes(flag) || flags.has(flag)) throw new InputError('Unknown or duplicate option.');
      if (!value || value.startsWith('--') || /[\x00-\x1f\x7f]/.test(value)) throw new InputError('Option requires a nonempty value without control characters.');
      flags.set(flag, value);
    }
    if (command === 'init') {
      if (!flags.has('--example') || !flags.has('--output')) throw new InputError('Init requires --example and --output.');
      const contract = contractFromExample(parseDotenv(readText(flags.get('--example')!)));
      output(`${JSON.stringify(contract, null, 2)}\n`, flags.get('--output'));
    } else {
      if (!flags.has('--contract') || !flags.has('--dotenv')) throw new InputError('Check requires --contract and --dotenv.');
      const format = flags.get('--format') ?? 'markdown';
      if (format !== 'markdown' && format !== 'json' && format !== 'html') throw new InputError('--format must be markdown, json or html.');
      const threshold = flags.get('--fail-on') ?? 'error';
      if (threshold !== 'error' && threshold !== 'warning' && threshold !== 'none') throw new InputError('--fail-on must be error, warning or none.');
      const contract = parseContract(readJson(flags.get('--contract')!));
      const report = check(contract, parseDotenv(readText(flags.get('--dotenv')!)));
      output(render(report, format), flags.get('--output'));
      if (crossesThreshold(report, threshold)) process.exitCode = 2;
    }
  }
} catch (error) {
  process.stderr.write(`envcontract: ${error instanceof InputError ? error.message : 'Operation failed. Check input files and permissions.'}\n`);
  process.exitCode = 1;
}
