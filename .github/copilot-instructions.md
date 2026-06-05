# InvestaLens — Copilot Instructions

## Documentation-First Rule (MANDATORY)

**Before using ANY package, tool, or framework — always read its official documentation first.**

- Your internal knowledge is assumed to be out of date. Never trust it.
- Before writing install commands, configuration, or usage code for any package:
  1. Consult `docs/KNOWLEDGE.md` first — it contains verified install commands, configurations, and gotchas for every package in this project
  2. If the package is not in KNOWLEDGE.md, fetch and read the official docs/homepage for that package
  3. Verify the current install command
  4. Verify the current API and usage patterns
  5. Document the source URL in plan files
  6. Update `docs/KNOWLEDGE.md` with any new findings
- This applies to ALL packages — JavaScript, Python, CLI tools, frameworks, everything.
- "I already know how to use X" is never acceptable. Always verify against KNOWLEDGE.md or official docs.
- If the package is in KNOWLEDGE.md, use those verified details. Do not override them with internal knowledge.

## Package Managers

- **Node.js**: `pnpm` (not npm or yarn)
- **Python**: `uv` (not pip, poetry, or conda)
  - Use `uv init` to create projects
  - Use `uv add` to add dependencies
  - Use `uv run` to execute scripts
  - Never use `pip install` or `uv pip install`

## Scaffolding

- The shadcn/ui CLI (`pnpm dlx shadcn@latest init`) is the sole project scaffolding tool
- Do NOT use `create-next-app`

## Environment

- Local machine: Windows, no admin, no npm (corporate proxy blocks it)
- Execution: GitHub Codespaces (Ubuntu, Node.js 22, Python 3.12)
- All install/test commands run in Codespaces, not locally
