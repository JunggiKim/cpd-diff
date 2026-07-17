# cpd-diff

`cpd-diff` blocks only code duplication introduced by a change. Existing duplication remains visible without forcing a repository-wide cleanup before CI can become useful.

It is a clean-room TypeScript wrapper around official `jscpd` and PMD CPD executables. It does not copy either engine's source code and does not require an npm release: use the GitHub Action or download the CLI bundle from GitHub Releases.

## GitHub Action

```yaml
name: Duplication
on:
  pull_request:

permissions:
  contents: read

jobs:
  cpd-diff:
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - uses: actions/checkout@34e114876b0b11c390a56381ad16ebd13914f8d5 # v4.3.1
        with:
          fetch-depth: 0
      - uses: JunggiKim/cpd-diff@v1
        with:
          engine: jscpd
          language: typescript
          mode: changed-lines
```

For Java, Kotlin, or other PMD CPD languages, install Java 21 and set `engine: pmd`. To publish SARIF to GitHub code scanning, upload the Action's `sarif-path` output with `github/codeql-action/upload-sarif`.

Do not run this Action with `pull_request_target`. The Action rejects that event because untrusted pull-request code must not execute in a privileged context.

## Modes

- `changed-files`: reports a clone when at least one occurrence is in a changed file. This is the practical default.
- `changed-lines`: reports a clone only when an occurrence intersects an added or modified line. This is stricter about newly introduced duplication.

Renames and paths containing tabs or newlines are handled through Git's NUL-delimited output. Deleted files, binary files, and symlinks are excluded. `new-clones` history-aware classification is intentionally deferred; the two supported modes have explicit, tested semantics.

## CLI from a release

Download `cpd-diff-cli.tar.gz` and its checksum from the matching GitHub Release, verify it, then run with Node.js 24 or newer:

```bash
node cpd-diff.js \
  --base origin/main \
  --head HEAD \
  --engine jscpd \
  --engine-path /path/to/jscpd \
  --language typescript \
  --mode changed-lines
```

Exit codes are `0` for no violation, `1` for a duplication-policy violation, and `2` for invalid input or execution failure. Formats are `console`, `json`, and SARIF 2.1.0. Add `--warn-only` during gradual adoption.

## Engine integrity and licensing

The Action downloads a platform-specific official engine release, accepts only trusted GitHub origins, verifies a pinned SHA-256 digest before extraction, validates archive paths, and caches the verified version. PMD additionally requires Java. Exact versions, upstream licenses, and attribution are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

`cpd-diff` is Apache-2.0 licensed. jscpd is MIT licensed. PMD source and binary distributions use the BSD-style PMD license and include additional third-party notices. These permissive terms allow this separate wrapper and redistribution when notices are retained; they do not imply endorsement by either upstream project. This is a technical licensing review, not legal advice.

## Local development

```bash
corepack pnpm install
corepack pnpm test
corepack pnpm typecheck
corepack pnpm build
corepack pnpm --filter @cpd-diff/action bundle
```

Node.js 24 and pnpm 11.13.1 are required. Development follows RED-GREEN-REFACTOR; engine adapters are also exercised against real official binaries in release verification.

## Scope

The project provides deterministic Git diff parsing, file selection, clone normalization, changed-file/changed-line policy evaluation, jscpd and PMD adapters, verified engine installation, console/JSON/SARIF reporters, a CLI, and a GitHub Action. It does not publish an npm package or provide a hosted service.

Security reports should follow [SECURITY.md](SECURITY.md). Contributions follow [CONTRIBUTING.md](CONTRIBUTING.md).
