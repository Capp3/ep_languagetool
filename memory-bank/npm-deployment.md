# NPM Deployment Guide

## Overview
This document outlines the process for publishing `ep_languagetool` to the npm registry for easy installation by Etherpad users.

## Prerequisites

### NPM Account
1. Create account at https://www.npmjs.com/signup
2. Verify email address
3. Enable 2FA (two-factor authentication) for security
4. Login via CLI: `npm login`

### Package Requirements
- Valid `package.json` with all required fields
- Unique package name (`ep_languagetool`)
- Proper version number (semantic versioning)
- All necessary files included

## Package Structure

### Files to Include
```
ep_languagetool/
├── package.json          # Required
├── ep.json              # Required
├── index.js             # Required
├── README.md            # Required
├── lib/                 # Server-side modules
├── static/              # Client-side assets
├── templates/           # EJS templates
└── locales/             # Translation files
```

### Files to Exclude (.npmignore)
- `memory-bank/` - Development documentation
- `.cursor/` - IDE configuration
- `.git/` - Git repository
- `.vscode/` - Editor configuration
- `*.code-workspace` - Workspace files
- `node_modules/` - Dependencies
- `*.log` - Log files
- `.DS_Store` - OS files
- `docs/` - Additional documentation (keep README.md)

## package.json Template

```json
{
  "name": "ep_languagetool",
  "version": "0.1.0",
  "description": "LanguageTool grammar and style checking plugin for Etherpad",
  "keywords": [
    "etherpad",
    "plugin",
    "languagetool",
    "grammar",
    "spell-check",
    "proofreading"
  ],
  "author": "Your Name <your.email@example.com>",
  "license": "Apache-2.0",
  "repository": {
    "type": "git",
    "url": "https://github.com/yourusername/ep_languagetool.git"
  },
  "engines": {
    "node": ">=10.0.0"
  },
  "files": [
    "ep.json",
    "index.js",
    "lib/",
    "static/",
    "templates/",
    "locales/",
    "README.md"
  ],
  "peerDependencies": {
    "ep_etherpad-lite": ">=1.5.1"
  }
}
```

## Version Management

### Semantic Versioning
- **MAJOR** (x.0.0): Breaking changes
- **MINOR** (0.x.0): New features, backward compatible
- **PATCH** (0.0.x): Bug fixes

### Version Commands
```bash
npm version patch   # 0.1.0 -> 0.1.1
npm version minor   # 0.1.0 -> 0.2.0
npm version major   # 0.1.0 -> 1.0.0
```

## Pre-Publication Checklist

- [ ] All code is complete and tested
- [ ] `package.json` is correct and complete
- [ ] `.npmignore` is configured properly
- [ ] README.md includes installation instructions
- [ ] Version number is appropriate
- [ ] No sensitive data in package
- [ ] Git repository is up to date
- [ ] All dependencies are listed correctly

## Testing Before Publishing

### 1. Create Package Tarball
```bash
npm pack
```
This creates `ep_languagetool-0.1.0.tgz` - verify contents are correct.

### 2. Test Installation from Tarball
```bash
# In a test Etherpad instance
npm install /path/to/ep_languagetool-0.1.0.tgz
```

### 3. Verify Package Contents
```bash
tar -tzf ep_languagetool-0.1.0.tgz
```

## Publication Process

### 1. Final Checks
```bash
# Verify you're logged in
npm whoami

# Check package name availability (if first time)
npm search ep_languagetool
```

### 2. Update Version (if needed)
```bash
npm version patch   # or minor/major
```

### 3. Commit and Tag
```bash
git add .
git commit -m "Release v0.1.0"
git tag v0.1.0
git push origin main --tags
```

### 4. Publish to npm
```bash
npm publish
```

For scoped packages (if needed):
```bash
npm publish --access public
```

### 5. Verify Publication
- Check npm registry: https://www.npmjs.com/package/ep_languagetool
- Test installation: `npm install ep_languagetool`

## Post-Publication

### Update Documentation
- Add npm badge to README (optional):
  ```markdown
  [![npm version](https://badge.fury.io/js/ep_languagetool.svg)](https://badge.fury.io/js/ep_languagetool)
  ```

### Installation Instructions
Add to README:
```markdown
## Installation

Install via npm:
```bash
npm install ep_languagetool
```

Or add to `package.json`:
```json
{
  "dependencies": {
    "ep_languagetool": "^0.1.0"
  }
}
```
```

## Updating Published Package

### For Bug Fixes (Patch)
```bash
npm version patch
git push origin main --tags
npm publish
```

### For New Features (Minor)
```bash
npm version minor
git push origin main --tags
npm publish
```

### For Breaking Changes (Major)
```bash
npm version major
git push origin main --tags
npm publish
```

## Troubleshooting

### Package Name Already Taken
- Choose different name or contact npm support
- Consider scoped package: `@yourusername/ep_languagetool`

### Authentication Errors
```bash
npm login
npm whoami  # Verify login
```

### Publishing Errors
- Check npm registry status
- Verify package.json is valid: `npm pack --dry-run`
- Check for typos in package name

## Best Practices

1. **Always test locally** before publishing
2. **Use semantic versioning** consistently
3. **Update CHANGELOG.md** with each release
4. **Tag releases** in git
5. **Keep README.md** up to date
6. **Monitor package** for issues/comments
7. **Respond promptly** to user feedback

## Continuous Deployment (Optional)

### GitHub Actions Workflow
Create `.github/workflows/publish.yml`:
```yaml
name: Publish to npm

on:
  release:
    types: [created]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '16'
          registry-url: 'https://registry.npmjs.org'
      - run: npm ci
      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{secrets.NPM_TOKEN}}
```
