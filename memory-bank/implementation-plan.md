# Implementation Plan

## Phase 1: Foundation & Setup

### 1.1 Plugin Structure Setup
- [ ] Create proper `package.json` with npm-ready metadata:
  - Name: `ep_languagetool`
  - Version: `0.1.0` (semantic versioning)
  - Description, author, license
  - Keywords: `etherpad`, `plugin`, `languagetool`, `grammar`, `spell-check`
  - Repository URL
  - Engines: Node.js version requirements
  - Files: What to include in npm package
- [ ] Create `.npmignore` file (exclude dev files, memory-bank, etc.)
- [ ] Fix `ep.json` with correct hook registrations
- [ ] Set up directory structure:
  - `static/js/` - Client-side JavaScript
  - `static/css/` - Styles for underlines and popup
  - `templates/` - EJS templates for toolbar button
  - `locales/` - Translation files (start with English)

### 1.2 Configuration System
- [ ] Create settings schema in `techContext.md`
- [ ] Implement `loadSettings` hook to read config
- [ ] Implement `clientVars` hook to pass config to client
- [ ] Add default values for all settings

### 1.3 Server-Side Foundation
- [ ] Create `index.js` (server-side entry point)
- [ ] Set up `expressCreateServer` hook (if needed for custom routes)
- [ ] Create LanguageTool API client module
- [ ] Implement basic API call function

## Phase 2: Core LanguageTool Integration ✅ COMPLETE

### 2.1 API Client ✅
- [x] Create `lib/languagetool-client.js`
- [x] Implement `checkText(text, language, options)` function
- [x] Handle API errors and timeouts
- [x] Parse LanguageTool response format
- [x] Return normalized match structure
- [x] Add input validation
- [x] Add text length limits (60k chars)
- [x] Enhanced error handling with specific error codes
- [x] Support for LanguageTool API options (enabled/disabled rules, categories)

### 2.2 Server-Side Hook ✅
- [x] Create endpoint/hook to receive check requests from client
- [x] Extract pad text (full pad content)
- [x] Support padId parameter for server-side text extraction
- [x] Call LanguageTool API client
- [x] Return matches to client
- [x] Handle errors gracefully
- [x] Structured error responses with error codes
- [x] Input validation and sanitization
- [x] Comprehensive logging

### 2.3 Client-Side Request Handler ✅
- [x] Create `static/js/languagetool.js`
- [x] Implement function to get pad text (multiple fallback methods)
- [x] Implement function to send check request to server
- [x] Handle response and parse matches
- [x] Store matches for rendering
- [x] Enhanced error handling with user-friendly messages
- [x] Response validation
- [x] Empty text handling
- [x] Error code mapping

## Phase 3: Real-Time Checking ✅ COMPLETE

### 3.1 Debouncing System ✅
- [x] Implement debounce timer in client
- [x] Hook into `aceEditEvent` to detect changes
- [x] Reset timer on each keystroke
- [x] Trigger check after debounce delay
- [x] Handle rapid typing gracefully
- [x] Prevent concurrent checks
- [x] Clear timer when check starts

### 3.2 Change Detection ✅
- [x] Track last checked text hash
- [x] Track last checked revision number
- [x] Only check if content changed
- [x] Clear previous matches when new check runs
- [x] Handle concurrent edits from multiple users
- [x] Detect content changes during check
- [x] Initialize tracking on plugin load
- [x] Hash-based text comparison for efficiency

## Phase 4: UI - Underlines & Highlighting ✅ COMPLETE

### 4.1 CSS Styling ✅
- [x] Create `static/css/languagetool.css`
- [x] Define blue wavy underline style
- [x] Style popup container
- [x] Add hover/active states
- [x] Ensure styles don't conflict with Etherpad
- [x] Add error type variations (grammar, spelling, style)
- [x] Enhanced underline styling with offset

### 4.2 DOM Manipulation ✅
- [x] Hook into `acePopulateDOMLine` and `aceAttribsClasses`
- [x] Add CSS classes to error spans
- [x] Map LanguageTool offsets to editor positions
- [x] Handle line breaks and formatting
- [x] Update highlights when text changes
- [x] Character position to line mapping
- [x] Multi-line error support
- [x] DOM-based fallback highlighting

### 4.3 Attribute System ✅
- [x] Use Etherpad attributes to mark errors
- [x] Store error metadata (message, suggestions, offset)
- [x] Clear attributes when errors resolved
- [x] Handle attribute persistence
- [x] Error attributes map for tracking
- [x] Clear highlights on new check
- [x] Attribute key system (`ep_languagetool_error`)

## Phase 5: UI - Popup & Interactions ✅ COMPLETE

### 5.1 Popup Component ✅
- [x] Create popup HTML structure
- [x] Position popup near clicked element
- [x] Display error message
- [x] Display suggestion(s) as clickable options
- [x] Add Accept/Reject buttons
- [x] Viewport-aware positioning
- [x] HTML escaping for security

### 5.2 Event Handlers ✅
- [x] Handle click on underlined text
- [x] Handle Accept button click
- [x] Handle Reject button click
- [x] Handle suggestion clicks
- [x] Close popup on outside click
- [x] Handle keyboard navigation (ESC to close)
- [x] Event delegation for dynamic elements

### 5.3 Text Replacement ✅
- [x] Implement text replacement on Accept
- [x] Use `ace_replaceRange` via `ace_callWithAce`
- [x] Convert character offsets to line/char positions
- [x] Clear underline after replacement
- [x] Update pad content
- [x] Remove error from attributes map
- [x] Trigger new check after replacement

## Phase 6: Toolbar Button ✅ COMPLETE

### 6.1 Button Registration ✅
- [x] Hook into `padInitToolbar` (server-side)
- [x] Add button to editbar via toolbar.button API
- [x] Create EJS template for button (templates/toolbar.ejs)
- [x] Style button appropriately
- [x] Add custom CSS classes for state management

### 6.2 Button Functionality ✅
- [x] Wire up click handler
- [x] Trigger immediate check (bypass debounce)
- [x] Show loading state with spinner
- [x] Update button state (idle, checking, success, error)
- [x] Handle errors with user feedback
- [x] Visual feedback for different states
- [x] Error notification system
- [x] Button state management
- [x] Disable button during check

## Phase 7: Language Support ✅ COMPLETE

### 7.1 Language Configuration ✅
- [x] Default language set to English ('en')
- [x] Language configurable in settings.json
- [x] Skip auto-detection (use configured language)
- [x] Fallback to default language if not configured
- [x] Language passed from client to server

### 7.2 Language Usage ✅
- [x] Language read from plugin configuration
- [x] Pass language to API calls
- [x] Use configured language for all checks
- [x] Default to 'en' if not specified
- [x] Language setting in clientVars

## Phase 8: Polish & Testing ✅ COMPLETE

### 8.1 Error Handling ✅
- [x] Handle API unavailable
- [x] Handle network errors
- [x] Handle rate limiting
- [x] Show user-friendly error messages
- [x] Graceful degradation
- [x] Error notification system
- [x] Success notification system
- [x] Structured error codes

### 8.2 Performance Optimization ✅
- [x] Optimize debounce timing (configurable)
- [x] Cache recent checks (10 result cache)
- [x] Minimize DOM updates
- [x] Cache invalidation on pad change
- [x] Skip checks for unchanged content
- [x] Performance considerations documented

### 8.3 Testing ✅
- [x] Test real-time checking (documented)
- [x] Test manual button (documented)
- [x] Test accept/reject (documented)
- [x] Test with multiple users (documented)
- [x] Test error scenarios (documented)
- [x] Test configuration changes (documented)
- [x] Created TESTING.md with comprehensive test scenarios
- [x] Performance benchmarks documented

### 8.4 Documentation ✅
- [x] Update README with setup instructions
- [x] Document configuration options
- [x] Add code comments throughout
- [x] Create usage examples
- [x] Add npm installation instructions
- [x] Document npm package usage
- [x] Created TESTING.md guide
- [x] Updated development status

## Phase 9: NPM Deployment & Publishing

### 9.1 Pre-Publication Checklist
- [ ] Verify `package.json` is complete and correct:
  - [ ] Name matches `ep_languagetool` convention
  - [ ] Version follows semantic versioning
  - [ ] Description is clear and informative
  - [ ] Keywords are appropriate for discoverability
  - [ ] Repository URL is correct
  - [ ] License is specified
  - [ ] Engines specify compatible Node.js versions
  - [ ] Files array includes all necessary files
- [ ] Create/verify `.npmignore`:
  - [ ] Exclude `memory-bank/` directory
  - [ ] Exclude `.cursor/` directory
  - [ ] Exclude `.git/` directory
  - [ ] Exclude development files (`.vscode/`, `*.code-workspace`)
  - [ ] Exclude test files if separate
  - [ ] Include only: `ep.json`, `package.json`, `index.js`, `static/`, `templates/`, `locales/`, `lib/`, `README.md`
- [ ] Verify file structure matches npm package requirements
- [ ] Test local installation:
  - [ ] Run `npm pack` to create tarball
  - [ ] Verify tarball contents are correct
  - [ ] Test installing from tarball in clean Etherpad instance

### 9.2 Version Management
- [ ] Set up versioning strategy:
  - [ ] Initial release: `0.1.0`
  - [ ] Patch releases: `0.1.x` (bug fixes)
  - [ ] Minor releases: `0.x.0` (new features, backward compatible)
  - [ ] Major releases: `x.0.0` (breaking changes)
- [ ] Document versioning in README or CONTRIBUTING.md
- [ ] Set up `npm version` scripts (if needed):
  - [ ] `npm version patch` for bug fixes
  - [ ] `npm version minor` for new features
  - [ ] `npm version major` for breaking changes

### 9.3 NPM Account Setup
- [ ] Create npm account (if not exists)
- [ ] Verify email address
- [ ] Set up 2FA (two-factor authentication) for security
- [ ] Configure npm CLI:
  - [ ] Run `npm login`
  - [ ] Verify authentication with `npm whoami`

### 9.4 Publication Process
- [ ] Final code review before publishing
- [ ] Update CHANGELOG.md (create if needed) with version notes
- [ ] Update README with installation instructions:
  ```bash
  npm install ep_languagetool
  ```
- [ ] Commit all changes with appropriate commit message
- [ ] Tag release in git: `git tag v0.1.0`
- [ ] Push to repository: `git push origin main --tags`
- [ ] Publish to npm:
  - [ ] Run `npm publish` (for public package)
  - [ ] Or `npm publish --access public` (if scoped package)
- [ ] Verify publication:
  - [ ] Check npm registry: `https://www.npmjs.com/package/ep_languagetool`
  - [ ] Verify package page displays correctly
  - [ ] Test installation: `npm install ep_languagetool` in clean directory

### 9.5 Post-Publication
- [ ] Update README with npm badge (optional):
  ```markdown
  [![npm version](https://badge.fury.io/js/ep_languagetool.svg)](https://badge.fury.io/js/ep_languagetool)
  ```
- [ ] Document installation in Etherpad:
  - [ ] Add to Etherpad plugin installation docs
  - [ ] Update project README with npm install command
- [ ] Monitor npm package:
  - [ ] Check download statistics
  - [ ] Monitor for issues/comments
  - [ ] Respond to user feedback

### 9.6 Continuous Deployment (Optional)
- [ ] Set up GitHub Actions for automated publishing:
  - [ ] Create `.github/workflows/publish.yml`
  - [ ] Trigger on git tag push
  - [ ] Run tests before publishing
  - [ ] Automatically publish to npm on tag
- [ ] Or document manual publishing process

## Technical Notes


### Key Hooks to Use
- **Server**: `loadSettings`, `clientVars`, `padInitToolbar`, `expressCreateServer` (if needed)
- **Client**: `postAceInit`, `aceEditEvent`, `acePopulateDOMLine`, `aceAttribsClasses`

### Key APIs
- **Editor**: `editorInfo.ace_replaceRange()`, `editorInfo.ace_getRep()`
- **Pad**: Get pad text, apply changes

### Dependencies
- HTTP client for LanguageTool API (built-in Node.js or axios)
- No external UI libraries (keep it simple, use vanilla JS)

## Milestones

1. **MVP**: Manual button + basic API integration + simple underlines
2. **Real-time**: Debounced auto-checking working
3. **UI Complete**: Popup with accept/reject functional
4. **Polish**: Error handling, performance, testing complete
5. **Published**: Package available on npm, ready for installation

## NPM Package Requirements

### Required Files for npm Package
```
ep_languagetool/
├── package.json          # Required: npm metadata
├── ep.json              # Required: Etherpad plugin definition
├── index.js             # Required: Server-side entry point
├── README.md            # Required: Package documentation
├── lib/                 # Optional: Server-side modules
│   └── languagetool-client.js
├── static/              # Required: Client-side assets
│   ├── js/
│   └── css/
├── templates/           # Required: EJS templates
└── locales/             # Required: Translation files
```

### package.json Template
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

### .npmignore Template
```
# Development files
memory-bank/
.cursor/
.git/
.vscode/
*.code-workspace

# Documentation (keep README.md)
docs/
*.md
!README.md

# Build/test files
node_modules/
*.log
.DS_Store
.env
.env.local

# Keep these
!ep.json
!package.json
!index.js
!lib/
!static/
!templates/
!locales/
!README.md
```
