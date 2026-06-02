# Contributing to InvestaLens

Thank you for your interest in contributing to InvestaLens!

## Development Workflow

1. Fork and clone the repository
2. Create a feature branch from `main`
3. Make your changes
4. Write/update tests as needed
5. Ensure all tests pass
6. Submit a pull request

## Branch Naming

- `feature/` – new features
- `fix/` – bug fixes
- `docs/` – documentation changes
- `refactor/` – code refactoring

## Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add portfolio import from Sharesight
fix: correct FX conversion for NZD holdings
docs: update API integration guide
```

## Code Style

- TypeScript strict mode enabled
- ESLint + Prettier for formatting
- Prefer named exports over default exports
- Use meaningful variable and function names

## Pull Requests

- Keep PRs focused on a single concern
- Include a clear description of changes
- Reference related issues where applicable
- Ensure CI checks pass before requesting review
