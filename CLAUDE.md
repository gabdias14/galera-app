# CLAUDE.md

Guidance for Claude Code and other AI assistants working in this repository.

## Status: scaffold, not a description of a codebase

**This repository is currently empty.** As of the latest commit it contains only
`README.md` (a single heading line) and this file. There is no source code, no
package manifest, no build tooling, no test suite, and no CI configuration.

Everything below is therefore process guidance, not a description of an existing
architecture. Do not infer a stack, framework, or layout from this file — there
isn't one yet.

## First thing to do in any session

Check whether this file is still accurate before relying on it:

```bash
git log --oneline -10
ls -la
```

If the repository now has real code, **this file is stale**. Replace the sections
below with the actual project structure, commands, and conventions rather than
layering new text on top of the scaffold. A CLAUDE.md that describes a codebase
that doesn't match reality is worse than no CLAUDE.md at all.

## Repository facts

- Remote: `gabdias14/galera-app`
- Default branch: `main`
- History: a single initial commit
- Tracked files: `README.md`, `CLAUDE.md`

## Working conventions

Until the project establishes its own, follow these:

- **Branching** — do not commit directly to `main`. Work on a feature branch and
  open a pull request.
- **Commits** — one logical change per commit, imperative subject line
  ("Add user model", not "added user model").
- **Verify before claiming done** — once a toolchain exists, actually run the
  build, linter, and tests and report the real output. Do not report success for
  a command you did not run.
- **Match surrounding code** — when the codebase has a style, follow it over any
  personal default. When it does not yet, use the idiomatic conventions of the
  language and framework being introduced.
- **Ask before choosing the stack** — the first substantive change to this
  repository picks its language, framework, and package manager, and that
  decision is the user's, not an assistant's. If the request does not specify,
  ask rather than defaulting.

## What to fill in once the project exists

When real code lands, this file should document:

1. **Overview** — what the app does and who it is for.
2. **Structure** — the top-level directories and what belongs in each.
3. **Commands** — the exact install, dev-server, build, test, lint, and
   typecheck invocations, copy-pasteable.
4. **Architecture** — the handful of non-obvious decisions a newcomer would
   otherwise get wrong: data flow, module boundaries, state management,
   how the pieces communicate.
5. **Testing** — framework, where tests live, how to run a single test.
6. **Conventions** — naming, error handling, imports, formatting rules that are
   enforced rather than merely preferred.
7. **Gotchas** — required environment variables, external services, setup steps
   that are easy to miss.

Keep it to what is genuinely non-obvious from reading the code. Length is not the
goal; accuracy is.
