# Specifications Directory

This directory contains all functional specifications following the SDD (Spec-Driven Development) methodology.

## Structure

```
.spec/
  README.md                    # This file
  devtooling/                  # Development tooling specs
  migration/                   # Migration specs
    supabase-to-cloudflare/   # Phase 1: Supabase → D1
    opennext-to-workers/      # Phase 2: OpenNext → Pure Workers
    testing/                  # Testing specifications
```

## Specification Format

Each specification follows this structure:

```yaml
spec_id: SPEC-category-name-version
title: "Specification Title"
status: draft | active | completed | deprecated
priority: critical | high | medium | low
created: YYYY-MM-DD
owner: team-name

given_when_then:
  - given: "precondition"
    when: "action"
    then: "expected outcome"

acceptance_criteria:
  - AC-1: Description
  - AC-2: Description

linked_tasks:
  - TASK-001
  - TASK-002

linked_tests:
  - TEST-001
  - TEST-002
```

## Active Specifications

### Development Tooling
- **SPEC-devtool-pre-commit-1**: Pre-commit hooks for lint and type-check
  - Status: ✅ Completed (2025-11-06)
  - Files: `devtooling/pre-commit/spec.md`

### Migration Specifications

#### Phase 1: Supabase to Cloudflare D1
- **SPEC-migration-supabase-to-cloudflare-1**: Database and Auth migration
  - Status: ✅ Completed (2025-11-06, with documented blockers)
  - Files: `migration/supabase-to-cloudflare/spec.md`
  - Linked Tasks: TASK-migration-001 through TASK-migration-018
  - Outcome: D1 fully functional, public APIs working, admin auth blocked by env var issue

#### Phase 2: OpenNext to Pure Workers
- **SPEC-migration-opennext-to-workers-1**: Framework migration
  - Status: 📋 Planned
  - Files: `migration/opennext-to-workers/spec.md`
  - Linked Tasks: TASK-workers-001 through TASK-workers-004
  - Estimated: 5-7 calendar days

#### Testing
- **SPEC-migration-testing-1**: Comprehensive API testing
  - Status: ✅ Completed (2025-11-06)
  - Files: `migration/testing/spec.md`
  - Linked Tests: 26 automated tests
  - Test Script: `migration/testing/api-tests.sh`

## Creating New Specifications

1. Create a directory: `.spec/category/feature-name/`
2. Create `spec.md` (or `spec.yaml` for structured data)
3. Assign a unique `spec_id`: `SPEC-category-name-version`
4. Define Given-When-Then scenarios
5. List acceptance criteria
6. Link to tasks and tests
7. Update this README with the new spec

## Traceability

Every spec must be traceable to:
- **Tasks** (`.tasks/backlog.yaml`, `current.yaml`, `done.yaml`)
- **Tests** (test files with TEST-* IDs)
- **Code** (via comments: `// Trace: SPEC-ID`)

## Governance

Specifications are managed according to:
- `.governance/memory.md` - Project context and lessons learned
- `.governance/patterns.md` - Reusable implementation patterns
- `.governance/coding-style.md` - Code standards

## Review Cycle

- **Active specs**: Review monthly
- **Completed specs**: Archive after 6 months if no longer referenced
- **Deprecated specs**: Move to `archive/` directory

---

**Last Updated**: 2025-11-06
**Maintainer**: Migration Team
