# ep_languagetool

LanguageTool grammar and style checking plugin for Etherpad.

## Description

`ep_languagetool` integrates [LanguageTool](https://github.com/languagetool-org/languagetool) grammar and style checking capabilities into Etherpad, providing real-time grammar checking similar to spell-check functionality.

## Features

- ✅ Real-time grammar checking with debouncing
- ✅ Manual check button in toolbar
- ✅ Blue underlines for detected errors (coming in Phase 4)
- ✅ Accept/reject suggestions popup (coming in Phase 4)
- ✅ Configurable LanguageTool API URL
- ✅ Multi-language support
- ✅ Full pad content checking

## Installation

### Via npm (when published)

```bash
npm install ep_languagetool
```

### Manual Installation

1. Clone or download this repository
2. Copy the `ep_languagetool` directory to your Etherpad `node_modules` folder
3. Restart Etherpad

## Configuration

Add the following to your Etherpad `settings.json`:

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

### Configuration Options

- **apiUrl** (string, default: `"http://localhost:8010/v2/check"`): LanguageTool API endpoint URL
- **defaultLanguage** (string, default: `"en"`): Language code for checking. Must be set in `settings.json`. Supported codes: `en` (English), `de` (German), `fr` (French), `es` (Spanish), etc. See [LanguageTool supported languages](https://languagetool.org/languages/)
- **autoCheck** (boolean, default: `true`): Enable/disable real-time checking
- **debounceDelay** (number, default: `2000`): Milliseconds to wait after typing stops before checking

**Note:** Language auto-detection is not implemented. The language must be explicitly configured in `settings.json`. The default language is English (`en`).

## LanguageTool Setup

### Option 1: Local Docker (Recommended)

Run LanguageTool in a Docker container:

```bash
docker run -d -p 8010:8010 erikvl87/languagetool
```

### Option 2: Self-Hosted

Install and run LanguageTool server locally. See [LanguageTool documentation](https://github.com/languagetool-org/languagetool) for details.

### Option 3: Public API

Use the public LanguageTool API (has rate limits):

```json
{
  "ep_languagetool": {
    "apiUrl": "https://api.languagetool.org/v2/check"
  }
}
```

## Usage

1. **Automatic Checking**: When `autoCheck` is enabled, the plugin automatically checks your text 2 seconds after you stop typing.

2. **Manual Checking**: Click the "Check Grammar" button in the toolbar to trigger an immediate check.

3. **Viewing Errors**: Errors will be highlighted with blue underlines (Phase 4).

4. **Accepting Suggestions**: Click on underlined text to see suggestions and accept/reject them (Phase 4).

## Development Status

### Phase 1: Foundation & Setup ✅
- Plugin structure
- Configuration system
- Server-side foundation
- Client-side foundation

### Phase 2: Core LanguageTool Integration ✅
- Enhanced API client with error handling
- Improved server-side endpoint
- Better text extraction
- Error handling and validation

### Phase 3: Real-Time Checking ✅
- Debouncing system
- Change detection
- Concurrent check prevention

### Phase 4: UI - Underlines & Highlighting ✅
- CSS styling
- DOM manipulation
- Attribute system

### Phase 5: UI - Popup & Interactions ✅
- Popup component
- Event handlers
- Text replacement

### Phase 6: Toolbar Button ✅
- Button registration
- Button functionality
- State management

### Phase 7: Language Support ✅
- Language configuration
- Default language (English)
- Settings-based selection

### Phase 8: Polish & Testing ✅
- Error handling improvements
- Performance optimization (caching)
- Testing documentation
- Final documentation

### Phase 9: NPM Deployment (Ready)
- Package preparation complete
- Ready for publishing to npm

## API

### Server Endpoint

`POST /ep_languagetool/check`

Request body:
```json
{
  "text": "Text to check",
  "language": "en",
  "padId": "optional-pad-id"
}
```

Response:
```json
{
  "matches": [
    {
      "message": "Error message",
      "shortMessage": "Short msg",
      "replacements": [...],
      "offset": 0,
      "length": 5,
      "context": {...},
      "rule": {...}
    }
  ],
  "language": {...},
  "software": {...}
}
```

## Troubleshooting

### LanguageTool server not available

- Check that LanguageTool is running: `curl http://localhost:8010/v2/check`
- Verify the `apiUrl` in your settings.json
- Check firewall/network settings

### No errors detected

- Ensure text is being sent correctly (check browser console)
- Verify LanguageTool API is responding
- Check language setting matches your text language

### Performance issues

- Increase `debounceDelay` to reduce API calls
- Consider using a local LanguageTool instance
- Check network latency

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

## License

Apache-2.0

## Author

Dom Capparelli

## Links

- [Etherpad Documentation](https://etherpad.org/doc/v1.5.1/#index_plugins)
- [LanguageTool](https://github.com/languagetool-org/languagetool)
- [Reference Implementation](https://github.com/Capp3/cothrom)
