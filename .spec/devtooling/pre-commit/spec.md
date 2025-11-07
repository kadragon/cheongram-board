# Pre-commit Quality Gate Specification

```yaml
spec_id: SPEC-devtool-pre-commit-1
created: 2025-11-06
status: draft
owner: devex-team
agents:
  base_profile: .agents/profiles/cloudflare-workers@2025-11-06.md
  catalogs: []
```

## 1. Overview

### 1.1 Objective
Establish a Git pre-commit workflow that enforces repository quality gates by running linting and TypeScript type checking before every commit.

### 1.2 Motivation
- Align local developer workflow with profile quality gates (linting + type checking) to catch regressions early.
- Provide consistent automation regardless of developer tooling preferences.
- Prevent commits that violate ESLint rules or break TypeScript type safety.

## 2. Behaviour (Given-When-Then)

### AC-1: Lint Blocking
**Given** a developer attempts to commit staged files
**When** the pre-commit hook executes
**Then** `npm run lint` must complete successfully or the commit is aborted.

### AC-2: Type Check Blocking
**Given** a developer attempts to commit staged files
**When** the pre-commit hook executes
**Then** `npm run typecheck` must complete successfully or the commit is aborted.

### AC-3: Fast Opt-out for Automation
**Given** CI or scripted automation needs to bypass the hook intentionally
**When** the environment variable `SKIP_PRECOMMIT` is set to `1`
**Then** the hook should exit immediately with status 0 after logging a skip message.

## 3. Examples

| Scenario | Input | Expected Behaviour |
| --- | --- | --- |
| Passing hooks | Working tree with consistent code | `npm run lint` and `npm run typecheck` both succeed; commit proceeds |
| Lint failure | ESLint rule violation introduced | Hook exits non-zero after `npm run lint`; commit is blocked |
| Type failure | TypeScript type error introduced | Hook exits non-zero after `npm run typecheck`; commit is blocked |
| Skip variable | `SKIP_PRECOMMIT=1 git commit` | Hook prints "Skipping pre-commit" and exits 0 |

## 4. Tooling Interface

### 4.1 Commands
- `npm run lint` — invokes Next.js ESLint configuration with `NEXT_DISABLE_ESLINT_TUI=1` to suppress interactive prompts.
- `npm run typecheck` — runs the TypeScript compiler in no-emit mode.

### 4.2 Hook Location
- `.husky/pre-commit` executes shell script orchestrating the commands.

## 5. Data & State
- Requires npm script `typecheck` defined in `package.json`.
- `.eslintrc.json` must extend `next/core-web-vitals` so `next lint` can run non-interactively.
- Hook script must be executable (`chmod +x`).
- devDependency `husky` ensures Git `core.hooksPath` is set via `npm run prepare`.

## 6. Tracing

| Spec ID | Test ID | Implementation |
| --- | --- | --- |
| SPEC-devtool-pre-commit-1 | TEST-devtool-pre-commit-lint | `.husky/pre-commit` lint block |
| SPEC-devtool-pre-commit-1 | TEST-devtool-pre-commit-typecheck | `.husky/pre-commit` type check block |
| SPEC-devtool-pre-commit-1 | TEST-devtool-pre-commit-skip | `.husky/pre-commit` env skip logic |

## 7. Open Questions
- Outstanding TypeScript errors in legacy modules currently fail `npm run typecheck`; tracked via `.tasks/backlog.md`.
