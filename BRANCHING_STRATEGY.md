# Branching Strategy

## Overview
This project follows a GitFlow-inspired branching strategy with the following main branches:

- **`main`**: Production-ready code
- **`develop`**: Integration branch for features and fixes

## Branch Structure

### Main Branches

#### `main` (Production)
- Contains production-ready code
- Should always be stable and deployable
- Only accepts merges from `develop` or `hotfix` branches
- Tagged with version numbers for releases

#### `develop` (Development)
- Integration branch for all features and fixes
- Contains the latest delivered development changes
- Source branch for feature branches
- Merged to `main` when ready for release

### Supporting Branches

#### `feature/*` (Feature Branches)
- Branch from: `develop`
- Merge back into: `develop`
- Naming convention: `feature/descriptive-name`
- Examples:
  - `feature/pdf-highlighting-improvement`
  - `feature/docx-text-extraction-fix`
  - `feature/ui-responsive-design`

#### `release/*` (Release Branches)
- Branch from: `develop`
- Merge back into: `main` and `develop`
- Naming convention: `release/v1.2.0`
- Used for final preparation of a new production release
- Bug fixes, documentation updates, and release-specific tasks

#### `hotfix/*` (Hotfix Branches)
- Branch from: `main`
- Merge back into: `main` and `develop`
- Naming convention: `hotfix/critical-bug-description`
- Used for urgent production fixes
- Examples:
  - `hotfix/pdf-rendering-crash`
  - `hotfix/security-vulnerability`

## Workflow

### Feature Development
1. Create feature branch from `develop`:
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/your-feature-name
   ```

2. Develop and commit your changes:
   ```bash
   git add .
   git commit -m "feat: add new feature description"
   ```

3. Push feature branch:
   ```bash
   git push -u origin feature/your-feature-name
   ```

4. Create Pull Request to merge into `develop`

5. After review and approval, merge into `develop`

### Release Process
1. Create release branch from `develop`:
   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b release/v1.2.0
   ```

2. Make release-specific changes (version updates, documentation)

3. Create Pull Request to merge into `main`

4. After merging to `main`, tag the release:
   ```bash
   git checkout main
   git pull origin main
   git tag -a v1.2.0 -m "Release version 1.2.0"
   git push origin v1.2.0
   ```

5. Merge release branch back into `develop`

### Hotfix Process
1. Create hotfix branch from `main`:
   ```bash
   git checkout main
   git pull origin main
   git checkout -b hotfix/critical-issue
   ```

2. Fix the issue and commit:
   ```bash
   git add .
   git commit -m "fix: critical issue description"
   ```

3. Create Pull Request to merge into `main`

4. After merging to `main`, tag the hotfix:
   ```bash
   git checkout main
   git pull origin main
   git tag -a v1.2.1 -m "Hotfix version 1.2.1"
   git push origin v1.2.1
   ```

5. Merge hotfix branch back into `develop`

## Commit Message Convention

We follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes
- `style`: Changes that do not affect the meaning of the code
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools

### Examples
```
feat: add PDF text highlighting functionality
fix(pdf): resolve coordinate alignment issues
docs: update README with installation instructions
refactor(utils): extract common file processing logic
test: add unit tests for citation extraction
```

## Branch Protection Rules

### `main` Branch
- Requires pull request reviews
- Requires status checks to pass
- No direct pushes allowed
- Must be up to date before merging

### `develop` Branch
- Requires pull request reviews
- Requires status checks to pass
- No direct pushes allowed

## Current Status
- ✅ `main` branch: Production-ready code
- ✅ `develop` branch: Active development integration
- 🔄 Feature branches: Created as needed for new features
- 📋 Release branches: Created when preparing releases
- 🚨 Hotfix branches: Created for urgent production fixes

## Getting Started
1. Clone the repository
2. Checkout the `develop` branch: `git checkout develop`
3. Create feature branches from `develop` for new work
4. Follow the commit message convention
5. Create Pull Requests for all changes
