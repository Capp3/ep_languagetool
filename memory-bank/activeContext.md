# Active Context

## Current Phase
**Initialization & Planning** - Building memory bank and gathering requirements

## Key Decisions Made ✅

### 1. LanguageTool Deployment ✅
- **Configurable URL in Etherpad settings** (`settings.json`)
- Default: Local Docker-hosted API
- Users can configure their own LanguageTool server URL

### 2. Checking Trigger ✅
- **Real-time checking** (primary mode)
- **Manual trigger button** (fallback/on-demand)
- Debounce delay: TBD (likely 2-3 seconds after typing stops)

### 3. Scope of Checking ✅
- **Full pad content** checking
- Process entire pad text on each check

### 4. UI/UX Design ✅
- **Blue underlines** (similar to spell-check styling)
- **Popup with accept/reject** options on click/hover
- Keep it simple - no complex sidebars or panels
- Show all errors with underlines, popup appears on interaction

### 5. Language Support ✅
- **Auto-detect** or **user-selectable** in settings
- **Default: English**
- Language setting configurable per pad or globally

### 6. Configuration & Permissions ✅
- Settings in Etherpad `settings.json`:
  - LanguageTool API URL
  - Default language
  - Enable/disable auto-checking
- Per-pad settings: TBD (may use pad attributes)

### 7. Performance & Scalability ✅
- **Max 3 concurrent users** per pad
- **10-20 page pads** maximum
- **Latency acceptable** (real-time with debouncing)
- Manual trigger button for immediate checking

### 8. Reference Implementation ✅
- **cothrom**: Working Etherpad + LanguageTool deployment
- Review needed to understand implementation patterns
- Use as reference for working approach

## Next Steps
1. Review reference implementation (cothrom)
2. Answer key questions above
3. Create detailed implementation plan
4. Set up development environment
