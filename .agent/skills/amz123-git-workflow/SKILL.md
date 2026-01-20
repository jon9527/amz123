---
name: amz123-git-workflow
description: Standardized git workflow and commit conventions for the AMZ123 project. Use this when the user asks to "save changes", "commit", "push", or "sync".
---

# AMZ123 Git Workflow & Conventions

This skill ensures consistent commit messages and safe git operations for the AMZ123 project.

## Commit Message Convention

Format: `<type>(<scope>): <subject>`

### 1. Types
- **feat**: A new feature (e.g., adding a new calculator)
- **fix**: A bug fix (e.g., fixing weight calculation)
- **ui**: Visual changes only (e.g., icons, colors, layout) - *Project Specific*
- **refactor**: Code change that neither fixes a bug nor adds a feature (e.g., useMemo optimization)
- **perf**: A code change that improves performance
- **chore**: Build process or auxiliary tool changes (e.g., task.md updates)

### 2. Scopes (Recommended)
- `toolbox`: Operations Toolbox (OperationsToolbox.tsx & children)
- `product`: Product Library & Forms
- `replenishment`: Replenishment Logic & Advice
- `calc`: Financial/Logistics Calculators
- `components`: Shared UI components
- `global`: Project-wide changes

### 3. Subject Rules
- Use imperative, present tense: "change" not "changed" nor "changes"
- No period at the end
- Use Chinese or English (match User's language preference, currently Chinese/English mixed, default to Context)

## Workflow Steps

When the user asks to commit/push:

1.  **Check Status**:
    ```bash
    git status
    ```
2.  **Add Files**:
    ```bash
    git add .
    # OR specific files
    git add src/pages/TargetPage.tsx
    ```
3.  **Commit**:
    Generate a meaningful commit message based on the convention.
    ```bash
    git commit -m "feat(toolbox): integrate new icon system"
    ```
4.  **Push**:
    ```bash
    git push
    ```

## Example
> User: "save the new header design"

**Action**:
```bash
git add src/components/Header.tsx
git commit -m "ui(global): update header design with glassmorphism"
git push
```
