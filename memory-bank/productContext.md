# Product Context

## User Experience

### Primary Use Case
Users collaboratively edit documents in Etherpad and want real-time grammar/style checking similar to spell-check functionality.

### User Workflow
1. User opens pad and starts typing
2. After 2-3 seconds of inactivity, grammar check runs automatically
3. Blue underlines appear on detected errors
4. User clicks/hovers on underlined text
5. Popup appears with suggestion(s)
6. User accepts or rejects suggestion
7. Text updates accordingly (if accepted)

### Manual Check
- Toolbar button "Check Grammar" available
- Clicking triggers immediate check (bypasses debounce)
- Useful for checking existing content or forcing refresh

## Configuration

### Etherpad Settings (`settings.json`)
```json
{
  "ep_languagetool": {
    "apiUrl": "http://localhost:8010/v2/check",
    "defaultLanguage": "en",
    "autoCheck": true,
    "debounceDelay": 2000
  }
}
```

### Settings Options
- `apiUrl`: LanguageTool API endpoint (default: local Docker)
- `defaultLanguage`: Language code for checking (default: "en" - English). Must be explicitly set in settings.json. No auto-detection. Supported codes include: `en`, `de`, `fr`, `es`, `pt`, `it`, `nl`, `pl`, `ru`, `ja`, etc.
- `autoCheck`: Enable/disable real-time checking (default: true)
- `debounceDelay`: Milliseconds to wait after typing stops (default: 2000)

**Language Configuration:**
- The plugin uses the language specified in `defaultLanguage` for all grammar checks
- Language auto-detection is not implemented
- If `defaultLanguage` is not specified, it defaults to English (`en`)
- To change the language, update `defaultLanguage` in `settings.json` and restart Etherpad

## Visual Design

### Underlines
- **Color**: Blue (distinct from red spell-check)
- **Style**: Wavy underline (CSS `text-decoration: underline wavy`)
- **Thickness**: Subtle, not distracting

### Popup
- **Trigger**: Click or hover on underlined text
- **Content**: 
  - Error message
  - Suggested replacement(s)
  - Accept/Reject buttons
- **Position**: Near cursor/click point
- **Styling**: Simple, clean, minimal

### Toolbar Button
- **Location**: Editbar (with other formatting buttons)
- **Icon**: Grammar/spell-check icon
- **Label**: "Check Grammar" or icon-only
- **State**: Active/inactive indicator

## Constraints

### Performance
- Max 3 concurrent users per pad
- Pads up to 10-20 pages
- Latency acceptable (2-3 second debounce)
- Full pad checking acceptable for this scale

### Privacy
- LanguageTool API URL configurable
- Users can use self-hosted instance
- No external API calls by default (local Docker)

## Success Criteria
- Real-time checking works smoothly
- Underlines appear/disappear as text changes
- Popup interactions are intuitive
- Manual check button provides immediate feedback
- Configuration is straightforward
- Performance remains acceptable with 3 users
