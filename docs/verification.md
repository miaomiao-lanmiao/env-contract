# Verification record

Maintenance 0.1.2, 2026-11-06 (Asia/Shanghai): Windows with Node.js v26.13.0,
npm 11.20.0. A clean `npm ci --ignore-scripts` installation, all 62 tests, strict
build, runtime static checks, offline tarball installation and source quickstart
passed. New regressions reproduce Unicode-separator rejection and missing
packaged quickstart inputs before their fixes. The tarball now includes linked
documentation and runs both bundled synthetic examples outside the checkout.
Hosted Linux/Windows/macOS CI at the release commit remains a separate gate.

Date: 2026-10-31 (Asia/Shanghai). Local platform: Windows, Node.js v24.18.0.

- 57 tests cover dotenv/contract parsing, all value constraints, name-only init,
  value-free reports, CLI thresholds, no-overwrite behavior and input limits.
- The CLI never falls back to process values. A supplied NODE_OPTIONS binding
  remains data; input is passed with the supported --dotenv option.
- Strict TypeScript build and static runtime/dependency checks passed.
- Offline tarball installation and the actual installed command passed.
- Tests use synthetic values and temporary files only. No personal dotenv input
  or real credential was read.

The HTML example is also checked in headless Edge on desktop/mobile widths.
Screenshots and local outputs stay ignored under reports/.

Hosted Linux/Windows/macOS CI at the release commit is required before creating
the draft. Local checks alone do not establish the hosted result or a guarantee
of comprehensive secret detection/application correctness.
