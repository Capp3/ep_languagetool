# Project Brief: Etherpad LanguageTool Plugin

## Overview
Build an Etherpad plugin (`ep_languagetool`) that integrates LanguageTool grammar and style checking capabilities into the Etherpad collaborative editor.

## Goals
- Integrate LanguageTool API with Etherpad
- Provide grammar/style checking functionality within the editor
- Support multiple languages
- Maintain real-time collaborative editing performance
- Provide intuitive UI for displaying suggestions

## Key Resources
- **Etherpad Documentation**: https://etherpad.org/doc/v1.5.1/#index_plugins
- **LanguageTool**: https://github.com/languagetool-org/languagetool
- **Reference Implementation**: https://github.com/Capp3/cothrom
- **Etherpad Context7**: https://context7.com/ether/etherpad-lite/llms.txt?tokens=10000

## Project Structure
```
ep_languagetool/
├── ep.json              # Plugin definition (hooks registration)
├── package.json         # NPM package metadata
├── static/             # Client-side assets (JS, CSS)
├── templates/          # EJS templates for UI
├── locales/           # Translation files
└── index.js           # Server-side entry point
```

## Target Etherpad Version
- Primary: v1.5.1 (as referenced in docs)
- Compatibility: TBD based on requirements

## Open Questions
See `memory-bank/activeContext.md` for current questions and decisions needed.
