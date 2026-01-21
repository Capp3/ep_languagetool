# Technical Context

## Etherpad Plugin Architecture

### Plugin Structure
- Plugins are named with `ep_` prefix (e.g., `ep_languagetool`)
- Core files:
  - `ep.json`: Defines plugin parts, hooks (server/client), dependencies
  - `package.json`: NPM metadata, dependencies
  - `static/`: Client-side JavaScript, CSS
  - `templates/`: EJS templates for HTML modifications
  - `locales/`: Translation files

### Key Hooks for LanguageTool Integration

#### Server-Side Hooks
- `expressCreateServer`: Mount custom HTTP routes for LanguageTool API calls
- `padUpdate`: Detect changes in pad content
- `loadSettings`: Read plugin configuration (LanguageTool server URL, API keys)
- `clientVars`: Pass settings from server to client
- `padInitToolbar`: Add toolbar buttons

#### Client-Side Hooks
- `acePopulateDOMLine`: Process DOM lines for highlighting errors
- `aceAttribsClasses`: Translate attributes to CSS classes for styling
- `acePostWriteDomLineHTML`: Post-render DOM manipulation
- `aceKeyEvent`: Capture keyboard events for triggering checks
- `aceEditEvent`: Detect editor changes
- `collectContentLineText`: Manipulate text before sending to server
- `postAceInit`: Initialize after editor loads

### Editor API (`editorInfo`)
- `ace_getRep()`: Get editor representation
- `ace_replaceRange(start, end, text)`: Replace text in editor
- `ace_getAttributeOnSelection(attribute)`: Get attributes
- `ace_setAttributeOnSelection(attribute, value)`: Set attributes
- `ace_applyPreparedChangesetToBase()`: Apply changes

## LanguageTool API

### API Options
1. **Public API**: https://api.languagetool.org
   - Rate limits apply
   - Character limits (~60,000 chars per request)
   - Free tier available

2. **Self-Hosted**: Run LanguageTool server locally
   - Full control
   - No rate limits
   - Privacy benefits
   - Requires server setup

### API Endpoints
- `POST /v2/check`: Main checking endpoint
  - Parameters: `text`, `language`, `disabledRules`, `enabledRules`, `disabledCategories`, `enabledCategories`
  - Returns: Normalized response with matches array, language info, software info

### Response Structure
```json
{
  "matches": [
    {
      "message": "Error message",
      "shortMessage": "Short msg",
      "replacements": [
        {
          "value": "corrected text",
          "confidence": 0.95
        }
      ],
      "offset": 0,
      "length": 5,
      "context": {
        "text": "context around error",
        "offset": 0,
        "length": 20
      },
      "rule": {
        "id": "rule-id",
        "description": "Rule description",
        "category": {
          "id": "category-id",
          "name": "Category name"
        }
      }
    }
  ],
  "language": {
    "detectedLanguage": {
      "code": "en",
      "name": "English",
      "confidence": 0.95
    }
  },
  "software": {
    "name": "LanguageTool",
    "version": "6.0",
    "buildDate": "2024-01-01"
  }
}
```

### Plugin API Endpoint
- `POST /ep_languagetool/check`: Plugin endpoint for client requests
  - Parameters: `text` (string, required), `language` (string, optional), `padId` (string, optional)
  - Returns: Normalized LanguageTool response
  - Error codes: `MISSING_INPUT`, `INVALID_TEXT`, `PAD_NOT_FOUND`, `PAD_ERROR`, `TIMEOUT`, `SERVICE_UNAVAILABLE`, `RATE_LIMIT`, `BAD_REQUEST`, `UNKNOWN_ERROR`

## Performance Considerations
- **Debouncing**: Avoid checking on every keystroke (2 second default delay)
- **Change Detection**: Hash-based text comparison to skip unchanged content
- **Revision Tracking**: Track pad revisions to detect changes
- **Concurrent Check Prevention**: Prevent multiple simultaneous API calls
- **Caching**: Track checked text hash to avoid duplicate API calls
- **Full Pad Checking**: Check entire pad content (acceptable for 10-20 page pads)
- **Rate Limiting**: Handle API limits gracefully
- **Text Length Limits**: Truncate at 60k characters (LanguageTool limit)

## Integration Patterns

### Selected Pattern: Real-Time with Manual Override
- **Primary**: Real-time checking with debouncing (2-3 seconds after typing stops)
- **Fallback**: Manual "Check Grammar" button for immediate checking
- **Scope**: Full pad content on each check
- **Display**: Blue underlines with popup for accept/reject

### Implementation Flow
1. User types in pad
2. Debounce timer starts (2-3 seconds)
3. After typing stops, send full pad text to server
4. Server calls LanguageTool API (configurable URL)
5. Return matches to client
6. Display blue underlines for errors
7. On click/hover, show popup with suggestions
8. User can accept/reject suggestions
9. Manual button triggers immediate check (bypasses debounce)

## Error Handling

### API Client Error Handling
- **Connection Errors**: ECONNREFUSED, ENOTFOUND → User-friendly error messages
- **HTTP Status Codes**:
  - 400 (Bad Request) → Invalid input
  - 413 (Payload Too Large) → Text exceeds size limit
  - 429 (Rate Limit) → Rate limit exceeded
  - 500+ (Server Error) → LanguageTool server issues
- **Timeouts**: Configurable timeout (default 30s) with clear error messages
- **Response Parsing**: Handles malformed JSON responses gracefully

### Server-Side Error Handling
- **Input Validation**: Validates text and padId parameters
- **Pad Text Extraction**: Fallback to padId if text not provided
- **Error Codes**: Structured error responses with codes for client handling
- **Logging**: Comprehensive error logging for debugging

### Client-Side Error Handling
- **Network Errors**: Handles fetch failures with user-friendly messages
- **Response Validation**: Validates response structure before processing
- **Error Codes**: Maps server error codes to user-friendly messages
- **Empty Text Handling**: Skips checking empty pads

### Error Recovery
- LanguageTool server unavailable → Show indicator, allow retry
- API rate limit reached → Show notification, suggest waiting
- Network errors → Log error, allow manual retry
- Large pads → Text truncation (60k char limit), show warning if truncated
