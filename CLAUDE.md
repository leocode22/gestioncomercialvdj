# CLAUDE.md — AI Assistant Guide for gestioncomercialvdj

## Project Overview

**gestioncomercialvdj** is a commercial management system (gestión comercial) currently in its initialization phase. As of 2026-03-02 the repository contains only an initial README placeholder. This file documents the current state and establishes conventions for AI assistants working on this project as it evolves.

---

## Repository State

| Aspect | Status |
|---|---|
| Source code | Not yet present |
| Tech stack | Not yet decided |
| Dependencies | None |
| Tests | None |
| CI/CD | None |
| Database | None |
| Documentation | Minimal |

---

## Git Workflow

### Branches

- `master` — primary protected branch; never commit directly here
- `claude/<session-id>` — Claude AI working branches (auto-named)
- Feature branches should follow the pattern: `feature/<short-description>`
- Bug fix branches: `fix/<short-description>`

### Commit Conventions

Use the **Conventional Commits** format:

```
<type>(<scope>): <short summary>

[optional body]

[optional footer]
```

**Types:**
- `feat` — new feature
- `fix` — bug fix
- `refactor` — code restructuring without behavior change
- `docs` — documentation only
- `test` — adding or updating tests
- `chore` — maintenance tasks (dependencies, config, etc.)
- `style` — formatting, missing semicolons, etc.

**Examples:**
```
feat(clientes): add customer registration form
fix(facturas): correct VAT calculation rounding error
docs: update CLAUDE.md with API conventions
```

### Push Rules

- Always push with: `git push -u origin <branch-name>`
- Claude AI branches must start with `claude/` and end with the matching session ID
- Never force-push to `master`
- Confirm before pushing to any shared branch

---

## Development Conventions (to be updated as the stack is chosen)

### General Principles

1. **Keep it simple** — avoid over-engineering; implement only what is currently needed
2. **Spanish naming for domain objects** — since this is a Spanish-language commercial system, domain entities (clientes, facturas, pedidos, productos) should use Spanish names to match business language
3. **English for code constructs** — variable names, function names, file names, and comments in code should be in English unless they refer to a domain concept
4. **No dead code** — remove unused code rather than commenting it out
5. **Validate at boundaries** — validate user input and external API responses; trust internal logic

### File Organization (placeholder — update when stack is decided)

```
gestioncomercialvdj/
├── CLAUDE.md          # This file
├── README.md          # Project README
├── src/               # Source code (to be created)
│   ├── models/        # Data models / entities
│   ├── services/      # Business logic
│   ├── api/           # API routes / controllers
│   └── ui/            # Frontend components (if applicable)
├── tests/             # Test files
├── docs/              # Additional documentation
└── config/            # Configuration files
```

---

## AI Assistant Instructions

### When Working in This Repository

1. **Read before editing** — always read a file before modifying it
2. **Minimal changes** — only change what is directly requested; do not refactor surrounding code
3. **No speculative features** — do not add functionality that was not requested
4. **No unnecessary comments** — only add comments where logic is non-obvious
5. **Security first** — never introduce SQL injection, XSS, command injection, or other OWASP Top 10 vulnerabilities
6. **Ask before risky actions** — confirm before deleting files, dropping database tables, or force-pushing

### When the Tech Stack Is Established

Update this file with:
- How to install dependencies
- How to run the development server
- How to run tests
- How to build for production
- Linting and formatting commands
- Environment variable requirements (`.env.example`)
- Database migration commands (if applicable)

### Confirming Risky Operations

Before performing any of the following, pause and confirm with the user:
- Deleting files or directories
- Dropping or truncating database tables
- Force-pushing to any branch
- Modifying CI/CD pipelines
- Sending external API requests (emails, payments, etc.)
- Removing dependencies

---

## Security Notes

- Never commit secrets, API keys, passwords, or tokens to the repository
- Use environment variables for all sensitive configuration
- Add `.env` to `.gitignore` immediately when environment files are introduced
- Use parameterized queries or an ORM to prevent SQL injection when a database is added

---

## Updating This File

This CLAUDE.md should be updated whenever:
- A tech stack decision is made
- A new major dependency is added
- Development workflows change (new commands, new CI steps)
- Architectural patterns are established
- Team conventions are agreed upon

Last updated: 2026-03-02
