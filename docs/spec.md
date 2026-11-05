# Env Contract specification

Version: 0.1.0. Date: 2026-10-31 (Asia/Shanghai).

Maintenance 0.1.1 (2026-11-01): contract text rejects duplicate JSON keys after
escape decoding and JSON nesting beyond 128, with value-free errors.

Maintenance 0.1.2 (2026-11-06): preserve Unicode line/paragraph separators inside
dotenv values without changing LF/CRLF source lines. Ship the README's linked
documentation and synthetic examples, and execute those examples after offline
tarball installation.

## Purpose and users

Small development teams need to catch missing, mistyped and unexpected environment
variables before starting an application or deployment. Env Contract checks an
explicit dotenv file against a small versioned JSON contract, without printing
configuration values or contacting services. It is a new project, separate from
MCP configuration analysis, Git reporting, log triage and folder snapshots.

## Commands

- `envcontract init --example FILE --output NEW_FILE`: create a contract of
  required string variables from example names. Never copy example values.
- `envcontract check --contract FILE --dotenv FILE`: report missing/empty,
  type/range/length/enum violations and unexpected variables. Optional
  `--format markdown|json|html`, `--output NEW_FILE`, and
  `--fail-on error|warning|none` (default error).
- `--help` and `--version` require no input. Explicit output files are created
  exclusively, mode 0600 where supported; existing files are never replaced.
- Exit 0: report generated and threshold not crossed. Exit 1: argument/input/
  contract/I/O failure. Exit 2: a generated report crosses the chosen threshold.

## Contract v1

Top-level fields: `schemaVersion: 1`, `variables` object and optional
`additionalVariables: warn|error|ignore` (default warn). Each variable has
`type: string|integer|number|boolean|url` (default string), optional `required`
(default true), `allowEmpty` (default false), `minimum`, `maximum`, `minLength`,
`maxLength`, `enum`, and `protocols` for absolute network URLs.

Unknown properties and inconsistent constraints are rejected. Variable names are
case-sensitive ASCII identifiers, at most 128 characters. Numeric values must be
finite; integer values must be safe integers. Boolean words true/false are case
insensitive; 1/0 are also accepted. URLs require a hostname; HTTP(S) protocols are
the defaults, and other protocols must be explicitly listed in the contract.

## Dotenv scope and limits

UTF-8/BOM, comments, optional `export`, unquoted values, single/double quoted
values and bounded multiline quoted strings. Preserve single-quoted contents;
double quotes support newline, carriage return, tab, backslash and quote escapes.
Do not expand variables, execute shell substitutions, import other files or read
the current process environment. Duplicate names are errors, with line numbers.

Read only named regular files: 1 MiB per file, 10000 lines, 2000 variables and
64 KiB per value. Contracts are deliberately small and are not a general JSON
Schema implementation. Secret discovery, remote checks, dotenv-file editing,
encrypted storage, recursive project scanning and deployment are out of scope.

## Privacy and reports

Reports contain variable names, statuses, finding codes and source line numbers;
they never include actual values, enum choices, raw parser errors, file contents
or input paths. Names can still be sensitive: review reports before sharing and
do not use secret material as variable names. No claims of comprehensive secret
scanning or application compatibility are made.

Markdown and standalone HTML escape untrusted display text. HTML contains no
scripts, external assets or active form controls and has a restrictive CSP.
JSON has report schemaVersion 1. Output is deterministic for unchanged inputs.

## Acceptance criteria

1. Unit tests cover supported dotenv syntax, multiline line references, duplicate
   names, malformed quotes, contract validation and every value type/constraint.
2. Reports in all formats and parser errors omit synthetic private values,
   including URL credentials and malformed JSON/text. Init output copies names
   only. No process environment fallback occurs.
3. A real CLI smoke test covers init/check, Unicode and spaced file paths, all
   formats, thresholds, output overwrite protection, invalid encoding and limits.
4. `npm ci --ignore-scripts`, `npm test`, `npm run build`, static runtime checks
   and offline tarball installation pass. GitHub CI covers Linux/Windows/macOS.
5. Deliver bilingual README, examples, MIT license, review/release instructions,
   issue forms and a maintenance plan. Use a spec-first commit, focused source
   commits, a public GitHub repository, version tag and CI-verified release draft.
