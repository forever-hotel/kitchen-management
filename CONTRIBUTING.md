# Contributing to Forever Hotel KMS

## Branch Strategy

The KMS repository uses the following branches:

### `main`

Production/release-ready code.

> Do not develop features directly on `main`.

### `develop`

Integration branch for active development.

All feature and fix branches are merged into `develop` through pull requests.

### Feature Branches

Format:

```text
feature/<issue-id>-<slug>
```

Examples:

```text
feature/3-kms-scaffold
feature/17-order-queue-api
feature/24-kanban-board
```

### Fix Branches

Format:

```text
fix/<issue-id>-<slug>
```

Examples:

```text
fix/53-cancellation-race
fix/55-kot-retry
```

## Starting Work

Always update `develop` first:

```bash
git checkout develop
git pull origin develop
```

Create the issue branch:

```bash
git checkout -b feature/<issue-id>-<slug>
```

## Conventional Commits

Commit messages follow:

```text
<type>(optional-scope): <description>
```

### Common Types

| Type | Purpose |
|---|---|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation |
| `test` | Test changes |
| `refactor` | Internal restructuring |
| `perf` | Performance improvement |
| `ci` | CI/CD change |
| `chore` | Tooling/configuration |

### Examples

```text
feat: scaffold KMS backend
feat(orders): add kitchen order queue endpoint
fix(orders): prevent invalid ready transition
test(orders): add order state transition tests
docs: document FOSS-KMS ownership
ci: add KMS build workflow
chore: configure repository
```

## Pull Requests

Feature/fix branches must target:

```text
develop
```

Example:

```text
feature/17-order-queue-api
          ↓
       develop
```

Before opening the pull request:

```bash
git checkout develop
git pull origin develop

git checkout feature/<issue-id>-<slug>
git merge develop
```

Resolve conflicts locally and test before pushing.

## Issue Traceability

Every implementation pull request must reference its corresponding GitHub issue.

Example:

```text
Closes #17
```

## Release Flow

Normal development:

```text
feature/*
    ↓
develop
    ↓
main
```

`main` should contain only reviewed/release-ready code.
