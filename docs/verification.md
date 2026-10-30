# Verification record

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
