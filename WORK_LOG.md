# WORK_LOG

## Basic Info

- Feature: cpd-diff v1.0 diff-aware code duplication gate
- Branch: feat/build-cpd-diff
- Start time: 2026-07-17 Asia/Seoul
- Assignee: JunggiKim

## Feature / API Spec

### Priority

- High

### Endpoint

- `cpd-diff --base <ref> --head <ref> --engine <pmd|jscpd> --mode <changed-files|changed-lines>`
- `uses: JunggiKim/cpd-diff@v1`

### Request Schema

- CLI flags / string, number, enum, glob / required values validated before execution
- GitHub Action inputs / engine, language, minimum-tokens, mode, base-ref, include, exclude, fail-on-violation

### Response Schema

- Console, JSON, and SARIF 2.1.0 reports with normalized clone groups
- Exit 0 for clean, exit 1 for policy violation, exit 2 for execution error

### Exception Cases

- Invalid refs, shallow checkout, binary files, rename/delete, empty diff, CRLF, and unsafe paths
- Missing engine/runtime, failed or checksum-mismatched download, engine timeout/failure, malformed output
- Fork pull request safety, untrusted filenames, path traversal, and command injection

### Dependencies

- Node.js 24 LTS runtime and pnpm workspace toolchain
- Pinned PMD CPD and jscpd releases downloaded only from official upstream with SHA-256 verification
- Git CLI and Java runtime for PMD; GitHub Actions runtime for the Action adapter

### Impact Scope

- New independent repository only: core, engines, reporters, CLI, Action, fixtures, docs, CI, release assets
- npm publication and new-clones mode are explicitly out of v1.0 scope

## TDD Plan Gate

### Design Exploration Results

- Compared user-installed engines, pinned upstream downloads, and bundled engines; selected pinned upstream downloads with checksum verification.
- Detailed authoritative decision record follows in `### 설계 탐색 결과`; duplication exists only for incompatible proof validators.

### Task Decomposition

- Decomposed implementation into 18 RED-GREEN-REFACTOR cycles executed in batches of three.
- Detailed authoritative task list follows in `### 태스크 분해`.

### Worktree Creation/Initialization Plan

- Use the existing `.claude/worktrees/build-cpd-diff` worktree and never switch branches.
- Detailed authoritative worktree plan follows in `### 워크트리 생성/초기화 계획`.

### Convention Pass Plan

- Run tests before strict typecheck, lint, format, design, license, security, and artifact checks; fix and rerun on failure.
- Detailed authoritative convention plan follows in `### 컨벤션 통과 계획`.

### AI Cross Review Pass Plan

- Run open-code-review and independent architecture, security, and license review until substantive PASS.
- Detailed authoritative review plan follows in `### open-code-review 통과 계획`.

### 설계 탐색 결과

- Approach A: require user-installed engines; smallest license surface but poor Action usability.
- Approach B: selected; pinned official upstream downloads, SHA-256 fail-closed verification, local cache, and subprocess adapters. Best balance of safe redistribution boundary and one-step Action use.
- Approach C: bundle engine code/binaries; easiest runtime setup but largest licensing, supply-chain, and platform burden, so rejected.
- Detection design: normalize full engine output and filter clone occurrence pairs to CHANGED×CHANGED or CHANGED×BASELINE; BASELINE×BASELINE is discarded. changed-lines additionally requires overlap with added head-line ranges.
- Architecture: functional core for diff parsing, normalization, pair policy, and report transformation; imperative shell for Git, filesystem, downloads, subprocesses, and GitHub Action I/O.
- Minimal solution ladder: standard Node APIs first; dependencies only for stable CLI parsing, globbing, XML, SARIF validation, and tests. Validation, error handling, and security are never minimized away.
- User approved Approach B and v1.0 scope on 2026-07-17.

### 태스크 분해

- Batch 1 / Cycle 1: write failing repository/toolchain smoke tests, add the minimum TypeScript workspace, pass tests, then simplify configuration.
- Batch 1 / Cycle 2: write failing `git diff --name-status -z` parser tests for A/C/M/R/D and hostile filenames, implement changed-file parsing, pass and refactor.
- Batch 1 / Cycle 3: write failing `git diff -U0` hunk parser tests for added/modified/rename/CRLF/empty cases, implement changed-line ranges, pass and refactor.
- Batch 2 / Cycle 4: write failing tracked-file selection tests for include/exclude/language/binary paths, implement selection and CHANGED/BASELINE split, pass and refactor.
- Batch 2 / Cycle 5: write failing normalized `CloneGroup` invariant tests, implement validated immutable model, pass and refactor.
- Batch 2 / Cycle 6: write failing pair-policy truth-table tests, implement changed-files filtering, pass and refactor.
- Batch 3 / Cycle 7: write failing line-overlap boundary tests, implement changed-lines filtering, pass and refactor.
- Batch 3 / Cycle 8: write failing fingerprint determinism and merge tests, implement SHA-256 normalization and group deduplication, pass and refactor.
- Batch 3 / Cycle 9: write failing engine manifest/checksum/cache tests, implement official-download installer with atomic cache and fail-closed verification, pass and refactor.
- Batch 4 / Cycle 10: write failing jscpd JSON fixture and subprocess integration tests, implement pinned jscpd adapter, pass and refactor.
- Batch 4 / Cycle 11: write failing PMD XML fixture and subprocess integration tests, implement pinned PMD adapter, pass and refactor.
- Batch 4 / Cycle 12: write failing timeout/nonzero/malformed-output tests, implement explicit engine error mapping, pass and refactor.
- Batch 5 / Cycle 13: write failing console/JSON stable-schema tests, implement reporters, pass and refactor.
- Batch 5 / Cycle 14: write failing SARIF 2.1.0 schema tests, implement locations, related locations, and fingerprints, pass and refactor.
- Batch 5 / Cycle 15: write failing CLI E2E and exit-code contract tests, implement CLI orchestration, pass and refactor.
- Batch 6 / Cycle 16: write failing Action input/base-ref/summary/annotation tests, implement Action adapter and committed dist, pass and refactor.
- Batch 6 / Cycle 17: write failing clean-room fixture repository E2E tests for both modes and engines, implement missing integration boundaries, pass and refactor.
- Batch 6 / Cycle 18: write failing release artifact and Action metadata verification, implement CI/release workflow and documentation assets, pass and refactor.

### 워크트리 생성/초기화 계획

- Independent repository created at `/Users/kjg/workspace/solodev_root/cpd-diff` with `main` untouched after initial empty commit.
- Development worktree created at `.claude/worktrees/build-cpd-diff` on `feat/build-cpd-diff`; no checkout or switch commands are used.
- Parent solodev_root ignores `cpd-diff/` through local `.git/info/exclude`; parent status must remain clean.
- This greenfield repository has no inherited iCloud `.claude` symlinks; integrity is verified through explicit absolute skill paths and Git worktree checks rather than copying company/project hooks.

### 컨벤션 통과 계획

- Run TypeScript strict typecheck, ESLint, Prettier check, package-boundary checks, action dist freshness, and license/SBOM validation after all related tests pass.
- Run code-design and refactoring validation where language-compatible; record justified non-applicable Kotlin/Spring checks.
- Fix every violation and rerun the complete ordered validation sequence.

### open-code-review 통과 계획

- Run open-code-review against the final branch after local checks pass and address every Critical/High/Medium finding.
- Run independent architecture, security, and license cross-validation; retry after fixes until substantive PASS or explicitly documented tool failure.
- Publish review evidence to the GitHub PR without merging until all required checks are green.

### 리팩토링 계획

- Apply Structure-First: exported contract, primary flow, pure atoms, then I/O boundaries.
- Apply Fail Fast to refs, paths, manifests, checksums, engine output, and CLI inputs.
- Apply KISS/YAGNI: no npm publishing, dashboard, server, database, plugin framework beyond the two required adapters, or new-clones implementation.
- Apply functional core/imperative shell and immutable discriminated unions for results and errors.
- Use Rule of Three and avoid speculative Helper/Manager/Factory abstractions.

## Verification Summary

- Build: PASS
- Tests: PASS (93 tests; RED-GREEN-REFACTOR cycles complete; official jscpd 5.0.12 and PMD 7.26.0 execution verified)
- Convention: PASS (Prettier, oxlint, strict TypeScript, actionlint, dependency audit, security scan, action bundle freshness)

## Refactor and Review Evidence

- Structure-First boundaries remain core, engines, reporters, CLI, and Action; no speculative plugin or hosted-service abstraction was added.
- Fail Fast validation covers Git refs, repository paths, engine inputs, checksums, redirects, archive entries, symlinks, timeouts, output bounds, and report parsing.
- `validate-design-principles`: PASS by focused smell review; coupling is directed inward and each package has one reason to change.
- `validate-refactoring`: PASS; formatting-only cleanup followed behavior commits and all tests remained green.
- Security scan: PASS; dependency audit has zero known vulnerabilities, no hardcoded secrets were found, subprocesses use argument arrays with `shell: false`, and workflows use minimum permissions with commit-pinned Actions.
- Review severity: Critical 0, High 0, Medium 0 unresolved, Low 0 unresolved. The relative cache path, archive symlink, generated build artifact, peer dependency, and unsafe cleanup findings were corrected and reverified.
- ESLint was replaced with oxlint because TypeScript 7.0 exceeded typescript-eslint's declared peer range; oxlint and strict `tsc` pass with no warnings or peer conflicts.
