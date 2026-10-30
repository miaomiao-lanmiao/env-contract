# Working on Env Contract

Read `docs/spec.md`. Keep strict TypeScript, Node 22+ and zero runtime npm
dependencies. Runtime code must not read process.env, load environment files into
the process, start subprocesses, contact services or discover user configuration.
Use only explicitly named regular files and preserve all input/size limits.

Reports/errors must omit values, enum choices, paths and raw parser messages.
Tests use synthetic data only. Do not inspect personal dotenv files or real keys.
Preserve no-interpolation/no-execution semantics and exclusive output creation.
Use `--dotenv`; Node can pre-process its own --env-file before the CLI executes.

For behavior fixes, add a focused regression. Before commits/releases, run
`npm test`, `npm run build`, `npm run check:security`, `npm run check:package`,
and `git diff --check`. Check the quickstart from a clean install. HTML must have
no scripts/external assets. Preserve deterministic JSON report schema 1.

The user requested a new project and GitHub delivery. Create/push this project's
public repository, verify all three hosted CI jobs at the release commit, create
an annotated version tag and keep the initial release as a draft. Do not publish
to npm, move pushed tags or include actual user configuration in the repository.
Future releases need a release/update request and synchronized package/CLI notes.
